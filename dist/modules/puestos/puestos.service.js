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
exports.PuestosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const auditoria_service_1 = require("../auditoria/auditoria.service");
const crypto = require("crypto");
const QRCode = require("qrcode");
let PuestosService = class PuestosService {
    prisma;
    auditoria;
    tokensVotoPorPuesto = new Map();
    maquinasPendientes = new Map();
    constructor(prisma, auditoria) {
        this.prisma = prisma;
        this.auditoria = auditoria;
    }
    setTokenVotoPuesto(puestoId, tokenVoto) {
        this.tokensVotoPorPuesto.set(puestoId, tokenVoto);
    }
    limpiarTokenVotoPuesto(puestoId) {
        this.tokensVotoPorPuesto.delete(puestoId);
    }
    obtenerTokenVotoPuesto(puestoId) {
        return this.tokensVotoPorPuesto.get(puestoId);
    }
    async solicitarEmparejamiento(aulaId, numeroPuesto) {
        if (!aulaId) {
            const token = crypto.randomBytes(24).toString('hex');
            const codigoCorto = 'MQ-' + token.substring(0, 4).toUpperCase();
            const expires_at = new Date(Date.now() + 15 * 60 * 1000);
            const maquina = {
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
            throw new common_1.NotFoundException(`Aula con ID ${aulaId} no encontrada`);
        }
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
        const token = crypto.randomBytes(32).toString('hex');
        const expires_at = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.qrEmparejamiento.create({
            data: {
                puesto_id: puesto.id,
                token,
                expires_at,
                usado: false,
            },
        });
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
    async emparejarConQr(docenteAulaId, tokenQr, actorId = 'docente', ip = '127.0.0.1') {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        let resolvedAulaId = docenteAulaId;
        if (!resolvedAulaId || !UUID_REGEX.test(resolvedAulaId)) {
            const aulaFallback = await this.prisma.aula.findFirst({ orderBy: { numero: 'asc' } });
            if (aulaFallback)
                resolvedAulaId = aulaFallback.id;
        }
        const tokenLimpio = tokenQr.trim();
        if (this.maquinasPendientes.has(tokenLimpio)) {
            const maquina = this.maquinasPendientes.get(tokenLimpio);
            if (maquina.usado) {
                throw new common_1.BadRequestException('Esta máquina ya fue autorizada y asignada a una mesa.');
            }
            if (maquina.expires_at < new Date()) {
                throw new common_1.BadRequestException('El código QR de la máquina ha expirado. Genere uno nuevo.');
            }
            const aula = await this.prisma.aula.findUnique({ where: { id: resolvedAulaId } });
            if (!aula) {
                throw new common_1.NotFoundException(`Aula con ID ${resolvedAulaId} no encontrada`);
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
        const qrRecord = await this.prisma.qrEmparejamiento.findUnique({
            where: { token: tokenLimpio },
            include: { puesto: { include: { aula: true } } },
        });
        if (!qrRecord) {
            throw new common_1.NotFoundException('Código QR de emparejamiento no encontrado o inválido.');
        }
        if (qrRecord.usado) {
            throw new common_1.BadRequestException('Este código QR ya fue utilizado anteriormente.');
        }
        if (qrRecord.expires_at < new Date()) {
            throw new common_1.BadRequestException('El código QR de emparejamiento ha expirado. Genere uno nuevo.');
        }
        if (qrRecord.puesto.aula_id !== resolvedAulaId) {
            throw new common_1.ForbiddenException(`Violación de seguridad: El puesto pertenece al Aula "${qrRecord.puesto.aula.nombre}". Usted solo puede emparejar puestos de su propia aula.`);
        }
        await this.prisma.qrEmparejamiento.update({
            where: { id: qrRecord.id },
            data: { usado: true },
        });
        await this.prisma.habilitacion.deleteMany({
            where: { puesto_id: qrRecord.puesto_id },
        });
        this.limpiarTokenVotoPuesto(qrRecord.puesto_id);
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
    async emparejarPuestoAdmin(aulaId, tokenQr, numeroPuesto, actorId = 'admin', ip = '127.0.0.1') {
        const aula = await this.prisma.aula.findUnique({ where: { id: aulaId } });
        if (!aula) {
            throw new common_1.NotFoundException(`Aula con ID ${aulaId} no encontrada`);
        }
        const tokenLimpio = tokenQr.trim();
        if (this.maquinasPendientes.has(tokenLimpio)) {
            const maquina = this.maquinasPendientes.get(tokenLimpio);
            if (maquina.usado) {
                throw new common_1.BadRequestException('Esta máquina ya fue autorizada y asignada a una mesa.');
            }
            if (maquina.expires_at < new Date()) {
                throw new common_1.BadRequestException('El código de vinculación ha expirado. Genere uno nuevo.');
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
            throw new common_1.NotFoundException('Código de máquina o QR no encontrado.');
        }
        if (qrRecord.usado) {
            throw new common_1.BadRequestException('Esta máquina ya fue autorizada anteriormente.');
        }
        if (qrRecord.expires_at < new Date()) {
            throw new common_1.BadRequestException('El código de vinculación ha expirado. Genere uno nuevo en la máquina.');
        }
        let numPuestoFinal = numeroPuesto;
        if (!numPuestoFinal) {
            const maxPuesto = await this.prisma.puesto.aggregate({
                where: { aula_id: aulaId },
                _max: { numero_puesto: true },
            });
            numPuestoFinal = (maxPuesto._max.numero_puesto || 0) + 1;
        }
        await this.prisma.habilitacion.deleteMany({
            where: { puesto_id: qrRecord.puesto_id },
        });
        this.limpiarTokenVotoPuesto(qrRecord.puesto_id);
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
    async agregarPuestoAula(aulaId, actorId = 'admin', ip = '127.0.0.1') {
        const aula = await this.prisma.aula.findUnique({ where: { id: aulaId } });
        if (!aula) {
            throw new common_1.NotFoundException(`Aula con ID ${aulaId} no encontrada`);
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
    async registrarHeartbeat(tokenSesion) {
        const puesto = await this.prisma.puesto.findFirst({
            where: { token_sesion: tokenSesion },
        });
        if (!puesto) {
            throw new common_1.UnauthorizedException('Token de sesión de puesto no reconocido.');
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
    async verificarInactivosPorAula(aulaId) {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        let resolvedAulaId = aulaId;
        if (!resolvedAulaId || !UUID_REGEX.test(resolvedAulaId)) {
            const aulaDefault = await this.prisma.aula.findFirst({
                orderBy: { numero: 'asc' },
            });
            if (!aulaDefault)
                return [];
            resolvedAulaId = aulaDefault.id;
        }
        const ahora = new Date();
        const limiteInactividad = new Date(ahora.getTime() - 30 * 1000);
        await this.prisma.$executeRaw `
      UPDATE puesto
      SET estado = 'FUERA_SERVICIO'
      WHERE aula_id = ${resolvedAulaId}::uuid
        AND (ultimo_heartbeat IS NULL OR ultimo_heartbeat < ${limiteInactividad})
        AND id NOT IN (SELECT puesto_id FROM habilitacion WHERE expires_at > ${ahora});
    `;
        await this.prisma.$executeRaw `
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
    async verificarEstadoQr(tokenQr) {
        const tokenLimpio = tokenQr.trim();
        if (this.maquinasPendientes.has(tokenLimpio)) {
            const maquina = this.maquinasPendientes.get(tokenLimpio);
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
    async sincronizarPuesto(puestoId, tokenSesion) {
        const puesto = await this.prisma.puesto.findUnique({
            where: { id: puestoId },
            include: { aula: true },
        });
        if (!puesto) {
            throw new common_1.NotFoundException('Puesto no encontrado.');
        }
        if (puesto.token_sesion !== tokenSesion) {
            throw new common_1.UnauthorizedException('Token de sesión no válido para este puesto.');
        }
        const ahora = new Date();
        const habilitacion = await this.prisma.habilitacion.findFirst({
            where: {
                puesto_id: puestoId,
                expires_at: { gt: ahora },
            },
        });
        let nuevoEstado;
        let token_voto = null;
        if (habilitacion) {
            nuevoEstado = 'RESERVADO';
            token_voto = habilitacion.token_voto || this.tokensVotoPorPuesto.get(puestoId) || null;
        }
        else {
            nuevoEstado = 'LIBRE';
            this.limpiarTokenVotoPuesto(puestoId);
        }
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
    async desvincularPuesto(puestoId, tokenSesion) {
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
};
exports.PuestosService = PuestosService;
exports.PuestosService = PuestosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService])
], PuestosService);
//# sourceMappingURL=puestos.service.js.map