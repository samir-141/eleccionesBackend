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
exports.HabilitacionController = void 0;
const common_1 = require("@nestjs/common");
const habilitacion_service_1 = require("./habilitacion.service");
const habilitacion_dto_1 = require("./dto/habilitacion.dto");
let HabilitacionController = class HabilitacionController {
    habilitacionService;
    constructor(habilitacionService) {
        this.habilitacionService = habilitacionService;
    }
    async consultarDni(dto, docenteAulaId, actorId = 'docente', ip) {
        if (!docenteAulaId) {
            throw new common_1.BadRequestException('Cabecera x-docente-aula-id requerida para operar en el aula.');
        }
        return this.habilitacionService.consultarDni(docenteAulaId, actorId, dto, ip);
    }
    async confirmar(dto, docenteAulaId, actorId = 'docente', ip) {
        if (!docenteAulaId) {
            throw new common_1.BadRequestException('Cabecera x-docente-aula-id requerida para operar en el aula.');
        }
        return this.habilitacionService.confirmarHabilitacion(docenteAulaId, actorId, dto.elector_id, dto.puesto_id, ip);
    }
    async cancelar(dto, docenteAulaId, actorId = 'docente', ip) {
        if (!docenteAulaId) {
            throw new common_1.BadRequestException('Cabecera x-docente-aula-id requerida para operar en el aula.');
        }
        return this.habilitacionService.cancelarHabilitacion(docenteAulaId, actorId, dto.elector_id, dto.motivo, ip);
    }
};
exports.HabilitacionController = HabilitacionController;
__decorate([
    (0, common_1.Post)('consultar-dni'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-docente-aula-id')),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [habilitacion_dto_1.ConsultarDniDto, String, Object, String]),
    __metadata("design:returntype", Promise)
], HabilitacionController.prototype, "consultarDni", null);
__decorate([
    (0, common_1.Post)('confirmar'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-docente-aula-id')),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [habilitacion_dto_1.ConfirmarHabilitacionDto, String, Object, String]),
    __metadata("design:returntype", Promise)
], HabilitacionController.prototype, "confirmar", null);
__decorate([
    (0, common_1.Post)('cancelar'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-docente-aula-id')),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [habilitacion_dto_1.CancelarHabilitacionDto, String, Object, String]),
    __metadata("design:returntype", Promise)
], HabilitacionController.prototype, "cancelar", null);
exports.HabilitacionController = HabilitacionController = __decorate([
    (0, common_1.Controller)('api/docente/habilitacion'),
    __metadata("design:paramtypes", [habilitacion_service_1.HabilitacionService])
], HabilitacionController);
//# sourceMappingURL=habilitacion.controller.js.map