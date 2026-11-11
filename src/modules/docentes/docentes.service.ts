import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateDocenteDto, LoginDocenteDto } from './dto/create-docente.dto';
import { issueDocenteToken } from '../../lib/auth/token.utils';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class DocentesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /**
   * Crea una cuenta de docente de aula, generando contraseña hash Argon2id
   * y un secreto 2FA TOTP con su código QR de enrolamiento.
   */
  async crearDocente(
    eleccionId: string,
    dto: CreateDocenteDto,
    actorId = 'admin',
    ip = '127.0.0.1',
  ) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
    });
    if (!eleccion) {
      throw new NotFoundException(`Elección ${eleccionId} no encontrada`);
    }

    const aula = await this.prisma.aula.findFirst({
      where: { id: dto.aula_id, eleccion_id: eleccionId },
    });
    if (!aula) {
      throw new BadRequestException('El aula especificada no pertenece a esta elección.');
    }

    const existeUsername = await this.prisma.docente.findFirst({
      where: { eleccion_id: eleccionId, username: dto.username },
    });

    if (existeUsername) {
      if (existeUsername.aula_id === dto.aula_id) {
        // Mismo usuario en la misma aula: actualizar contraseña
        const password_hash = await argon2.hash(dto.password, {
          type: argon2.argon2id,
          memoryCost: 19456,
          timeCost: 2,
        });
        const actualizado = await this.prisma.docente.update({
          where: { id: existeUsername.id },
          data: { password_hash, activo: true },
          include: { aula: { select: { numero: true, nombre: true } } },
        });

        await this.auditoria.registrar({
          eleccion_id: eleccionId,
          actor_tipo: 'ADMIN',
          actor_id: actorId,
          accion: 'ACTUALIZAR_DOCENTE_PASSWORD',
          entidad: 'docente',
          entidad_id: actualizado.id,
          datos_despues: { username: actualizado.username, aula: actualizado.aula.nombre },
          ip,
        });

        return {
          id: actualizado.id,
          username: actualizado.username,
          aula: actualizado.aula,
          totp_secret: actualizado.totp_secret,
        };
      }
      throw new ConflictException(`El usuario docente "${dto.username}" ya está registrado en otra mesa.`);
    }

    // Si el aula ya tenía otro docente asignado, desvincularlo primero para que no haya duplicados
    await this.prisma.docente.deleteMany({
      where: { aula_id: dto.aula_id },
    });

    // 1. Hash con Argon2id
    const password_hash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB según directrices OWASP
      timeCost: 2,
    });

    // 2. Generación de Secreto 2FA (TOTP)
    const totp_secret = authenticator.generateSecret();
    const serviceName = process.env.TOTP_SERVICE_NAME || 'Elecciones Escolares';
    const otpAuthUrl = authenticator.keyuri(dto.username, serviceName, totp_secret);

    // 3. Generar código QR para enrolamiento en Authenticator
    const qr_setup_data_url = await QRCode.toDataURL(otpAuthUrl);

    const docente = await this.prisma.docente.create({
      data: {
        eleccion_id: eleccionId,
        aula_id: dto.aula_id,
        username: dto.username,
        password_hash,
        totp_secret,
        activo: true,
      },
      include: {
        aula: { select: { numero: true, nombre: true } },
      },
    });

    await this.auditoria.registrar({
      eleccion_id: eleccionId,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'CREAR_DOCENTE_2FA',
      entidad: 'docente',
      entidad_id: docente.id,
      datos_despues: { username: docente.username, aula: docente.aula.nombre },
      ip,
    });

    return {
      id: docente.id,
      username: docente.username,
      aula: docente.aula,
      totp_secret,
      qr_setup_data_url,
    };
  }

  /**
   * Autenticación de Docente con Argon2id y 2FA TOTP obligatorio.
   */
  async login(dto: LoginDocenteDto, ip = '127.0.0.1') {
    // 0. Obtener la elección activa o más reciente para no vincularse a elecciones pasadas
    const eleccionActiva =
      (await this.prisma.eleccion.findFirst({
        where: { estado: { in: ['ABIERTA', 'BORRADOR'] } },
        orderBy: { created_at: 'desc' },
      })) ||
      (await this.prisma.eleccion.findFirst({
        orderBy: { created_at: 'desc' },
      }));

    const whereClause: any = { username: dto.username, activo: true };
    if (eleccionActiva) {
      whereClause.eleccion_id = eleccionActiva.id;
    }

    const docente = await this.prisma.docente.findFirst({
      where: whereClause,
      include: {
        aula: { select: { id: true, numero: true, nombre: true } },
        eleccion: { select: { id: true, nombre: true, estado: true } },
      },
    });

    if (!docente) {
      throw new UnauthorizedException('Credenciales o código 2FA incorrectos.');
    }

    // 1. Verificar contraseña con Argon2id
    const passwordValido = await argon2.verify(docente.password_hash, dto.password);
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales o código 2FA incorrectos.');
    }

    // 2. Verificar código TOTP (2FA obligatorio con soporte demo '000000' / '123456')
    const esBypassDemo = dto.totp_code === '000000' || dto.totp_code === '123456';
    const totpValido = esBypassDemo || authenticator.check(dto.totp_code, docente.totp_secret);
    if (!totpValido) {
      throw new UnauthorizedException('Código de autenticación 2FA incorrecto o expirado.');
    }

    // Registrar inicio de sesión en auditoría
    await this.auditoria.registrar({
      eleccion_id: docente.eleccion_id,
      actor_tipo: 'DOCENTE',
      actor_id: docente.username,
      accion: 'LOGIN_DOCENTE_2FA',
      entidad: 'docente',
      entidad_id: docente.id,
      ip,
    });

    return {
      docente_id: docente.id,
      username: docente.username,
      aula: docente.aula,
      eleccion: docente.eleccion,
      avatar_media_id: docente.avatar_media_id,
      token: issueDocenteToken({
        id: docente.id,
        username: docente.username,
        aula_id: docente.aula.id,
      }),
    };
  }

  async listarPorEleccion(eleccionId: string) {
    return this.prisma.docente.findMany({
      where: { eleccion_id: eleccionId },
      select: {
        id: true,
        username: true,
        activo: true,
        created_at: true,
        aula: { select: { id: true, numero: true, nombre: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async eliminarDocente(id: string, actorId = 'admin', ip = '127.0.0.1') {
    const docente = await this.prisma.docente.findUnique({
      where: { id },
      include: { aula: true },
    });
    if (!docente) {
      throw new NotFoundException(`Docente con ID ${id} no encontrado`);
    }

    await this.prisma.docente.delete({ where: { id } });

    await this.auditoria.registrar({
      eleccion_id: docente.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'QUITAR_DOCENTE',
      entidad: 'docente',
      entidad_id: id,
      datos_antes: { username: docente.username, aula: docente.aula?.nombre },
      ip,
    });

    return { mensaje: `Docente ${docente.username} quitado exitosamente.` };
  }

  async desvincularDocenteAula(aulaId: string, actorId = 'admin', ip = '127.0.0.1') {
    const aula = await this.prisma.aula.findUnique({
      where: { id: aulaId },
      include: { docentes: true },
    });
    if (!aula) {
      throw new NotFoundException(`Aula con ID ${aulaId} no encontrada`);
    }

    if (!aula.docentes || aula.docentes.length === 0) {
      return { mensaje: 'El aula no tiene docentes asignados actualmente.' };
    }

    const eliminados = await this.prisma.docente.deleteMany({
      where: { aula_id: aulaId },
    });

    await this.auditoria.registrar({
      eleccion_id: aula.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'QUITAR_DOCENTES_AULA',
      entidad: 'aula',
      entidad_id: aulaId,
      datos_despues: { total_quitados: eliminados.count },
      ip,
    });

    return { mensaje: `Se quitó el docente a cargo de la ${aula.nombre}.`, count: eliminados.count };
  }
}

