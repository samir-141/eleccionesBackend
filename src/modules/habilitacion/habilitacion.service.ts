import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PuestosService } from '../puestos/puestos.service';
import { ConsultarDniDto } from './dto/habilitacion.dto';
import * as crypto from 'crypto';

@Injectable()
export class HabilitacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly puestosService: PuestosService,
  ) {}

  private async resolverAulaId(aulaId: string): Promise<string> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (aulaId && UUID_REGEX.test(aulaId)) {
      return aulaId;
    }
    const defaultAula = await this.prisma.aula.findFirst({ orderBy: { numero: 'asc' } });
    return defaultAula?.id || aulaId;
  }

  private sanitizarUuid(id?: string | null): string | null {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return id && UUID_REGEX.test(id) ? id : null;
  }

  /**
   * Paso 1: El docente consulta el DNI del alumno (leído por cámara o manual).
   * Valida aula correcta, estado pendiente y registra incidentes si hay anomalías.
   */
  async consultarDni(
    rawDocenteAulaId: string,
    docenteId: string,
    dto: ConsultarDniDto,
    ip = '127.0.0.1',
  ) {
    const docenteAulaId = await this.resolverAulaId(rawDocenteAulaId);
    const validDocenteId = this.sanitizarUuid(docenteId);

    // 0. Limpiar cualquier reserva que haya expirado
    await this.limpiarHabilitacionesExpiradas();

    const aula = await this.prisma.aula.findUnique({
      where: { id: docenteAulaId },
      include: { eleccion: true },
    });

    if (!aula) {
      throw new NotFoundException('Aula de docente no encontrada.');
    }

    if (aula.eleccion.estado !== 'ABIERTA') {
      throw new BadRequestException(
        `La elección se encuentra en estado ${aula.eleccion.estado}. La votación solo opera en estado ABIERTA.`,
      );
    }

    // 1. Buscar elector por DNI dentro de esta elección
    const elector = await this.prisma.elector.findFirst({
      where: {
        eleccion_id: aula.eleccion_id,
        dni: dto.dni.trim(),
      },
      include: {
        aula: true,
        habilitacion: { include: { puesto: true } },
      },
    });

    if (!elector) {
      throw new NotFoundException(`El DNI ${dto.dni} no figura en el padrón electoral de esta institución.`);
    }

    // 2. INVARIANTE I13: Verificar que el elector pertenezca al aula del docente
    if (elector.aula_id !== docenteAulaId) {
      // Registrar incidente de elector en aula equivocada
      await this.prisma.incidente.create({
        data: {
          eleccion_id: aula.eleccion_id,
          aula_id: docenteAulaId,
          docente_id: validDocenteId,
          tipo: 'DNI_OTRA_AULA',
          descripcion: `Intento de acceso: El estudiante ${elector.apellidos}, ${elector.nombres} (DNI ${elector.dni}) pertenece al ${elector.aula.nombre}, pero se presentó en el ${aula.nombre}.`,
        },
      });

      throw new BadRequestException(
        `El estudiante pertenece al ${elector.aula.nombre}. Debe dirigirse a su aula asignada para votar.`,
      );
    }

    // 3. Verificar estado del elector
    if (elector.estado === 'VOTO') {
      // Registrar incidente crítico de intento de doble voto
      await this.prisma.incidente.create({
        data: {
          eleccion_id: aula.eleccion_id,
          aula_id: docenteAulaId,
          docente_id: validDocenteId,
          tipo: 'INTENTO_DOBLE_VOTO',
          descripcion: `ALERTA DE SEGURIDAD: El estudiante ${elector.apellidos}, ${elector.nombres} (DNI ${elector.dni}) ya emitió su voto previamente e intentó habilitarse nuevamente.`,
        },
      });

      throw new ConflictException(
        'El estudiante ya emitió su voto. Por integridad electoral, no es posible votar dos veces.',
      );
    }

    if (elector.estado === 'HABILITADO' && elector.habilitacion) {
      if (elector.habilitacion.expires_at > new Date()) {
        throw new ConflictException(
          `El estudiante ya tiene un puesto asignado (Puesto #${elector.habilitacion.puesto.numero_puesto}). Si se retiró, cancele la reserva anterior.`,
        );
      }
    }

    // Registrar consulta en auditoría indicando si fue por cámara o manual
    await this.auditoria.registrar({
      eleccion_id: aula.eleccion_id,
      actor_tipo: 'DOCENTE',
      actor_id: docenteId,
      accion: dto.origen_lectura === 'MANUAL' ? 'CONSULTAR_DNI_MANUAL' : 'CONSULTAR_DNI_CAMARA',
      entidad: 'elector',
      entidad_id: elector.id,
      ip,
    });

    return {
      elector_id: elector.id,
      dni: elector.dni,
      nombres: elector.nombres,
      apellidos: elector.apellidos,
      grado_seccion: elector.grado_seccion,
      aula_nombre: aula.nombre,
    };
  }

  /**
   * Paso 2: El docente confirma la coincidencia física de la tarjeta.
   * Ejecuta RESERVA ATÓMICA CON ROW LOCK (`SELECT ... FOR UPDATE SKIP LOCKED` - ADR-006).
   */
  async confirmarHabilitacion(
    rawDocenteAulaId: string,
    docenteId: string,
    electorId: string,
    puestoIdDeseado?: string,
    ip = '127.0.0.1',
  ) {
    const docenteAulaId = await this.resolverAulaId(rawDocenteAulaId);

    // 0. Limpiar expiraciones previas
    await this.limpiarHabilitacionesExpiradas();

    return this.prisma.$transaction(async (tx) => {
      // 1. Bloqueo de fila para encontrar 1 puesto libre en el aula (ADR-006)
      let puestosLibres: Array<{ id: string; numero_puesto: number }>;
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (puestoIdDeseado && UUID_REGEX.test(puestoIdDeseado)) {
        puestosLibres = await tx.$queryRaw<Array<{ id: string; numero_puesto: number }>>`
          SELECT id, numero_puesto 
          FROM puesto 
          WHERE id = ${puestoIdDeseado}::uuid AND aula_id = ${docenteAulaId}::uuid AND estado = 'LIBRE'
          LIMIT 1
          FOR UPDATE SKIP LOCKED;
        `;
      } else {
        puestosLibres = await tx.$queryRaw<Array<{ id: string; numero_puesto: number }>>`
          SELECT id, numero_puesto 
          FROM puesto 
          WHERE aula_id = ${docenteAulaId}::uuid AND estado = 'LIBRE'
          ORDER BY numero_puesto ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED;
        `;
      }

      if (!puestosLibres || puestosLibres.length === 0) {
        const totalPuestosAula = await tx.puesto.count({ where: { aula_id: docenteAulaId } });
        if (totalPuestosAula === 0) {
          throw new ConflictException(
            'No hay máquinas de votación vinculadas a esta aula. Primero vincule una máquina escaneando su código QR.',
          );
        }
        throw new ConflictException(
          'Todos los puestos de votación de esta aula están ocupados o reservados en este momento. Por favor espere a que se libere un puesto.',
        );
      }

      const puestoAsignado = puestosLibres[0];

      // 2. Bloqueo de fila del elector para asegurar que sigue PENDIENTE
      const electores = await tx.$queryRaw<Array<{ id: string; estado: string; eleccion_id: string }>>`
        SELECT id, estado, eleccion_id
        FROM elector
        WHERE id = ${electorId}::uuid
        FOR UPDATE;
      `;

      if (!electores || electores.length === 0) {
        throw new NotFoundException('Elector no encontrado.');
      }

      const elector = electores[0];
      if (elector.estado !== 'PENDIENTE') {
        throw new ConflictException(
          `El elector ya no se encuentra en estado Pendiente (Estado actual: ${elector.estado}).`,
        );
      }

      // 3. Generar token criptográfico efímero de voto (Invariante I10)
      const token_voto = crypto.randomBytes(32).toString('hex');
      const token_voto_hash = crypto.createHash('sha256').update(token_voto).digest('hex');

      // 4. Calcular tiempo de expiración (por defecto 180 segundos / 3 min)
      const eleccion = await tx.eleccion.findUnique({ where: { id: elector.eleccion_id } });
      const reglas = (eleccion?.reglas as Record<string, any>) || {};
      const segundosReserva = reglas.duracion_reserva_segundos || 180;
      const expires_at = new Date(Date.now() + segundosReserva * 1000);

      // 5. Transición atómica: Puesto a RESERVADO
      await tx.$executeRaw`
        UPDATE puesto 
        SET estado = 'RESERVADO'
        WHERE id = ${puestoAsignado.id}::uuid;
      `;

      // 6. Transición atómica: Elector a HABILITADO (Invariante I3: Sin timestamps de voto)
      await tx.$executeRaw`
        UPDATE elector 
        SET estado = 'HABILITADO'
        WHERE id = ${elector.id}::uuid;
      `;

      // 7. Sanitizar cualquier elector previo en este puesto que pudiera haber quedado colgado
      const habsPrevias = await tx.habilitacion.findMany({
        where: {
          OR: [
            { puesto_id: puestoAsignado.id },
            { elector_id: elector.id },
          ],
        },
      });

      for (const hp of habsPrevias) {
        if (hp.elector_id !== elector.id) {
          await tx.elector.update({
            where: { id: hp.elector_id },
            data: { estado: 'PENDIENTE' },
          });
        }
      }

      await tx.habilitacion.deleteMany({
        where: {
          OR: [
            { puesto_id: puestoAsignado.id },
            { elector_id: elector.id },
          ],
        },
      });

      // 8. Insertar habilitación transitoria (Invariante I5)
      await tx.$executeRaw`
        INSERT INTO habilitacion (id, eleccion_id, elector_id, puesto_id, token_voto_hash, token_voto, expires_at)
        VALUES (gen_random_uuid(), ${elector.eleccion_id}::uuid, ${elector.id}::uuid, ${puestoAsignado.id}::uuid, ${token_voto_hash}, ${token_voto}, ${expires_at});
      `;

      // 9. Registro de auditoría
      await this.auditoria.registrar({
        eleccion_id: elector.eleccion_id,
        actor_tipo: 'DOCENTE',
        actor_id: docenteId,
        accion: 'CONFIRMAR_HABILITACION',
        entidad: 'puesto',
        entidad_id: puestoAsignado.id,
        datos_despues: {
          numero_puesto: puestoAsignado.numero_puesto,
          duracion_segundos: segundosReserva,
        },
        ip,
      });

      // Asignar el token efímero al puesto en memoria (Invariante I10)
      this.puestosService.setTokenVotoPuesto(puestoAsignado.id, token_voto);

      return {
        status: 'HABILITADO',
        puesto_id: puestoAsignado.id,
        puesto_numero: puestoAsignado.numero_puesto,
        mensaje: `Dirija al elector al Puesto ${puestoAsignado.numero_puesto}`,
        tiempo_reserva_segundos: segundosReserva,
        token_voto, // Enviado al puesto para que presente la cédula
      };
    });
  }

  /**
   * Cancelación manual por el docente (si el estudiante se retiró o hubo error).
   */
  async cancelarHabilitacion(
    rawDocenteAulaId: string,
    docenteId: string,
    electorId: string,
    motivo: string,
    ip = '127.0.0.1',
  ) {
    const docenteAulaId = await this.resolverAulaId(rawDocenteAulaId);

    const habilitacion = await this.prisma.habilitacion.findFirst({
      where: { elector_id: electorId },
      include: { puesto: true, eleccion: true },
    });

    if (!habilitacion) {
      // Si la habilitación ya no existe (por ejemplo expiró o ya votó), restablecer al elector si aún estaba en HABILITADO
      await this.prisma.elector.updateMany({
        where: { id: electorId, estado: 'HABILITADO' },
        data: { estado: 'PENDIENTE' },
      });
      return {
        mensaje: 'La reserva ya no se encontraba activa o ya fue procesada.',
        puesto_liberado: 0,
      };
    }

    if (habilitacion.puesto.aula_id !== docenteAulaId) {
      throw new BadRequestException('No puedes cancelar una habilitación de otra aula.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Liberar el puesto
      await tx.puesto.update({
        where: { id: habilitacion.puesto_id },
        data: { estado: 'LIBRE' },
      });

      this.puestosService.limpiarTokenVotoPuesto(habilitacion.puesto_id);

      // 2. Revertir el elector a PENDIENTE
      await tx.elector.update({
        where: { id: habilitacion.elector_id },
        data: { estado: 'PENDIENTE' },
      });

      // 3. Borrar físicamente la habilitación sin fallar si ya no existe (Invariante I5)
      await tx.habilitacion.deleteMany({
        where: { id: habilitacion.id },
      });

      // 4. Registrar incidente y auditoría
      await tx.incidente.create({
        data: {
          eleccion_id: habilitacion.eleccion_id,
          aula_id: docenteAulaId,
          docente_id: this.sanitizarUuid(docenteId),
          tipo: 'RESERVA_CANCELADA',
          descripcion: `Cancelación manual de reserva de Puesto #${habilitacion.puesto.numero_puesto}. Motivo: ${motivo}`,
        },
      });

      await this.auditoria.registrar({
        eleccion_id: habilitacion.eleccion_id,
        actor_tipo: 'DOCENTE',
        actor_id: docenteId,
        accion: 'CANCELAR_HABILITACION',
        entidad: 'habilitacion',
        entidad_id: habilitacion.id,
        datos_despues: { motivo },
        ip,
      });

      return {
        mensaje: 'Habilitación cancelada y puesto liberado correctamente.',
        puesto_liberado: habilitacion.puesto.numero_puesto,
      };
    });
  }

  /**
   * Limpieza automática de reservas vencidas (Invariante I5).
   * Devuelve el elector a PENDIENTE, el puesto a LIBRE y elimina la fila.
   */
  async limpiarHabilitacionesExpiradas() {
    const ahora = new Date();
    const expiradas = await this.prisma.habilitacion.findMany({
      where: { expires_at: { lt: ahora } },
      include: { puesto: true },
    });

    for (const h of expiradas) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.puesto.update({
            where: { id: h.puesto_id },
            data: { estado: 'LIBRE' },
          });

          this.puestosService.limpiarTokenVotoPuesto(h.puesto_id);

          await tx.elector.update({
            where: { id: h.elector_id },
            data: { estado: 'PENDIENTE' },
          });

          await tx.habilitacion.deleteMany({
            where: { id: h.id },
          });

          await tx.incidente.create({
            data: {
              eleccion_id: h.eleccion_id,
              aula_id: h.puesto.aula_id,
              tipo: 'RESERVA_EXPIRADA',
              descripcion: `Reserva del Puesto #${h.puesto.numero_puesto} expiró por inactividad. El elector regresó a Pendiente.`,
            },
          });
        });
      } catch {
        // Continuar limpiando las siguientes si una ya fue procesada
      }
    }

    // Auto-sanitización de estados huérfanos:
    // 1. Devolver a PENDIENTE cualquier elector en estado HABILITADO que ya no tenga fila en habilitacion
    try {
      await this.prisma.$executeRaw`
        UPDATE elector
        SET estado = 'PENDIENTE'
        WHERE estado = 'HABILITADO'
          AND id NOT IN (SELECT elector_id FROM habilitacion);
      `;
    } catch {}

    // 2. Devolver a LIBRE cualquier puesto en estado RESERVADO que ya no tenga fila en habilitacion
    try {
      await this.prisma.$executeRaw`
        UPDATE puesto
        SET estado = 'LIBRE'
        WHERE estado = 'RESERVADO'
          AND id NOT IN (SELECT puesto_id FROM habilitacion);
      `;
    } catch {}
  }
}

