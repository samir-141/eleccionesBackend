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
exports.VotoController = void 0;
const common_1 = require("@nestjs/common");
const voto_service_1 = require("./voto.service");
const voto_dto_1 = require("./dto/voto.dto");
let VotoController = class VotoController {
    votoService;
    constructor(votoService) {
        this.votoService = votoService;
    }
    async obtenerCedula(dto) {
        return this.votoService.obtenerCedula(dto.token_voto);
    }
    async emitirVoto(dto) {
        return this.votoService.emitirVoto(dto);
    }
};
exports.VotoController = VotoController;
__decorate([
    (0, common_1.Post)('cedula'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Header)('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'),
    (0, common_1.Header)('Pragma', 'no-cache'),
    (0, common_1.Header)('Expires', '0'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [voto_dto_1.ObtenerCedulaDto]),
    __metadata("design:returntype", Promise)
], VotoController.prototype, "obtenerCedula", null);
__decorate([
    (0, common_1.Post)('emitir'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.Header)('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'),
    (0, common_1.Header)('Pragma', 'no-cache'),
    (0, common_1.Header)('Expires', '0'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [voto_dto_1.EmitirVotoDto]),
    __metadata("design:returntype", Promise)
], VotoController.prototype, "emitirVoto", null);
exports.VotoController = VotoController = __decorate([
    (0, common_1.Controller)('api/voto'),
    __metadata("design:paramtypes", [voto_service_1.VotoService])
], VotoController);
//# sourceMappingURL=voto.controller.js.map