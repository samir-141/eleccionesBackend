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
exports.EmitirVotoDto = exports.ObtenerCedulaDto = void 0;
const class_validator_1 = require("class-validator");
class ObtenerCedulaDto {
    token_voto;
}
exports.ObtenerCedulaDto = ObtenerCedulaDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(32, 128),
    __metadata("design:type", String)
], ObtenerCedulaDto.prototype, "token_voto", void 0);
class EmitirVotoDto {
    token_voto;
    partido_id;
    es_blanco;
}
exports.EmitirVotoDto = EmitirVotoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(32, 128),
    __metadata("design:type", String)
], EmitirVotoDto.prototype, "token_voto", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EmitirVotoDto.prototype, "partido_id", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmitirVotoDto.prototype, "es_blanco", void 0);
//# sourceMappingURL=voto.dto.js.map