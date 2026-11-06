import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

interface MaquinaPendiente {
  token: string;
  codigoCorto: string;
  expires_at: Date;
  usado: boolean;
  puesto_id?: string;
  aula_id?: string;
  aula_nombre?: string;
  numero_puesto?: number;
  token_sesion?: string;
}

@Injectable()
export class PuestosService {
  // In-memory cache de tokens de voto efímeros asignados al puesto (Invariante I10)
  private tokensVotoPorPuesto = new Map<string, string>();
  // Registro en memoria de máquinas esperando ser escaneadas y asignadas a una mesa
  private maquinasPendientes = new Map<string, MaquinaPendiente>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  setTokenVotoPuesto(puestoId: string, tokenVoto: string) {
    this.tokensVotoPorPuesto.set(puestoId, tokenVoto);
  }

  limpiarTokenVotoPuesto(puestoId: string) {
    this.tokensVotoPorPuesto.delete(puestoId);
  }

  obtenerTokenVotoPuesto(puestoId: string): string | undefined {
    return this.tokensVotoPorPuesto.get(puestoId);
  }

  /**
   * Puesto (Laptop/Tablet): Solicita un QR de emparejamiento efímero.
   * Sin datos predeterminados: Toma lugar en la mesa recién cuando se escanea el código.
   */
  async solicitarEmparejamiento(aulaId?: string, numeroPuesto?: number) {
    if (!aulaId) {
      // Flujo dinámico: La máquina no tiene aula ni puesto predeterminado.
      // Toma lugar recién cuando el docente o administrador escanea su código.
      const token = crypto.randomBytes(24).toString('hex');
      const codigoCorto = 'MQ-' + token.substring(0, 4).toUpperCase();
      const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      const maquina: MaquinaPendiente = {
        token,
        codigoCorto,
        expires_at,
        usado: false,
      };

      this.maquinasPendientes.set(token, maquina);
      this.maquinasPendientes.set(codigoCorto, maquina);

      const qr_data_url = await QRCode.toDataURL(token, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 480,
      });

      return {
        puesto_id: '',
        numero_puesto: 0,
        aula: 'Sin Asignar (Esperando Escaneo)',
        qr_token: token,
        codigo_corto: codigoCorto,
        qr_data_url,
        expires_at,
      };
    }

    const aula = await this.prisma.aula.findUnique({ where: { id: aulaId } });
    if (!aula) {
      throw new NotFoundException(`Aula con ID ${aulaId} no encontrada`);
    }

    // Buscar o registrar el puesto en la base de datos
    let puesto = await this.prisma.puesto.findFirst({
      where: { aula_id: aulaId, numero_puesto: numeroPuesto || 1 },
    });

    if (!puesto) {
      puesto = await this.prisma.puesto.create({
        data: {
          aula_id: aulaId,
          numero_puesto: numeroPuesto || 1,
          estado: 'FUERA_SERVICIO',
        },
      });
    }

    // Generar token efímero seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos de vigencia

    await this.prisma.qrEmparejamiento.create({
      data: {
        puesto_id: puesto.id,
        token,
        expires_at,
        usado: false,
      },
    });

