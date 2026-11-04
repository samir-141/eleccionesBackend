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

@Injectable()
export class PuestosService {
  // In-memory cache de tokens de voto efímeros asignados al puesto (Invariante I10)
  private tokensVotoPorPuesto = new Map<string, string>();

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
   * ADR-005: El QR expira en minutos y se consume en un solo uso.
   */
  async solicitarEmparejamiento(aulaId: string, numeroPuesto: number) {
    const aula = await this.prisma.aula.findUnique({ where: { id: aulaId } });
    if (!aula) {
      throw new NotFoundException(`Aula con ID ${aulaId} no encontrada`);
    }

    // Buscar o registrar el puesto en la base de datos
    let puesto = await this.prisma.puesto.findFirst({
      where: { aula_id: aulaId, numero_puesto: numeroPuesto },
    });

    if (!puesto) {
      puesto = await this.prisma.puesto.create({
        data: {
          aula_id: aulaId,
          numero_puesto: numeroPuesto,
          estado: 'FUERA_SERVICIO',
        },
      });
    }

    // Generar token efímero seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos de vigencia

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

    const qrRecord = await this.prisma.qrEmparejamiento.findUnique({
      where: { token: tokenQr },
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

    const limiteInactividad = new Date(Date.now() - 30 * 1000); // 30 segundos

    await this.prisma.puesto.updateMany({
      where: {
        aula_id: resolvedAulaId,
        estado: { not: 'FUERA_SERVICIO' },
        OR: [
          { ultimo_heartbeat: null },
          { ultimo_heartbeat: { lt: limiteInactividad } },
        ],
      },
      data: {
        estado: 'FUERA_SERVICIO',
      },
    });

    return this.prisma.puesto.findMany({
      where: { aula_id: resolvedAulaId },
      orderBy: { numero_puesto: 'asc' },
    });
  }

  /**
   * Kiosco: Consulta periódica para verificar si el docente ya escaneó/aprobó el código QR.
   */
  async verificarEstadoQr(tokenQr: string) {
    const qrRecord = await this.prisma.qrEmparejamiento.findUnique({
      where: { token: tokenQr },
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

    // Actualizar heartbeat en tiempo real
    const nuevoEstado = puesto.estado === 'FUERA_SERVICIO' ? 'LIBRE' : puesto.estado;
    await this.prisma.puesto.update({
      where: { id: puestoId },
      data: {
        ultimo_heartbeat: new Date(),
        estado: nuevoEstado,
      },
    });

    const token_voto = this.tokensVotoPorPuesto.get(puestoId);

    return {
      ok: true,
      puesto_id: puesto.id,
      numero_puesto: puesto.numero_puesto,
      aula_nombre: puesto.aula.nombre,
      estado: nuevoEstado,
      token_voto: nuevoEstado === 'RESERVADO' ? token_voto : null,
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
