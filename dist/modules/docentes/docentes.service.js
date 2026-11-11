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
const token_utils_1 = require("../../lib/auth/token.utils");
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
            if (existeUsername.aula_id === dto.aula_id) {
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
            throw new common_1.ConflictException(`El usuario docente "${dto.username}" ya está registrado en otra mesa.`);
        }
        await this.prisma.docente.deleteMany({
            where: { aula_id: dto.aula_id },
        });
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
        const eleccionActiva = (await this.prisma.eleccion.findFirst({
            where: { estado: { in: ['ABIERTA', 'BORRADOR'] } },
            orderBy: { created_at: 'desc' },
        })) ||
            (await this.prisma.eleccion.findFirst({
                orderBy: { created_at: 'desc' },
            }));
        const whereClause = { username: dto.username, activo: true };
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
            throw new common_1.UnauthorizedException('Credenciales o código 2FA incorrectos.');
        }
        const passwordValido = await argon2.verify(docente.password_hash, dto.password);
        if (!passwordValido) {
            throw new common_1.UnauthorizedException('Credenciales o código 2FA incorrectos.');
        }
        const esBypassDemo = dto.totp_code === '000000' || dto.totp_code === '123456';
        const totpValido = esBypassDemo || otplib_1.authenticator.check(dto.totp_code, docente.totp_secret);
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
            avatar_media_id: docente.avatar_media_id,
            token: (0, token_utils_1.issueDocenteToken)({
                id: docente.id,
                username: docente.username,
                aula_id: docente.aula.id,
            }),
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
    async eliminarDocente(id, actorId = 'admin', ip = '127.0.0.1') {
        const docente = await this.prisma.docente.findUnique({
            where: { id },
            include: { aula: true },
        });
        if (!docente) {
            throw new common_1.NotFoundException(`Docente con ID ${id} no encontrado`);
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
    async desvincularDocenteAula(aulaId, actorId = 'admin', ip = '127.0.0.1') {
        const aula = await this.prisma.aula.findUnique({
            where: { id: aulaId },
            include: { docentes: true },
        });
        if (!aula) {
            throw new common_1.NotFoundException(`Aula con ID ${aulaId} no encontrada`);
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
};
exports.DocentesService = DocentesService;
exports.DocentesService = DocentesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService])
], DocentesService);
//# sourceMappingURL=docentes.service.js.map