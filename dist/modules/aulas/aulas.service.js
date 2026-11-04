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
};
exports.AulasService = AulasService;
exports.AulasService = AulasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService])
], AulasService);
//# sourceMappingURL=aulas.service.js.map