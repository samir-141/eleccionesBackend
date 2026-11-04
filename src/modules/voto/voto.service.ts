import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PartidosService } from '../partidos/partidos.service';
import { PuestosService } from '../puestos/puestos.service';
import { EmitirVotoDto } from './dto/voto.dto';
import * as crypto from 'crypto';

@Injectable()
export class VotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly partidosService: PartidosService,
    private readonly puestosService: PuestosService,
  ) {}

  /**
   * Entrega la cédula digital para la sesión de votación activa.
   * Valida el token efímero de voto (I10) y baraja las opciones (I18).
   */
  async obtenerCedula(tokenVoto: string) {
    const tokenHash = crypto.createHash('sha256').update(tokenVoto).digest('hex');

    const habilitacion = await this.prisma.habilitacion.findFirst({
      where: { token_voto_hash: tokenHash },
      include: { eleccion: true },
    });

    if (!habilitacion) {
      throw new UnauthorizedException('Token de votación no válido o ya consumido.');
    }

    if (habilitacion.expires_at < new Date()) {
      throw new UnauthorizedException('El tiempo de reserva de este puesto ha expirado.');
    }

    if (habilitacion.eleccion.estado !== 'ABIERTA') {
      throw new BadRequestException('El proceso electoral no se encuentra en estado ABIERTA.');
    }

    // Invariante I18: Opciones barajadas con voto en blanco de idéntica presentación
    return this.partidosService.obtenerParaCedula(habilitacion.eleccion_id);
  }

  /**
   * INVARIANTE I4: Transacción atómica indivisible de depósito en la urna.
   * 1. Valida habilitación con bloqueo FOR UPDATE.
   * 2. Inserta en urna (SOLO 4 columnas: id, eleccion_id, voto_payload, schema_version - I1, I2).
   * 3. Marca al elector con estado 'VOTO' (SIN marcas temporales - I3).
   * 4. Libera el puesto ('LIBRE').
   * 5. Destruye físicamente el registro de habilitación (I5).
   * 6. Sanitización total de auditoría y logs (I9).
   */
  async emitirVoto(dto: EmitirVotoDto) {
    if (!dto.es_blanco && !dto.partido_id) {
      throw new BadRequestException('Debe seleccionar una lista electoral o marcar voto en blanco.');
    }

    const tokenHash = crypto.createHash('sha256').update(dto.token_voto).digest('hex');

    return this.prisma.$transaction(async (tx) => {
      // 1. Bloqueo de fila para evitar condiciones de carrera o doble consumo
      const habs = await tx.$queryRaw<
        Array<{
          id: string;
          eleccion_id: string;
          elector_id: string;
          puesto_id: string;
          expires_at: Date;
        }>
      >`
        SELECT id, eleccion_id, elector_id, puesto_id, expires_at 
        FROM habilitacion 
        WHERE token_voto_hash = ${tokenHash}
        FOR UPDATE;
      `;

      if (!habs || habs.length === 0) {
        throw new UnauthorizedException('Token de votación no válido o ya consumido.');
      }

      const hab = habs[0];

      if (new Date(hab.expires_at) < new Date()) {
        throw new BadRequestException('El tiempo asignado para emitir su voto ha vencido.');
      }

      // 2. Verificar estado de la elección
      const eleccion = await tx.eleccion.findUnique({
        where: { id: hab.eleccion_id },
      });

      if (!eleccion || eleccion.estado !== 'ABIERTA') {
        throw new BadRequestException('La recepción de votos solo opera cuando la elección está ABIERTA.');
      }

      // 3. Estructurar payload del voto (cero metadatos de identidad)
      const votoPayload = dto.es_blanco
        ? { tipo: 'BLANCO' }
        : { tipo: 'LISTA', partido_id: dto.partido_id };

      // 4. INVARIANTE I1 e I2: Inserción en URNA (Exactamente 4 columnas)
      await tx.$executeRaw`
        INSERT INTO urna (id, eleccion_id, voto_payload, schema_version)
        VALUES (gen_random_uuid(), ${hab.eleccion_id}::uuid, ${JSON.stringify(votoPayload)}::jsonb, 1);
      `;

      // 5. INVARIANTE I3: Actualizar elector a VOTO sin timestamps
      await tx.$executeRaw`
        UPDATE elector 
        SET estado = 'VOTO'
        WHERE id = ${hab.elector_id}::uuid;
      `;

      // 6. Liberar Puesto de votación
      await tx.$executeRaw`
        UPDATE puesto 
        SET estado = 'LIBRE'
        WHERE id = ${hab.puesto_id}::uuid;
      `;

      // 7. INVARIANTE I5: Eliminación física de la habilitación transitoria
      await tx.$executeRaw`
        DELETE FROM habilitacion 
        WHERE id = ${hab.id}::uuid;
      `;

      this.puestosService.limpiarTokenVotoPuesto(hab.puesto_id);

      // 8. INVARIANTE I9: Auditoría genérica (prohibido vincular elector, puesto o contenido del voto)
      await this.auditoria.registrar({
        eleccion_id: hab.eleccion_id,
        actor_tipo: 'SISTEMA',
        actor_id: 'urna',
        accion: 'VOTO_EMITIDO',
        entidad: 'urna',
        ip: '127.0.0.1',
      });

      return {
        status: 'EXITO',
        mensaje: 'Su voto ha sido depositado en la urna con total anonimato.',
      };
    });
  }
}

