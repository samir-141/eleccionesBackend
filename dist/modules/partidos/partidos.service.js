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
    async listarPorEleccion(eleccionId) {
        return this.prisma.partido.findMany({
            where: { eleccion_id: eleccionId },
            orderBy: { numero_lista: 'asc' },
        });
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