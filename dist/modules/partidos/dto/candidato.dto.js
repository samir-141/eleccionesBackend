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
exports.UpdateCandidatoDto = exports.CreateCandidatoDto = void 0;
const class_validator_1 = require("class-validator");
class CreateCandidatoDto {
    nombres;
    apellidos;
    cargo;
    orden;
    foto_url;
    foto_media_id;
}
exports.CreateCandidatoDto = CreateCandidatoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Los nombres del candidato son obligatorios' }),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCandidatoDto.prototype, "nombres", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Los apellidos del candidato son obligatorios' }),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCandidatoDto.prototype, "apellidos", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'El cargo postulante es obligatorio' }),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCandidatoDto.prototype, "cargo", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateCandidatoDto.prototype, "orden", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCandidatoDto.prototype, "foto_url", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCandidatoDto.prototype, "foto_media_id", void 0);
class UpdateCandidatoDto {
    nombres;
    apellidos;
    cargo;
    orden;
    foto_url;
    foto_media_id;
}
exports.UpdateCandidatoDto = UpdateCandidatoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCandidatoDto.prototype, "nombres", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCandidatoDto.prototype, "apellidos", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCandidatoDto.prototype, "cargo", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateCandidatoDto.prototype, "orden", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCandidatoDto.prototype, "foto_url", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCandidatoDto.prototype, "foto_media_id", void 0);
//# sourceMappingURL=candidato.dto.js.map