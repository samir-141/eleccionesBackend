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
exports.AulasService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const auditoria_service_1 = require("../auditoria/auditoria.service");
const argon2 = require("argon2");
const otplib_1 = require("otplib");
let AulasService = class AulasService {
    prisma;
    auditoria;
    constructor(prisma, auditoria) {
        this.prisma = prisma;
        this.auditoria = auditoria;
    }
    async crearAula(eleccionId, dto, actorId = 'admin', ip = '127.0.0.1') {
        const eleccion = await this.prisma.eleccion.findUnique({ where: { id: eleccionId } });
        if (!eleccion) {
            throw new common_1.NotFoundException(`Elección ${eleccionId} no encontrada`);
        }
        if (eleccion.estado !== 'BORRADOR') {
            throw new common_1.BadRequestException('No se pueden agregar aulas a una elección que ya no está en estado BORRADOR.');
        }
        const existente = await this.prisma.aula.findFirst({
            where: { eleccion_id: eleccionId, numero: dto.numero },
        });
        if (existente) {
            throw new common_1.ConflictException(`Ya existe el Aula número ${dto.numero} en esta elección.`);
        }
        const aula = await this.prisma.aula.create({
            data: {
                eleccion_id: eleccionId,
                numero: dto.numero,
                nombre: dto.nombre,
                capacidad: dto.capacidad,
            },
        });
        const usernameDocente = `docente${dto.numero}`;
        const existeDocente = await this.prisma.docente.findFirst({
            where: { eleccion_id: eleccionId, username: usernameDocente },
        });
        if (!existeDocente) {
            const password_hash = await argon2.hash('docente123', {
                type: argon2.argon2id,
                memoryCost: 19456,
                timeCost: 2,
            });
            const totp_secret = otplib_1.authenticator.generateSecret();
            await this.prisma.docente.create({
                data: {
                    eleccion_id: eleccionId,
                    aula_id: aula.id,
                    username: usernameDocente,
                    password_hash,
                    totp_secret,
                    activo: true,
                },
            });
        }
        await this.auditoria.registrar({
            eleccion_id: eleccionId,
            actor_tipo: 'ADMIN',
            actor_id: actorId,
            accion: 'CREAR_AULA',
            entidad: 'aula',
            entidad_id: aula.id,
            datos_despues: aula,
            ip,
        });
        return aula;
    }
    async listarPorEleccion(eleccionId) {
        return this.prisma.aula.findMany({
            where: { eleccion_id: eleccionId },
            orderBy: { numero: 'asc' },
            include: {
                puestos: {
                    orderBy: { numero_puesto: 'asc' },
                },
                docentes: {
                    select: { id: true, username: true, activo: true },
                },
                electores: {
                    select: {
                        id: true,
                        dni: true,
                        nombres: true,
                        apellidos: true,
                        grado_seccion: true,
                        estado: true,
                    },
                    orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
                },
                _count: {
                    select: {
                        electores: true,
                        puestos: true,
                        docentes: true,
                    },
                },
            },
        });
    }
    async obtenerPorId(id) {
        const aula = await this.prisma.aula.findUnique({
            where: { id },
            include: {
                puestos: true,
                docentes: { select: { id: true, username: true, activo: true } },
                _count: { select: { electores: true } },
            },
        });
        if (!aula) {
            throw new common_1.NotFoundException(`Aula con ID ${id} no encontrada`);
        }
        return aula;
    }
    async moverElectorAula(electorId, nuevaAulaId, actorId = 'admin', ip = '127.0.0.1') {
        const elector = await this.prisma.elector.findUnique({
            where: { id: electorId },
        });
        if (!elector) {
            throw new common_1.NotFoundException(`Elector ${electorId} no encontrado`);
        }
        if (elector.estado === 'VOTO') {
            throw new common_1.BadRequestException('No se puede mover un estudiante que ya emitió su voto.');
        }
        const aulaDestino = await this.prisma.aula.findUnique({
            where: { id: nuevaAulaId },
        });
        if (!aulaDestino) {
            throw new common_1.NotFoundException(`Aula de destino ${nuevaAulaId} no encontrada`);
        }
        const actualizado = await this.prisma.elector.update({
            where: { id: electorId },
            data: { aula_id: nuevaAulaId },
        });
        await this.auditoria.registrar({
            eleccion_id: elector.eleccion_id,
            actor_tipo: 'ADMIN',
            actor_id: actorId,
            accion: 'REASIGNAR_AULA_ELECTOR',
            entidad: 'elector',
            entidad_id: elector.id,
            datos_antes: { aula_id: elector.aula_id },
            datos_despues: { aula_id: nuevaAulaId },
            ip,
        });
        return actualizado;
    }
    async desvincularPuestoAdmin(puestoId, actorId = 'admin', ip = '127.0.0.1') {
        const puesto = await this.prisma.puesto.findUnique({
            where: { id: puestoId },
            include: { aula: true },
        });
        if (!puesto) {
            throw new common_1.NotFoundException(`Puesto ${puestoId} no encontrado`);
        }
        await this.prisma.habilitacion.deleteMany({
            where: { puesto_id: puestoId },
        });
        const desvinculado = await this.prisma.puesto.update({
            where: { id: puestoId },
            data: {
                token_sesion: null,
                estado: 'LIBRE',
                ultimo_heartbeat: null,
            },
        });
        await this.auditoria.registrar({
            eleccion_id: puesto.aula.eleccion_id,
            actor_tipo: 'ADMIN',
            actor_id: actorId,
            accion: 'DESVINCULAR_PUESTO_ADMIN',
            entidad: 'puesto',
            entidad_id: puestoId,
            datos_despues: { puestoId, estado: 'LIBRE' },
            ip,
        });
        return desvinculado;
    }
    async actualizarAula(id, dto, actorId = 'admin', ip = '127.0.0.1') {
        const aula = await this.prisma.aula.findUnique({
            where: { id },
            include: { eleccion: true },
        });
        if (!aula) {
            throw new common_1.NotFoundException(`Aula con ID ${id} no encontrada`);
        }
        if (aula.eleccion.estado !== 'BORRADOR') {
            throw new common_1.BadRequestException('Solo se pueden modificar aulas cuando la elección está en BORRADOR.');
        }
        const actualizada = await this.prisma.aula.update({
            where: { id },
            data: {
                ...(dto.nombre ? { nombre: dto.nombre } : {}),
                ...(dto.capacidad ? { capacidad: dto.capacidad } : {}),
                ...(dto.numero ? { numero: dto.numero } : {}),
            },
        });
        await this.auditoria.registrar({
            eleccion_id: aula.eleccion_id,
            actor_tipo: 'ADMIN',
            actor_id: actorId,
            accion: 'ACTUALIZAR_AULA',
            entidad: 'aula',
            entidad_id: id,
            datos_antes: aula,
            datos_despues: actualizada,
            ip,
        });
        return actualizada;
    }
    async eliminarAula(id, actorId = 'admin', ip = '127.0.0.1') {
        const aula = await this.prisma.aula.findUnique({
            where: { id },
            include: { eleccion: true, _count: { select: { electores: true, puestos: true } } },
        });
        if (!aula) {
            throw new common_1.NotFoundException(`Aula con ID ${id} no encontrada`);
        }
        if (aula.eleccion.estado !== 'BORRADOR') {
            throw new common_1.BadRequestException('No se pueden eliminar aulas cuando la elección no está en BORRADOR.');
        }
        if (aula._count.electores > 0) {
            throw new common_1.BadRequestException(`No se puede eliminar la mesa porque tiene ${aula._count.electores} elector(es) asignados. Reasigna los electores primero.`);
        }
        const puestos = await this.prisma.puesto.findMany({ where: { aula_id: id }, select: { id: true } });
        if (puestos.length > 0) {
            await this.prisma.habilitacion.deleteMany({
                where: { puesto_id: { in: puestos.map((p) => p.id) } },
            });
        }
        await this.prisma.docente.deleteMany({ where: { aula_id: id } });
        await this.prisma.puesto.deleteMany({ where: { aula_id: id } });
        await this.prisma.aula.delete({ where: { id } });
        await this.auditoria.registrar({
            eleccion_id: aula.eleccion_id,
            actor_tipo: 'ADMIN',
            actor_id: actorId,
            accion: 'ELIMINAR_AULA',
            entidad: 'aula',
            entidad_id: id,
            datos_antes: aula,
            ip,
        });
        return { mensaje: 'Aula eliminada exitosamente' };
    }
};
exports.AulasService = AulasService;
exports.AulasService = AulasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService])
], AulasService);
//# sourceMappingURL=aulas.service.js.map