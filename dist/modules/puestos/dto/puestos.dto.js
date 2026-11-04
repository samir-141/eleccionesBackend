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
exports.HeartbeatDto = exports.EmparejarPuestoDto = exports.SolicitarEmparejamientoDto = void 0;
const class_validator_1 = require("class-validator");
class SolicitarEmparejamientoDto {
    aula_id;
    numero_puesto;
}
exports.SolicitarEmparejamientoDto = SolicitarEmparejamientoDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SolicitarEmparejamientoDto.prototype, "aula_id", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SolicitarEmparejamientoDto.prototype, "numero_puesto", void 0);
class EmparejarPuestoDto {
    token_qr;
}
exports.EmparejarPuestoDto = EmparejarPuestoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EmparejarPuestoDto.prototype, "token_qr", void 0);
class HeartbeatDto {
    token_sesion;
}
exports.HeartbeatDto = HeartbeatDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], HeartbeatDto.prototype, "token_sesion", void 0);
//# sourceMappingURL=puestos.dto.js.map