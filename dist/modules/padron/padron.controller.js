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
exports.PadronController = void 0;
const common_1 = require("@nestjs/common");
const padron_service_1 = require("./padron.service");
const importar_padron_dto_1 = require("./dto/importar-padron.dto");
let PadronController = class PadronController {
    padronService;
    constructor(padronService) {
        this.padronService = padronService;
    }
    async previsualizar(eleccionId, dto) {
        return this.padronService.previsualizarCsv(eleccionId, dto.csv_content);
    }
    async confirmar(eleccionId, dto, ip, actorId = 'admin') {
        return this.padronService.confirmarImportacion(eleccionId, dto.electores, actorId, ip);
    }
    async listar(eleccionId, page, limit, busqueda) {
        return this.padronService.listarElectores(eleccionId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50, busqueda);
    }
    async pantallaPuerta(aulaId) {
        return this.padronService.obtenerParaPantallaPuerta(aulaId);
    }
    async obtenerSalonDocente(aulaId) {
        return this.padronService.obtenerSalonDocente(aulaId);
    }
};
exports.PadronController = PadronController;
__decorate([
    (0, common_1.Post)('api/admin/elecciones/:eleccionId/padron/previsualizar'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, importar_padron_dto_1.ParseCsvDto]),
    __metadata("design:returntype", Promise)
], PadronController.prototype, "previsualizar", null);
__decorate([
    (0, common_1.Post)('api/admin/elecciones/:eleccionId/padron/confirmar'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, importar_padron_dto_1.ConfirmarImportacionDto, String, Object]),
    __metadata("design:returntype", Promise)
], PadronController.prototype, "confirmar", null);
__decorate([
    (0, common_1.Get)('api/admin/elecciones/:eleccionId/padron'),
    __param(0, (0, common_1.Param)('eleccionId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('busqueda')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PadronController.prototype, "listar", null);
__decorate([
    (0, common_1.Get)('api/public/pantalla-puerta/:aulaId'),
    __param(0, (0, common_1.Param)('aulaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PadronController.prototype, "pantallaPuerta", null);
__decorate([
    (0, common_1.Get)('api/docente/aula/:aulaId/salon'),
    __param(0, (0, common_1.Param)('aulaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PadronController.prototype, "obtenerSalonDocente", null);
exports.PadronController = PadronController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [padron_service_1.PadronService])
], PadronController);
//# sourceMappingURL=padron.controller.js.map