    // Generar código QR de alta definición (480px, margen óptimo) para escaneo rápido en tiempo real
    const qr_data_url = await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 480,
    });

    return {
      puesto_id: puesto.id,
      numero_puesto: puesto.numero_puesto,
      aula: aula.nombre,
      qr_token: token,
      codigo_corto: 'MQ-' + token.substring(0, 4).toUpperCase(),
      qr_data_url,
      expires_at,
    };
  }

  /**
   * Docente: Escanea con su celular el QR del puesto para autorizarlo.
   * Invariante I13: Un docente NO puede tocar ni autorizar puestos de otras aulas.
   */
  async emparejarConQr(
    docenteAulaId: string,
    tokenQr: string,
    actorId = 'docente',
    ip = '127.0.0.1',
  ) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let resolvedAulaId = docenteAulaId;
    if (!resolvedAulaId || !UUID_REGEX.test(resolvedAulaId)) {
      const aulaFallback = await this.prisma.aula.findFirst({ orderBy: { numero: 'asc' } });
      if (aulaFallback) resolvedAulaId = aulaFallback.id;
    }

    const tokenLimpio = tokenQr.trim();

    // 1. Flujo Dinámico: La máquina no tenía mesa predeterminada y toma lugar recién al escanearse
    if (this.maquinasPendientes.has(tokenLimpio)) {
      const maquina = this.maquinasPendientes.get(tokenLimpio)!;
      if (maquina.usado) {
        throw new BadRequestException('Esta máquina ya fue autorizada y asignada a una mesa.');
      }
      if (maquina.expires_at < new Date()) {
        throw new BadRequestException('El código QR de la máquina ha expirado. Genere uno nuevo.');
      }

      const aula = await this.prisma.aula.findUnique({ where: { id: resolvedAulaId } });
      if (!aula) {
        throw new NotFoundException(`Aula con ID ${resolvedAulaId} no encontrada`);
      }

      const maxPuesto = await this.prisma.puesto.aggregate({
        where: { aula_id: resolvedAulaId },
        _max: { numero_puesto: true },
      });
      const siguienteNumero = (maxPuesto._max.numero_puesto || 0) + 1;

      const token_sesion = crypto.randomUUID();
      const nuevoPuesto = await this.prisma.puesto.create({
        data: {
          aula_id: resolvedAulaId,
          numero_puesto: siguienteNumero,
          estado: 'LIBRE',
          token_sesion,
          ultimo_heartbeat: new Date(),
        },
      });

      maquina.usado = true;
      maquina.puesto_id = nuevoPuesto.id;
      maquina.aula_id = aula.id;
      maquina.aula_nombre = aula.nombre;
      maquina.numero_puesto = nuevoPuesto.numero_puesto;
      maquina.token_sesion = token_sesion;

      await this.auditoria.registrar({
        eleccion_id: aula.eleccion_id,
        actor_tipo: 'DOCENTE',
        actor_id: actorId,
        accion: 'EMPAREJAR_MAQUINA_DINAMICA',
        entidad: 'puesto',
        entidad_id: nuevoPuesto.id,
        datos_despues: {
          aula: aula.nombre,
          numero_puesto: nuevoPuesto.numero_puesto,
          estado: 'LIBRE',
        },
        ip,
      });

      return {
        puesto_id: nuevoPuesto.id,
        numero_puesto: nuevoPuesto.numero_puesto,
        aula_id: aula.id,
        aula_nombre: aula.nombre,
        token_sesion,
        estado: nuevoPuesto.estado,
      };
    }

    // 2. Flujo persistente en base de datos (compatibilidad de tests existentes)
    const qrRecord = await this.prisma.qrEmparejamiento.findUnique({
      where: { token: tokenLimpio },
      include: { puesto: { include: { aula: true } } },
    });

    if (!qrRecord) {
      throw new NotFoundException('Código QR de emparejamiento no encontrado o inválido.');
    }

    if (qrRecord.usado) {
      throw new BadRequestException('Este código QR ya fue utilizado anteriormente.');
    }

    if (qrRecord.expires_at < new Date()) {
      throw new BadRequestException('El código QR de emparejamiento ha expirado. Genere uno nuevo.');
    }

    // INVARIANTE I13: Segregación estricta de aulas
    if (qrRecord.puesto.aula_id !== resolvedAulaId) {
      throw new ForbiddenException(
        `Violación de seguridad: El puesto pertenece al Aula "${qrRecord.puesto.aula.nombre}". Usted solo puede emparejar puestos de su propia aula.`,
      );
    }

    // Marcar QR como consumido (un solo uso)
    await this.prisma.qrEmparejamiento.update({
      where: { id: qrRecord.id },
      data: { usado: true },
    });

    // Limpiar cualquier habilitación previa o token huérfano en este puesto
    await this.prisma.habilitacion.deleteMany({
      where: { puesto_id: qrRecord.puesto_id },
    });
    this.limpiarTokenVotoPuesto(qrRecord.puesto_id);

    // Generar token de sesión para el puesto y activarlo como LIBRE
    const token_sesion = crypto.randomUUID();
    const puestoActualizado = await this.prisma.puesto.update({
      where: { id: qrRecord.puesto_id },
      data: {
        estado: 'LIBRE',
        token_sesion,
        ultimo_heartbeat: new Date(),
      },
    });

    await this.auditoria.registrar({
      eleccion_id: qrRecord.puesto.aula.eleccion_id,
      actor_tipo: 'DOCENTE',
      actor_id: actorId,
      accion: 'EMPAREJAR_PUESTO_QR',
      entidad: 'puesto',
      entidad_id: puestoActualizado.id,
      datos_despues: {
        numero_puesto: puestoActualizado.numero_puesto,
        aula: qrRecord.puesto.aula.nombre,
      },
      ip,
    });

    return {
      puesto_id: puestoActualizado.id,
      numero_puesto: puestoActualizado.numero_puesto,
      aula_id: puestoActualizado.aula_id,
      token_sesion,
      estado: puestoActualizado.estado,
    };
  }

  /**
   * Administrador: Autoriza y vincula cualquier máquina con código QR a un aula y puesto específico.
   */
  async emparejarPuestoAdmin(
    aulaId: string,
    tokenQr: string,
    numeroPuesto?: number,
    actorId = 'admin',
    ip = '127.0.0.1',
  ) {
    const aula = await this.prisma.aula.findUnique({ where: { id: aulaId } });
    if (!aula) {
      throw new NotFoundException(`Aula con ID ${aulaId} no encontrada`);
    }

    const tokenLimpio = tokenQr.trim();

    // 1. Si es del flujo dinámico (sin mesa predeterminada)
    if (this.maquinasPendientes.has(tokenLimpio)) {
      const maquina = this.maquinasPendientes.get(tokenLimpio)!;
      if (maquina.usado) {
        throw new BadRequestException('Esta máquina ya fue autorizada y asignada a una mesa.');
      }
      if (maquina.expires_at < new Date()) {
        throw new BadRequestException('El código de vinculación ha expirado. Genere uno nuevo.');
      }

      let numPuestoFinal = numeroPuesto;
      if (!numPuestoFinal) {
        const maxPuesto = await this.prisma.puesto.aggregate({
          where: { aula_id: aulaId },
          _max: { numero_puesto: true },
        });
        numPuestoFinal = (maxPuesto._max.numero_puesto || 0) + 1;
      }

      const token_sesion = crypto.randomUUID();
      const nuevoPuesto = await this.prisma.puesto.create({
        data: {
          aula_id: aulaId,
          numero_puesto: numPuestoFinal,
          estado: 'LIBRE',
          token_sesion,
          ultimo_heartbeat: new Date(),
        },
      });

      maquina.usado = true;
      maquina.puesto_id = nuevoPuesto.id;
      maquina.aula_id = aula.id;
      maquina.aula_nombre = aula.nombre;
      maquina.numero_puesto = nuevoPuesto.numero_puesto;
      maquina.token_sesion = token_sesion;

      await this.auditoria.registrar({
        eleccion_id: aula.eleccion_id,
        actor_tipo: 'ADMIN',
        actor_id: actorId,
        accion: 'AUTORIZAR_MAQUINA_ADMIN',
        entidad: 'puesto',
        entidad_id: nuevoPuesto.id,
        datos_despues: {
          aula: aula.nombre,
          numero_puesto: numPuestoFinal,
          estado: 'LIBRE',
        },
        ip,
      });

      return {
        puesto_id: nuevoPuesto.id,
        numero_puesto: nuevoPuesto.numero_puesto,
        aula_id: aula.id,
        aula_nombre: aula.nombre,
        token_sesion,
        estado: nuevoPuesto.estado,
      };
    }

    const qrRecord = await this.prisma.qrEmparejamiento.findUnique({
      where: { token: tokenLimpio },
      include: { puesto: { include: { aula: true } } },
    });

    if (!qrRecord) {
      throw new NotFoundException('Código de máquina o QR no encontrado.');
    }

    if (qrRecord.usado) {
      throw new BadRequestException('Esta máquina ya fue autorizada anteriormente.');
    }

    if (qrRecord.expires_at < new Date()) {
      throw new BadRequestException('El código de vinculación ha expirado. Genere uno nuevo en la máquina.');
    }

    let numPuestoFinal = numeroPuesto;
    if (!numPuestoFinal) {
      const maxPuesto = await this.prisma.puesto.aggregate({
        where: { aula_id: aulaId },
        _max: { numero_puesto: true },
      });
      numPuestoFinal = (maxPuesto._max.numero_puesto || 0) + 1;
    }

    // Limpiar habilitaciones previas
    await this.prisma.habilitacion.deleteMany({
      where: { puesto_id: qrRecord.puesto_id },
    });
    this.limpiarTokenVotoPuesto(qrRecord.puesto_id);

    // Marcar QR como usado
    await this.prisma.qrEmparejamiento.update({
      where: { id: qrRecord.id },
      data: { usado: true },
    });

    const token_sesion = crypto.randomUUID();
    const puestoActualizado = await this.prisma.puesto.update({
      where: { id: qrRecord.puesto_id },
      data: {
        aula_id: aulaId,
        numero_puesto: numPuestoFinal,
        estado: 'LIBRE',
        token_sesion,
        ultimo_heartbeat: new Date(),
      },
    });

    await this.auditoria.registrar({
      eleccion_id: aula.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'AUTORIZAR_MAQUINA_ADMIN',
      entidad: 'puesto',
      entidad_id: puestoActualizado.id,
      datos_despues: {
        aula: aula.nombre,
        numero_puesto: numPuestoFinal,
        estado: 'LIBRE',
      },
      ip,
    });

    return {
      puesto_id: puestoActualizado.id,
      numero_puesto: puestoActualizado.numero_puesto,
      aula_id: puestoActualizado.aula_id,
      aula_nombre: aula.nombre,
      token_sesion,
      estado: puestoActualizado.estado,
    };
  }

  /**
   * Administrador: Registra un nuevo puesto en un aula.
   */
  async agregarPuestoAula(aulaId: string, actorId = 'admin', ip = '127.0.0.1') {
    const aula = await this.prisma.aula.findUnique({ where: { id: aulaId } });
    if (!aula) {
      throw new NotFoundException(`Aula con ID ${aulaId} no encontrada`);
    }

    const maxPuesto = await this.prisma.puesto.aggregate({
      where: { aula_id: aulaId },
      _max: { numero_puesto: true },
    });
    const nuevoNumero = (maxPuesto._max.numero_puesto || 0) + 1;

    const puesto = await this.prisma.puesto.create({
      data: {
        aula_id: aulaId,
        numero_puesto: nuevoNumero,
        estado: 'LIBRE',
      },
    });

    await this.auditoria.registrar({
      eleccion_id: aula.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'AGREGAR_PUESTO_AULA',
      entidad: 'puesto',
      entidad_id: puesto.id,
      datos_despues: {
        aula: aula.nombre,
        numero_puesto: nuevoNumero,
      },
      ip,
    });

    return puesto;
  }

  /**
   * Puesto: Envía señal periódica "sigo vivo" (heartbeat).
   * Si el puesto estaba FUERA_SERVICIO y reconecta, vuelve a LIBRE.
   */
  async registrarHeartbeat(tokenSesion: string) {
    const puesto = await this.prisma.puesto.findFirst({
      where: { token_sesion: tokenSesion },
    });

    if (!puesto) {
      throw new UnauthorizedException('Token de sesión de puesto no reconocido.');
    }

    const nuevoEstado = puesto.estado === 'FUERA_SERVICIO' ? 'LIBRE' : puesto.estado;

    const actualizado = await this.prisma.puesto.update({
      where: { id: puesto.id },
      data: {
        ultimo_heartbeat: new Date(),
        estado: nuevoEstado,
      },
    });

    return {
      ok: true,
      puesto_id: actualizado.id,
      numero_puesto: actualizado.numero_puesto,
      estado: actualizado.estado,
    };
  }

  /**
   * Monitor de vida de puestos: Puestos sin heartbeat por > 30s pasan a FUERA_SERVICIO.
   * Puestos con reserva activa se mantienen en RESERVADO.
   */
  async verificarInactivosPorAula(aulaId: string) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let resolvedAulaId = aulaId;

    if (!resolvedAulaId || !UUID_REGEX.test(resolvedAulaId)) {
      // Si el cliente envía un id legacy como 'aula-1' o undefined, mapear al aula institucional 1
      const aulaDefault = await this.prisma.aula.findFirst({
        orderBy: { numero: 'asc' },
      });
      if (!aulaDefault) return [];
      resolvedAulaId = aulaDefault.id;
    }

    const ahora = new Date();
    const limiteInactividad = new Date(ahora.getTime() - 30 * 1000); // 30 segundos

    // 1. Puestos que no han dado heartbeat pasan a FUERA_SERVICIO siempre que no tengan reserva activa
    await this.prisma.$executeRaw`
      UPDATE puesto
      SET estado = 'FUERA_SERVICIO'
      WHERE aula_id = ${resolvedAulaId}::uuid
        AND (ultimo_heartbeat IS NULL OR ultimo_heartbeat < ${limiteInactividad})
        AND id NOT IN (SELECT puesto_id FROM habilitacion WHERE expires_at > ${ahora});
    `;

    // 2. Asegurar que puestos con reserva vigente se muestren como RESERVADO
    await this.prisma.$executeRaw`
      UPDATE puesto
      SET estado = 'RESERVADO'
      WHERE aula_id = ${resolvedAulaId}::uuid
        AND id IN (SELECT puesto_id FROM habilitacion WHERE expires_at > ${ahora});
    `;

    return this.prisma.puesto.findMany({
      where: { aula_id: resolvedAulaId },
      orderBy: { numero_puesto: 'asc' },
    });
  }

  /**
   * Kiosco: Consulta periódica para verificar si el docente ya escaneó/aprobó el código QR.
   */
  async verificarEstadoQr(tokenQr: string) {
    const tokenLimpio = tokenQr.trim();

    // 1. Verificar si está en memoria (flujo dinámico donde la máquina toma lugar al escanearse)
    if (this.maquinasPendientes.has(tokenLimpio)) {
      const maquina = this.maquinasPendientes.get(tokenLimpio)!;

      if (maquina.expires_at < new Date()) {
        return { status: 'EXPIRED', message: 'El código QR ha expirado. Genere uno nuevo.' };
      }

      if (!maquina.usado) {
        return {
          status: 'PENDING',
          message: 'Esperando escaneo y autorización del docente o administrador...',
          expires_at: maquina.expires_at,
        };
      }

      return {
        status: 'APPROVED',
        puesto_id: maquina.puesto_id,
        numero_puesto: maquina.numero_puesto,
        aula_id: maquina.aula_id,
        aula_nombre: maquina.aula_nombre,
        token_sesion: maquina.token_sesion,
        estado: 'LIBRE',
      };
    }

    const qrRecord = await this.prisma.qrEmparejamiento.findUnique({
      where: { token: tokenLimpio },
      include: {
        puesto: {
          include: {
            aula: true,
          },
        },
      },
    });

    if (!qrRecord) {
      return { status: 'INVALID', message: 'Código QR no reconocido o inexistente.' };
    }

    if (qrRecord.expires_at < new Date()) {
      return { status: 'EXPIRED', message: 'El código QR ha expirado. Genere uno nuevo.' };
    }

    if (!qrRecord.usado) {
      return {
        status: 'PENDING',
        message: 'Esperando validación del docente de aula...',
        expires_at: qrRecord.expires_at,
      };
    }

    // QR fue usado y el puesto ya está autorizado
    return {
      status: 'APPROVED',
      puesto_id: qrRecord.puesto.id,
      numero_puesto: qrRecord.puesto.numero_puesto,
      aula_id: qrRecord.puesto.aula_id,
      aula_nombre: qrRecord.puesto.aula.nombre,
      token_sesion: qrRecord.puesto.token_sesion,
      estado: qrRecord.puesto.estado,
    };
  }

  /**
   * Kiosco: Sincronización continua de estado y recepción de token de voto (Invariante I10).
   */
  async sincronizarPuesto(puestoId: string, tokenSesion: string) {
    const puesto = await this.prisma.puesto.findUnique({
      where: { id: puestoId },
      include: { aula: true },
    });

    if (!puesto) {
      throw new NotFoundException('Puesto no encontrado.');
    }

    if (puesto.token_sesion !== tokenSesion) {
      throw new UnauthorizedException('Token de sesión no válido para este puesto.');
    }

    const ahora = new Date();

    // Consultar si hay una habilitación activa no vencida para este puesto
    const habilitacion = await this.prisma.habilitacion.findFirst({
      where: {
        puesto_id: puestoId,
        expires_at: { gt: ahora },
      },
    });

    let nuevoEstado: 'LIBRE' | 'RESERVADO' | 'FUERA_SERVICIO';
    let token_voto: string | null = null;

    if (habilitacion) {
      nuevoEstado = 'RESERVADO';
      token_voto = habilitacion.token_voto || this.tokensVotoPorPuesto.get(puestoId) || null;
    } else {
      nuevoEstado = 'LIBRE';
      this.limpiarTokenVotoPuesto(puestoId);
    }

    // Actualizar heartbeat en tiempo real y asegurar el estado
    await this.prisma.puesto.update({
      where: { id: puestoId },
      data: {
        ultimo_heartbeat: ahora,
        estado: nuevoEstado,
      },
    });

    return {
      ok: true,
      puesto_id: puesto.id,
      numero_puesto: puesto.numero_puesto,
      aula_nombre: puesto.aula.nombre,
      estado: nuevoEstado,
      token_voto,
    };
  }

  /**
   * Kiosco: Desvinculación manual de la sesión del puesto.
   */
  async desvincularPuesto(puestoId: string, tokenSesion: string) {
    const puesto = await this.prisma.puesto.findUnique({ where: { id: puestoId } });
    if (!puesto || puesto.token_sesion !== tokenSesion) {
      return { ok: true };
    }

    this.limpiarTokenVotoPuesto(puestoId);

    await this.prisma.puesto.update({
      where: { id: puestoId },
      data: {
        token_sesion: null,
        estado: 'FUERA_SERVICIO',
      },
    });

    return { ok: true, mensaje: 'Puesto desvinculado correctamente.' };
  }
}
