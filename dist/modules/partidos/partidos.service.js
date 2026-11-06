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
exports.PartidosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const auditoria_service_1 = require("../auditoria/auditoria.service");
let PartidosService = class PartidosService {
    prisma;
    auditoria;
    constructor(prisma, auditoria) {
        this.prisma = prisma;
        this.auditoria = auditoria;
    }
    async crearPartido(eleccionId, dto, actorId = 'admin', ip = '127.0.0.1') {
        const eleccion = await this.prisma.eleccion.findUnique({ where: { id: eleccionId } });
        if (!eleccion) {
            throw new common_1.NotFoundException(`Elección ${eleccionId} no encontrada`);
        }
        if (eleccion.estado !== 'BORRADOR') {
            throw new common_1.BadRequestException('No se pueden inscribir partidos en una elección que ya no está en estado BORRADOR.');
        }
        const existente = await this.prisma.partido.findFirst({
            where: { eleccion_id: eleccionId, numero_lista: dto.numero_lista },
        });
        if (existente) {
            throw new common_1.ConflictException(`Ya existe una lista con el número ${dto.numero_lista} en esta elección.`);
        }
        const partido = await this.prisma.partido.create({
            data: {
                eleccion_id: eleccionId,
                numero_lista: dto.numero_lista,
                nombre: dto.nombre,
                lema: dto.lema,
                logo_url: dto.logo_url,
            },
        });
        await this.auditoria.registrar({
            eleccion_id: eleccionId,
            actor_tipo: 'ADMIN',
            actor_id: actorId,
            accion: 'CREAR_PARTIDO',
            entidad: 'partido',
            entidad_id: partido.id,
            datos_despues: partido,
            ip,
        });
        return partido;
    }
    async actualizarPartido(id, dto, actorId = 'admin', ip = '127.0.0.1') {
        const partido = await this.prisma.partido.findUnique({
            where: { id },
            include: { eleccion: true },
        });
        if (!partido) {
            throw new common_1.NotFoundException(`Partido con ID ${id} no encontrado`);
        }
        if (partido.eleccion.estado !== 'BORRADOR') {
            throw new common_1.BadRequestException(`No se pueden editar partidos en una elección que está en estado ${partido.eleccion.estado}.`);
        }
        if (dto.numero_lista && dto.numero_lista !== partido.numero_lista) {
            const duplicado = await this.prisma.partido.findFirst({
                where: {
                    eleccion_id: partido.eleccion_id,
                    numero_lista: dto.numero_lista,
                    id: { not: id },
                },
            });
            if (duplicado) {
                throw new common_1.ConflictException(`Ya existe otra lista con el número ${dto.numero_lista}.`);
            }
        }
        const actualizado = await this.prisma.partido.update({
            where: { id },
            data: {
                ...(dto.numero_lista !== undefined ? { numero_lista: dto.numero_lista } : {}),
                ...(dto.nombre ? { nombre: dto.nombre } : {}),
                ...(dto.lema !== undefined ? { lema: dto.lema } : {}),
                ...(dto.logo_url !== undefined ? { logo_url: dto.logo_url } : {}),
            },
        });
        await this.auditoria.registrar({
            eleccion_id: partido.eleccion_id,
            actor_tipo: 'ADMIN',
            actor_id: actorId,
            accion: 'ACTUALIZAR_PARTIDO',
            entidad: 'partido',
            entidad_id: id,
            datos_antes: partido,
            datos_despues: actualizado,
            ip,
        });
        return actualizado;
    }
    async eliminarPartido(id, actorId = 'admin', ip = '127.0.0.1') {
        const partido = await this.prisma.partido.findUnique({
            where: { id },
            include: { eleccion: true },
        });
        if (!partido) {
            throw new common_1.NotFoundException(`Partido con ID ${id} no encontrado`);
        }
        if (partido.eleccion.estado !== 'BORRADOR') {
            throw new common_1.BadRequestException('Solo se pueden eliminar partidos si la elección está en estado BORRADOR.');
        }
        await this.prisma.partido.delete({ where: { id } });
        await this.auditoria.registrar({
            eleccion_id: partido.eleccion_id,
            actor_tipo: 'ADMIN',
            actor_id: actorId,
            accion: 'ELIMINAR_PARTIDO',
            entidad: 'partido',
            entidad_id: id,
            datos_antes: partido,
            ip,
        });
        return { ok: true, id };
    }
    async listarPorEleccion(eleccionId) {
        return this.prisma.partido.findMany({
            where: { eleccion_id: eleccionId },
            orderBy: { numero_lista: 'asc' },
        });
    }
    async listarActivos() {
        const activa = await this.prisma.eleccion.findFirst({
            where: { estado: 'ABIERTA' },
            orderBy: { created_at: 'desc' },
        });
        const eleccion = activa || (await this.prisma.eleccion.findFirst({ orderBy: { created_at: 'desc' } }));
        if (!eleccion)
            return [];
        return this.listarPorEleccion(eleccion.id);
    }
    async obtenerParaCedula(eleccionId) {
        const partidos = await this.prisma.partido.findMany({
            where: { eleccion_id: eleccionId },
            select: {
                id: true,
                numero_lista: true,
                nombre: true,
                lema: true,
                logo_url: true,
            },
        });
        const shuffledPartidos = [...partidos];
        for (let i = shuffledPartidos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPartidos[i], shuffledPartidos[j]] = [shuffledPartidos[j], shuffledPartidos[i]];
        }
        return {
            schema_version: 'v1',
            opciones: [
                ...shuffledPartidos,
                {
                    id: 'BLANCO',
                    numero_lista: 0,
                    nombre: 'VOTO EN BLANCO',
                    lema: 'No respaldar a ninguna lista candidata',
                    logo_url: null,
                },
            ],
        };
    }
};
exports.PartidosService = PartidosService;
exports.PartidosService = PartidosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService])
], PartidosService);
//# sourceMappingURL=partidos.service.js.map