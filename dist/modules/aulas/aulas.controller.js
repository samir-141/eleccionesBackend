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
exports.AulasController = void 0;
const common_1 = require("@nestjs/common");
const aulas_service_1 = require("./aulas.service");
const create_aula_dto_1 = require("./dto/create-aula.dto");
let AulasController = class AulasController {
    aulasService;
    constructor(aulasService) {
        this.aulasService = aulasService;
    }
    async crear(eleccionId, dto, ip, actorId = 'admin') {
        return this.aulasService.crearAula(eleccionId, dto, actorId, ip);
    }
    async listar(eleccionId) {
        return this.aulasService.listarPorEleccion(eleccionId);
    }
    async obtener(id) {
        return this.aulasService.obtenerPorId(id);
    }
    async actualizar(id, dto, ip, actorId = 'admin') {
        return this.aulasService.actualizarAula(id, dto, actorId, ip);
    }
    async eliminar(id, ip, actorId = 'admin') {
        return this.aulasService.eliminarAula(id, actorId, ip);
    }
    async moverElector(electorId, nuevaAulaId, ip, actorId = 'admin') {
        return this.aulasService.moverElectorAula(electorId, nuevaAulaId, actorId, ip);
    }
    async desvincularPuesto(puestoId, ip, actorId = 'admin') {
        return this.aulasService.desvincularPuestoAdmin(puestoId, actorId, ip);
    }
};
exports.AulasController = AulasController;
__decorate([
    (0, common_1.Post)('api/admin/elecciones/:eleccionId/aulas'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_aula_dto_1.CreateAulaDto, String, Object]),
    __metadata("design:returntype", Promise)
], AulasController.prototype, "crear", null);
__decorate([
    (0, common_1.Get)('api/admin/elecciones/:eleccionId/aulas'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AulasController.prototype, "listar", null);
__decorate([
    (0, common_1.Get)('api/admin/elecciones/:eleccionId/aulas/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AulasController.prototype, "obtener", null);
__decorate([
    (0, common_1.Put)('api/admin/aulas/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], AulasController.prototype, "actualizar", null);
__decorate([
    (0, common_1.Delete)('api/admin/aulas/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AulasController.prototype, "eliminar", null);
__decorate([
    (0, common_1.Put)('api/admin/electores/:electorId/mover-aula'),
    __param(0, (0, common_1.Param)('electorId')),
    __param(1, (0, common_1.Body)('nuevaAulaId')),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AulasController.prototype, "moverElector", null);
__decorate([
    (0, common_1.Post)('api/admin/puestos/:puestoId/desvincular'),
    __param(0, (0, common_1.Param)('puestoId')),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AulasController.prototype, "desvincularPuesto", null);
exports.AulasController = AulasController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [aulas_service_1.AulasService])
], AulasController);
//# sourceMappingURL=aulas.controller.js.map