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
exports.ImageUploadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const auditoria_service_1 = require("../../auditoria/auditoria.service");
const client_1 = require("../../../lib/supabase/client");
const storage_1 = require("../../../lib/supabase/storage");
const image_validation_service_1 = require("./image-validation.service");
const media_entity_linker_helper_1 = require("./media-entity-linker.helper");
let ImageUploadService = class ImageUploadService {
    prisma;
    auditoria;
    validator;
    linker;
    constructor(prisma, auditoria, validator, linker) {
        this.prisma = prisma;
        this.auditoria = auditoria;
        this.validator = validator;
        this.linker = linker;
    }
    async uploadImage(params) {
        const { file, dto, actor, ip } = params;
        const validated = this.validator.validateAndPrepare({
            file,
            actor,
            categoria: dto.categoria,
            entidadTipo: dto.entidad_tipo,
            entidadId: dto.entidad_id,
            eleccionId: dto.eleccion_id,
        });
        if (dto.eleccion_id) {
            const eleccionExiste = await this.prisma.eleccion.findUnique({
                where: { id: dto.eleccion_id },
                select: { id: true },
            });
            if (!eleccionExiste) {
                throw new common_1.BadRequestException(`Elección con ID ${dto.eleccion_id} no encontrada.`);
            }
        }
        const existingDuplicate = await this.prisma.archivoMedia.findFirst({
            where: {
                bucket: validated.bucket,
                categoria: dto.categoria,
                checksum_sha256: validated.checksumSha256,
                ...(dto.entidad_tipo ? { entidad_tipo: dto.entidad_tipo } : {}),
                ...(dto.entidad_id ? { entidad_id: dto.entidad_id } : {}),
                ...(dto.eleccion_id ? { eleccion_id: dto.eleccion_id } : {}),
            },
        });
        if (existingDuplicate) {
            throw new common_1.ConflictException(`Esta imagen ya fue registrada previamente (${existingDuplicate.nombre_original}). Puedes seleccionarla desde la biblioteca sin duplicar almacenamiento.`);
        }
        const adminClient = (0, client_1.getSupabaseAdminClient)();
        if (!adminClient) {
            throw new common_1.ServiceUnavailableException('Supabase Storage no está configurado en el servidor. Revisa el diagnóstico para configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env.');
        }
        await (0, storage_1.uploadBufferToStorage)(adminClient, validated.bucket, validated.rutaArchivo, validated.buffer, validated.detectedMime, false);
        const urlPublica = validated.esPrivado
            ? null
            : (0, storage_1.getPublicFileUrl)(adminClient, validated.bucket, validated.rutaArchivo);
        try {
            const media = await this.prisma.archivoMedia.create({
                data: {
                    nombre_original: validated.nombreOriginal,
                    nombre_interno: validated.nombreInterno,
                    bucket: validated.bucket,
                    ruta_archivo: validated.rutaArchivo,
                    url_publica: urlPublica,
                    es_privado: validated.esPrivado,
                    mime_type: validated.detectedMime,
                    tamano_bytes: validated.tamanoBytes,
                    checksum_sha256: validated.checksumSha256,
                    categoria: dto.categoria,
                    entidad_tipo: dto.entidad_tipo || null,
                    entidad_id: dto.entidad_id || null,
                    eleccion_id: dto.eleccion_id || null,
                    subido_por: actor.actorId,
                    alt_text: dto.alt_text?.trim() || null,
                },
            });
            if (dto.entidad_tipo) {
                await this.linker.linkMediaToEntity({
                    mediaId: media.id,
                    urlPublica,
                    esPrivado: validated.esPrivado,
                    entidadTipo: dto.entidad_tipo,
                    entidadId: dto.entidad_id,
                });
            }
            await this.auditoria.registrar({
                eleccion_id: dto.eleccion_id || undefined,
                actor_tipo: actor.rol,
                actor_id: actor.actorId,
                accion: 'SUBIR_IMAGEN_STORAGE',
                entidad: 'archivo_media',
                entidad_id: media.id,
                datos_despues: {
                    nombre_original: media.nombre_original,
                    nombre_interno: media.nombre_interno,
                    bucket: media.bucket,
                    ruta_archivo: media.ruta_archivo,
                    categoria: media.categoria,
                    tamano_bytes: media.tamano_bytes,
                    es_privado: media.es_privado,
                },
                ip,
            });
            const urlVisualizacion = await this.linker.resolveDisplayUrl(media);
            return {
                ...media,
                url_visualizacion: urlVisualizacion,
                en_uso: Boolean(dto.entidad_tipo && dto.entidad_id) ||
                    dto.entidad_tipo === 'institucion_logo' ||
                    dto.entidad_tipo === 'institucion_banner',
            };
        }
        catch (dbErr) {
            await (0, storage_1.deleteFilesFromStorage)(adminClient, validated.bucket, [validated.rutaArchivo]);
            throw dbErr;
        }
    }
};
exports.ImageUploadService = ImageUploadService;
exports.ImageUploadService = ImageUploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService,
        image_validation_service_1.ImageValidationService,
        media_entity_linker_helper_1.MediaEntityLinkerHelper])
], ImageUploadService);
//# sourceMappingURL=image-upload.service.js.map