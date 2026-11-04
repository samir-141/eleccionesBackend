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
exports.CancelarHabilitacionDto = exports.ConfirmarHabilitacionDto = exports.ConsultarDniDto = void 0;
const class_validator_1 = require("class-validator");
class ConsultarDniDto {
    dni;
    origen_lectura = 'CAMARA';
}
exports.ConsultarDniDto = ConsultarDniDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(6, 15, { message: 'El DNI debe tener entre 6 y 15 caracteres' }),
    __metadata("design:type", String)
], ConsultarDniDto.prototype, "dni", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['CAMARA', 'MANUAL']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsultarDniDto.prototype, "origen_lectura", void 0);
class ConfirmarHabilitacionDto {
    elector_id;
}
exports.ConfirmarHabilitacionDto = ConfirmarHabilitacionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConfirmarHabilitacionDto.prototype, "elector_id", void 0);
class CancelarHabilitacionDto {
    elector_id;
    motivo;
}
exports.CancelarHabilitacionDto = CancelarHabilitacionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CancelarHabilitacionDto.prototype, "elector_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CancelarHabilitacionDto.prototype, "motivo", void 0);
//# sourceMappingURL=habilitacion.dto.js.map