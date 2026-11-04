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
exports.UpdateReglasDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateReglasDto {
    blanco_en_porcentaje;
    porcentaje_minimo_ganar;
    segunda_vuelta;
    cuantos_pasan_segunda_vuelta;
    quorum_porcentaje;
    accion_sin_quorum;
    regla_empate;
    duracion_reserva_segundos;
    ip_restringida;
}
exports.UpdateReglasDto = UpdateReglasDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateReglasDto.prototype, "blanco_en_porcentaje", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateReglasDto.prototype, "porcentaje_minimo_ganar", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateReglasDto.prototype, "segunda_vuelta", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(2),
    (0, class_validator_1.Max)(5),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateReglasDto.prototype, "cuantos_pasan_segunda_vuelta", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateReglasDto.prototype, "quorum_porcentaje", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['DECLARAR_DESIERTA', 'PRORROGAR']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateReglasDto.prototype, "accion_sin_quorum", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['SORTEO', 'ANTIGUEDAD']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateReglasDto.prototype, "regla_empate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(60, { message: 'La duración mínima de reserva es 60 segundos' }),
    (0, class_validator_1.Max)(600, { message: 'La duración máxima de reserva es 600 segundos (10 min)' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateReglasDto.prototype, "duracion_reserva_segundos", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateReglasDto.prototype, "ip_restringida", void 0);
//# sourceMappingURL=update-reglas.dto.js.map