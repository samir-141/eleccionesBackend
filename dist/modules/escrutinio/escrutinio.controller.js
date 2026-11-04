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
exports.EscrutinioController = void 0;
const common_1 = require("@nestjs/common");
const escrutinio_service_1 = require("./escrutinio.service");
let EscrutinioController = class EscrutinioController {
    escrutinioService;
    constructor(escrutinioService) {
        this.escrutinioService = escrutinioService;
    }
    async ejecutar(eleccionId, actorId = 'admin', ip) {
        return this.escrutinioService.ejecutarEscrutinio(eleccionId, actorId, ip);
    }
    async obtenerResultado(eleccionId) {
        return this.escrutinioService.obtenerResultado(eleccionId);
    }
    async obtenerReportePublico(eleccionId) {
        return this.escrutinioService.obtenerReporteOficial(eleccionId);
    }
};
exports.EscrutinioController = EscrutinioController;
__decorate([
    (0, common_1.Post)('api/admin/elecciones/:eleccionId/escrutinio/ejecutar'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __param(1, (0, common_1.Headers)('x-actor-id')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], EscrutinioController.prototype, "ejecutar", null);
__decorate([
    (0, common_1.Get)('api/admin/elecciones/:eleccionId/escrutinio/resultado'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EscrutinioController.prototype, "obtenerResultado", null);
__decorate([
    (0, common_1.Get)('api/public/elecciones/:eleccionId/reporte'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EscrutinioController.prototype, "obtenerReportePublico", null);
exports.EscrutinioController = EscrutinioController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [escrutinio_service_1.EscrutinioService])
], EscrutinioController);
//# sourceMappingURL=escrutinio.controller.js.map