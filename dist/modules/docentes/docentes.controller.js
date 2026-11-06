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
exports.DocentesController = void 0;
const common_1 = require("@nestjs/common");
const docentes_service_1 = require("./docentes.service");
const create_docente_dto_1 = require("./dto/create-docente.dto");
let DocentesController = class DocentesController {
    docentesService;
    constructor(docentesService) {
        this.docentesService = docentesService;
    }
    async crear(eleccionId, dto, ip, actorId = 'admin') {
        return this.docentesService.crearDocente(eleccionId, dto, actorId, ip);
    }
    async listar(eleccionId) {
        return this.docentesService.listarPorEleccion(eleccionId);
    }
    async eliminar(id, ip, actorId = 'admin') {
        return this.docentesService.eliminarDocente(id, actorId, ip);
    }
    async desvincularDocenteAula(aulaId, ip, actorId = 'admin') {
        return this.docentesService.desvincularDocenteAula(aulaId, actorId, ip);
    }
    async login(dto, ip) {
        return this.docentesService.login(dto, ip);
    }
};
exports.DocentesController = DocentesController;
__decorate([
    (0, common_1.Post)('api/admin/elecciones/:eleccionId/docentes'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_docente_dto_1.CreateDocenteDto, String, Object]),
    __metadata("design:returntype", Promise)
], DocentesController.prototype, "crear", null);
__decorate([
    (0, common_1.Get)('api/admin/elecciones/:eleccionId/docentes'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocentesController.prototype, "listar", null);
__decorate([
    (0, common_1.Delete)('api/admin/docentes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DocentesController.prototype, "eliminar", null);
__decorate([
    (0, common_1.Post)('api/admin/aulas/:aulaId/docentes/desvincular'),
    __param(0, (0, common_1.Param)('aulaId')),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DocentesController.prototype, "desvincularDocenteAula", null);
__decorate([
    (0, common_1.Post)('api/docente/auth/login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_docente_dto_1.LoginDocenteDto, String]),
    __metadata("design:returntype", Promise)
], DocentesController.prototype, "login", null);
exports.DocentesController = DocentesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [docentes_service_1.DocentesService])
], DocentesController);
//# sourceMappingURL=docentes.controller.js.map