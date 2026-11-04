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
      throw new ConflictException(`El usuario docente "${dto.username}" ya está registrado.`);
    }

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
    const docente = await this.prisma.docente.findFirst({
      where: { username: dto.username, activo: true },
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

    // 2. Verificar código TOTP (2FA obligatorio)
    const totpValido = authenticator.check(dto.totp_code, docente.totp_secret);
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
      token: `jwt_session_docente_${docente.id}_${Date.now()}`,
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
}

