"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocentesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const auditoria_service_1 = require("../auditoria/auditoria.service");
const argon2 = require("argon2");
const otplib_1 = require("otplib");
const QRCode = require("qrcode");
let DocentesService = class DocentesService {
    prisma;
    auditoria;
    constructor(prisma, auditoria) {
        this.prisma = prisma;
        this.auditoria = auditoria;
    }
    async crearDocente(eleccionId, dto, actorId = 'admin', ip = '127.0.0.1') {
        const eleccion = await this.prisma.eleccion.findUnique({
            where: { id: eleccionId },
        });
        if (!eleccion) {
            throw new common_1.NotFoundException(`Elección ${eleccionId} no encontrada`);
        }
        const aula = await this.prisma.aula.findFirst({
            where: { id: dto.aula_id, eleccion_id: eleccionId },
        });
        if (!aula) {
            throw new common_1.BadRequestException('El aula especificada no pertenece a esta elección.');
        }
        const existeUsername = await this.prisma.docente.findFirst({
            where: { eleccion_id: eleccionId, username: dto.username },
        });
        if (existeUsername) {
            throw new common_1.ConflictException(`El usuario docente "${dto.username}" ya está registrado.`);
        }
        const password_hash = await argon2.hash(dto.password, {
            type: argon2.argon2id,
            memoryCost: 19456,
            timeCost: 2,
        });
        const totp_secret = otplib_1.authenticator.generateSecret();
        const serviceName = process.env.TOTP_SERVICE_NAME || 'Elecciones Escolares';
        const otpAuthUrl = otplib_1.authenticator.keyuri(dto.username, serviceName, totp_secret);
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
    async login(dto, ip = '127.0.0.1') {
        const docente = await this.prisma.docente.findFirst({
            where: { username: dto.username, activo: true },
            include: {
                aula: { select: { id: true, numero: true, nombre: true } },
                eleccion: { select: { id: true, nombre: true, estado: true } },
            },
        });
        if (!docente) {
            throw new common_1.UnauthorizedException('Credenciales o código 2FA incorrectos.');
        }
        const passwordValido = await argon2.verify(docente.password_hash, dto.password);
        if (!passwordValido) {
            throw new common_1.UnauthorizedException('Credenciales o código 2FA incorrectos.');
        }
        const totpValido = otplib_1.authenticator.check(dto.totp_code, docente.totp_secret);
        if (!totpValido) {
            throw new common_1.UnauthorizedException('Código de autenticación 2FA incorrecto o expirado.');
        }
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
    async listarPorEleccion(eleccionId) {
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
};
exports.DocentesService = DocentesService;
exports.DocentesService = DocentesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService])
], DocentesService);
//# sourceMappingURL=docentes.service.js.map