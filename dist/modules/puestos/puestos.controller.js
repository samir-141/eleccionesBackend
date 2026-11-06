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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PuestosController = void 0;
const common_1 = require("@nestjs/common");
const puestos_service_1 = require("./puestos.service");
const puestos_dto_1 = require("./dto/puestos.dto");
let PuestosController = class PuestosController {
    puestosService;
    constructor(puestosService) {
        this.puestosService = puestosService;
    }
    async solicitar(dto) {
        return this.puestosService.solicitarEmparejamiento(dto.aula_id, dto.numero_puesto);
    }
    async verificarQr(token) {
        return this.puestosService.verificarEstadoQr(token);
    }
    async sincronizar(body, tokenHeader) {
        const token = body.token_sesion || tokenHeader || '';
        return this.puestosService.sincronizarPuesto(body.puesto_id, token);
    }
    async sincronizarGet(puestoId, tokenHeader) {
        return this.puestosService.sincronizarPuesto(puestoId, tokenHeader);
    }
    async desvincular(body, tokenHeader) {
        const token = body.token_sesion || tokenHeader || '';
        return this.puestosService.desvincularPuesto(body.puesto_id, token);
    }
    async emparejar(dto, docenteAulaId, actorId = 'docente', ip) {
        return this.puestosService.emparejarConQr(docenteAulaId, dto.token_qr, actorId, ip);
    }
    async autorizarMaquinaAdmin(aulaId, body, actorId = 'admin', ip) {
        return this.puestosService.emparejarPuestoAdmin(aulaId, body.token_qr, body.numero_puesto, actorId, ip);
    }
    async agregarPuestoAdmin(aulaId, actorId = 'admin', ip) {
        return this.puestosService.agregarPuestoAula(aulaId, actorId, ip);
    }
    async heartbeat(dto) {
        return this.puestosService.registrarHeartbeat(dto.token_sesion);
    }
    async listarPuestosDocente(docenteAulaId) {
        return this.puestosService.verificarInactivosPorAula(docenteAulaId);
    }
};
exports.PuestosController = PuestosController;
__decorate([
    (0, common_1.Post)('api/puesto/solicitar-emparejamiento'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [puestos_dto_1.SolicitarEmparejamientoDto]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "solicitar", null);
__decorate([
    (0, common_1.Get)('api/puesto/verificar-qr/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "verificarQr", null);
__decorate([
    (0, common_1.Post)('api/puesto/sincronizar'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-puesto-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "sincronizar", null);
__decorate([
    (0, common_1.Get)('api/puesto/:id/sincronizar'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-puesto-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "sincronizarGet", null);
__decorate([
    (0, common_1.Post)('api/puesto/desvincular'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-puesto-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "desvincular", null);
__decorate([
    (0, common_1.Post)('api/docente/puestos/emparejar'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-docente-aula-id')),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [puestos_dto_1.EmparejarPuestoDto, String, Object, String]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "emparejar", null);
__decorate([
    (0, common_1.Post)('api/admin/aulas/:aulaId/puestos/autorizar-maquina'),
    __param(0, (0, common_1.Param)('aulaId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "autorizarMaquinaAdmin", null);
__decorate([
    (0, common_1.Post)('api/admin/aulas/:aulaId/puestos'),
    __param(0, (0, common_1.Param)('aulaId')),
    __param(1, (0, common_1.Headers)('x-actor-id')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "agregarPuestoAdmin", null);
__decorate([
    (0, common_1.Post)('api/puesto/heartbeat'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [puestos_dto_1.HeartbeatDto]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "heartbeat", null);
__decorate([
    (0, common_1.Get)('api/docente/puestos'),
    __param(0, (0, common_1.Headers)('x-docente-aula-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PuestosController.prototype, "listarPuestosDocente", null);
exports.PuestosController = PuestosController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [puestos_service_1.PuestosService])
], PuestosController);
//# sourceMappingURL=puestos.controller.js.map