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
exports.VotoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const auditoria_service_1 = require("../auditoria/auditoria.service");
const partidos_service_1 = require("../partidos/partidos.service");
const puestos_service_1 = require("../puestos/puestos.service");
const crypto = require("crypto");
let VotoService = class VotoService {
    prisma;
    auditoria;
    partidosService;
    puestosService;
    constructor(prisma, auditoria, partidosService, puestosService) {
        this.prisma = prisma;
        this.auditoria = auditoria;
        this.partidosService = partidosService;
        this.puestosService = puestosService;
    }
    async obtenerCedula(tokenVoto) {
        const tokenHash = crypto.createHash('sha256').update(tokenVoto).digest('hex');
        const habilitacion = await this.prisma.habilitacion.findFirst({
            where: { token_voto_hash: tokenHash },
            include: { eleccion: true },
        });
        if (!habilitacion) {
            throw new common_1.UnauthorizedException('Token de votación no válido o ya consumido.');
        }
        if (habilitacion.expires_at < new Date()) {
            throw new common_1.UnauthorizedException('El tiempo de reserva de este puesto ha expirado.');
        }
        if (habilitacion.eleccion.estado !== 'ABIERTA') {
            throw new common_1.BadRequestException('El proceso electoral no se encuentra en estado ABIERTA.');
        }
        return this.partidosService.obtenerParaCedula(habilitacion.eleccion_id);
    }
    async emitirVoto(dto) {
        if (!dto.es_blanco && !dto.partido_id) {
            throw new common_1.BadRequestException('Debe seleccionar una lista electoral o marcar voto en blanco.');
        }
        const tokenHash = crypto.createHash('sha256').update(dto.token_voto).digest('hex');
        return this.prisma.$transaction(async (tx) => {
            const habs = await tx.$queryRaw `
        SELECT id, eleccion_id, elector_id, puesto_id, expires_at 
        FROM habilitacion 
        WHERE token_voto_hash = ${tokenHash}
        FOR UPDATE;
      `;
            if (!habs || habs.length === 0) {
                throw new common_1.UnauthorizedException('Token de votación no válido o ya consumido.');
            }
            const hab = habs[0];
            if (new Date(hab.expires_at) < new Date()) {
                throw new common_1.BadRequestException('El tiempo asignado para emitir su voto ha vencido.');
            }
            const eleccion = await tx.eleccion.findUnique({
                where: { id: hab.eleccion_id },
            });
            if (!eleccion || eleccion.estado !== 'ABIERTA') {
                throw new common_1.BadRequestException('La recepción de votos solo opera cuando la elección está ABIERTA.');
            }
            const votoPayload = dto.es_blanco
                ? { tipo: 'BLANCO' }
                : { tipo: 'LISTA', partido_id: dto.partido_id };
            await tx.$executeRaw `
        INSERT INTO urna (id, eleccion_id, voto_payload, schema_version)
        VALUES (gen_random_uuid(), ${hab.eleccion_id}::uuid, ${JSON.stringify(votoPayload)}::jsonb, 1);
      `;
            await tx.$executeRaw `
        UPDATE elector 
        SET estado = 'VOTO'
        WHERE id = ${hab.elector_id}::uuid;
      `;
            await tx.$executeRaw `
        UPDATE puesto 
        SET estado = 'LIBRE'
        WHERE id = ${hab.puesto_id}::uuid;
      `;
            await tx.$executeRaw `
        DELETE FROM habilitacion 
        WHERE id = ${hab.id}::uuid;
      `;
            this.puestosService.limpiarTokenVotoPuesto(hab.puesto_id);
            await this.auditoria.registrar({
                eleccion_id: hab.eleccion_id,
                actor_tipo: 'SISTEMA',
                actor_id: 'urna',
                accion: 'VOTO_EMITIDO',
                entidad: 'urna',
                ip: '127.0.0.1',
            });
            return {
                status: 'EXITO',
                mensaje: 'Su voto ha sido depositado en la urna con total anonimato.',
            };
        });
    }
};
exports.VotoService = VotoService;
exports.VotoService = VotoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService,
        partidos_service_1.PartidosService,
        puestos_service_1.PuestosService])
], VotoService);
//# sourceMappingURL=voto.service.js.map