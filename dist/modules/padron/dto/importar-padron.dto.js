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
exports.ParseCsvDto = exports.ConfirmarImportacionDto = exports.ElectorCsvRowDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ElectorCsvRowDto {
    dni;
    nombres;
    apellidos;
    grado_seccion;
    aula_numero;
}
exports.ElectorCsvRowDto = ElectorCsvRowDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ElectorCsvRowDto.prototype, "dni", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ElectorCsvRowDto.prototype, "nombres", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ElectorCsvRowDto.prototype, "apellidos", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ElectorCsvRowDto.prototype, "grado_seccion", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], ElectorCsvRowDto.prototype, "aula_numero", void 0);
class ConfirmarImportacionDto {
    electores;
}
exports.ConfirmarImportacionDto = ConfirmarImportacionDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ElectorCsvRowDto),
    __metadata("design:type", Array)
], ConfirmarImportacionDto.prototype, "electores", void 0);
class ParseCsvDto {
    csv_content;
}
exports.ParseCsvDto = ParseCsvDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ParseCsvDto.prototype, "csv_content", void 0);
//# sourceMappingURL=importar-padron.dto.js.map