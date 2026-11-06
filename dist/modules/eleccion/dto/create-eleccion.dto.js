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
exports.CreateEleccionDto = void 0;
const class_validator_1 = require("class-validator");
class CreateEleccionDto {
    nombre;
    descripcion;
    clonarConfiguracion;
    clonarPadron;
    eleccionOrigenId;
}
exports.CreateEleccionDto = CreateEleccionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3, { message: 'El nombre de la elección debe tener al menos 3 caracteres' }),
    (0, class_validator_1.MaxLength)(150, { message: 'El nombre de la elección no puede exceder 150 caracteres' }),
    __metadata("design:type", String)
], CreateEleccionDto.prototype, "nombre", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEleccionDto.prototype, "descripcion", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateEleccionDto.prototype, "clonarConfiguracion", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateEleccionDto.prototype, "clonarPadron", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'El ID de la elección origen debe ser un UUID válido' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEleccionDto.prototype, "eleccionOrigenId", void 0);
//# sourceMappingURL=create-eleccion.dto.js.map