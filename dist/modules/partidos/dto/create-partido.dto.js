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
exports.CreatePartidoDto = void 0;
const class_validator_1 = require("class-validator");
class CreatePartidoDto {
    numero_lista;
    nombre;
    lema;
    logo_url;
}
exports.CreatePartidoDto = CreatePartidoDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'El número de lista debe ser mayor o igual a 1' }),
    __metadata("design:type", Number)
], CreatePartidoDto.prototype, "numero_lista", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2, { message: 'El nombre del partido debe tener al menos 2 caracteres' }),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreatePartidoDto.prototype, "nombre", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreatePartidoDto.prototype, "lema", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePartidoDto.prototype, "logo_url", void 0);
//# sourceMappingURL=create-partido.dto.js.map