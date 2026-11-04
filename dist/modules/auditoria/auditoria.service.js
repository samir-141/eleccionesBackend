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
exports.AuditoriaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let AuditoriaService = class AuditoriaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registrar(params) {
        const log = await this.prisma.auditoriaLog.create({
            data: {
                eleccion_id: params.eleccion_id,
                actor_tipo: params.actor_tipo,
                actor_id: params.actor_id,
                accion: params.accion,
                entidad: params.entidad,
                entidad_id: params.entidad_id,
                datos_antes: params.datos_antes ? JSON.parse(JSON.stringify(params.datos_antes)) : undefined,
                datos_despues: params.datos_despues ? JSON.parse(JSON.stringify(params.datos_despues)) : undefined,
                ip: params.ip,
            },
        });
        return {
            ...log,
            id: Number(log.id),
        };
    }
    async obtenerPorEleccion(eleccion_id) {
        const logs = await this.prisma.auditoriaLog.findMany({
            where: { eleccion_id },
            orderBy: { created_at: 'desc' },
            take: 50,
        });
        return logs.map((log) => ({
            ...log,
            id: Number(log.id),
        }));
    }
};
exports.AuditoriaService = AuditoriaService;
exports.AuditoriaService = AuditoriaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditoriaService);
//# sourceMappingURL=auditoria.service.js.map