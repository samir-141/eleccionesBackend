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
exports.PartidosController = void 0;
const common_1 = require("@nestjs/common");
const partidos_service_1 = require("./partidos.service");
const create_partido_dto_1 = require("./dto/create-partido.dto");
const update_partido_dto_1 = require("./dto/update-partido.dto");
let PartidosController = class PartidosController {
    partidosService;
    constructor(partidosService) {
        this.partidosService = partidosService;
    }
    async crear(eleccionId, dto, ip, actorId = 'admin') {
        return this.partidosService.crearPartido(eleccionId, dto, actorId, ip);
    }
    async actualizar(id, dto, ip, actorId = 'admin') {
        return this.partidosService.actualizarPartido(id, dto, actorId, ip);
    }
    async eliminar(id, ip, actorId = 'admin') {
        return this.partidosService.eliminarPartido(id, actorId, ip);
    }
    async listar(eleccionId) {
        return this.partidosService.listarPorEleccion(eleccionId);
    }
    async previewCedula(eleccionId) {
        return this.partidosService.obtenerParaCedula(eleccionId);
    }
    async listarDocente() {
        return this.partidosService.listarActivos();
    }
};
exports.PartidosController = PartidosController;
__decorate([
    (0, common_1.Post)('api/admin/elecciones/:eleccionId/partidos'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_partido_dto_1.CreatePartidoDto, String, Object]),
    __metadata("design:returntype", Promise)
], PartidosController.prototype, "crear", null);
__decorate([
    (0, common_1.Put)('api/admin/partidos/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_partido_dto_1.UpdatePartidoDto, String, Object]),
    __metadata("design:returntype", Promise)
], PartidosController.prototype, "actualizar", null);
__decorate([
    (0, common_1.Delete)('api/admin/partidos/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PartidosController.prototype, "eliminar", null);
__decorate([
    (0, common_1.Get)('api/admin/elecciones/:eleccionId/partidos'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartidosController.prototype, "listar", null);
__decorate([
    (0, common_1.Get)('api/admin/elecciones/:eleccionId/partidos/cedula-preview'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartidosController.prototype, "previewCedula", null);
__decorate([
    (0, common_1.Get)('api/docente/partidos'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PartidosController.prototype, "listarDocente", null);
exports.PartidosController = PartidosController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [partidos_service_1.PartidosService])
], PartidosController);
//# sourceMappingURL=partidos.controller.js.map