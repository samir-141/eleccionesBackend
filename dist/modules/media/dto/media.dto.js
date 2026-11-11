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
exports.UpdateInstitucionMediaDto = exports.UpdateMediaDto = exports.UploadMediaMetadataDto = void 0;
const class_validator_1 = require("class-validator");
const storage_config_1 = require("../../../lib/supabase/storage-config");
class UploadMediaMetadataDto {
    categoria;
    entidad_tipo;
    entidad_id;
    eleccion_id;
    alt_text;
}
exports.UploadMediaMetadataDto = UploadMediaMetadataDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)([...storage_config_1.MEDIA_CATEGORIAS], {
        message: `La categoría debe ser una de: ${storage_config_1.MEDIA_CATEGORIAS.join(', ')}`,
    }),
    __metadata("design:type", String)
], UploadMediaMetadataDto.prototype, "categoria", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UploadMediaMetadataDto.prototype, "entidad_tipo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], UploadMediaMetadataDto.prototype, "entidad_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'eleccion_id debe ser un UUID v4 válido' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadMediaMetadataDto.prototype, "eleccion_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UploadMediaMetadataDto.prototype, "alt_text", void 0);
class UpdateMediaDto {
    alt_text;
    entidad_tipo;
    entidad_id;
    eleccion_id;
}
exports.UpdateMediaDto = UpdateMediaDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateMediaDto.prototype, "alt_text", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UpdateMediaDto.prototype, "entidad_tipo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], UpdateMediaDto.prototype, "entidad_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMediaDto.prototype, "eleccion_id", void 0);
class UpdateInstitucionMediaDto {
    nombre_institucion;
    subtitulo;
    titulo_portada;
    logo_media_id;
    banner_media_id;
}
exports.UpdateInstitucionMediaDto = UpdateInstitucionMediaDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], UpdateInstitucionMediaDto.prototype, "nombre_institucion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpdateInstitucionMediaDto.prototype, "subtitulo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpdateInstitucionMediaDto.prototype, "titulo_portada", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateInstitucionMediaDto.prototype, "logo_media_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateInstitucionMediaDto.prototype, "banner_media_id", void 0);
//# sourceMappingURL=media.dto.js.map