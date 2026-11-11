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
exports.ImageUpdateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const auditoria_service_1 = require("../../auditoria/auditoria.service");
const client_1 = require("../../../lib/supabase/client");
const storage_1 = require("../../../lib/supabase/storage");
const image_validation_service_1 = require("./image-validation.service");
const media_entity_linker_helper_1 = require("./media-entity-linker.helper");
let ImageUpdateService = class ImageUpdateService {
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
    async replaceImage(params) {
        const { mediaId, file, actor, ip } = params;
        const existing = await this.prisma.archivoMedia.findUnique({
            where: { id: mediaId },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Archivo multimedia con ID ${mediaId} no encontrado.`);
        }
        if (actor.rol === 'DOCENTE') {
            if (existing.categoria !== 'usuarios' ||
                existing.entidad_tipo !== 'docente' ||
                existing.entidad_id !== actor.docenteId) {
                throw new common_1.ForbiddenException('Permiso denegado: solo puedes reemplazar tu propia imagen de perfil.');
            }
        }
        const validated = this.validator.validateAndPrepare({
            file,
            actor,
            categoria: existing.categoria,
            entidadTipo: existing.entidad_tipo || undefined,
            entidadId: existing.entidad_id || undefined,
            eleccionId: existing.eleccion_id || undefined,
        });
        const adminClient = (0, client_1.getSupabaseAdminClient)();
        if (!adminClient) {
            throw new common_1.ServiceUnavailableException('Supabase Storage no está configurado para reemplazar archivos.');
        }
        const bucketAnterior = existing.bucket;
        const rutaAnterior = existing.ruta_archivo;
        const nombreOriginalAnterior = existing.nombre_original;
        await (0, storage_1.uploadBufferToStorage)(adminClient, validated.bucket, validated.rutaArchivo, validated.buffer, validated.detectedMime, false);
        const nuevaUrlPublica = validated.esPrivado
            ? null
            : (0, storage_1.getPublicFileUrl)(adminClient, validated.bucket, validated.rutaArchivo);
        try {
            const updated = await this.prisma.archivoMedia.update({
                where: { id: mediaId },
                data: {
                    nombre_original: validated.nombreOriginal,
                    nombre_interno: validated.nombreInterno,
                    bucket: validated.bucket,
                    ruta_archivo: validated.rutaArchivo,
                    url_publica: nuevaUrlPublica,
                    mime_type: validated.detectedMime,
                    tamano_bytes: validated.tamanoBytes,
                    checksum_sha256: validated.checksumSha256,
                    subido_por: actor.actorId,
                },
            });
            if (!validated.esPrivado) {
                await this.linker.propagateUpdatedUrl(mediaId, nuevaUrlPublica);
            }
            if (rutaAnterior !== validated.rutaArchivo || bucketAnterior !== validated.bucket) {
                await (0, storage_1.deleteFilesFromStorage)(adminClient, bucketAnterior, [rutaAnterior]);
            }
            await this.auditoria.registrar({
                eleccion_id: existing.eleccion_id || undefined,
                actor_tipo: actor.rol,
                actor_id: actor.actorId,
                accion: 'REEMPLAZAR_IMAGEN_STORAGE',
                entidad: 'archivo_media',
                entidad_id: mediaId,
                datos_antes: {
                    nombre_original: nombreOriginalAnterior,
                    ruta_archivo: rutaAnterior,
                },
                datos_despues: {
                    nombre_original: updated.nombre_original,
                    ruta_archivo: updated.ruta_archivo,
                },
                ip,
            });
            const urlVisualizacion = await this.linker.resolveDisplayUrl(updated);
            return {
                ...updated,
                url_visualizacion: urlVisualizacion,
            };
        }
        catch (err) {
            await (0, storage_1.deleteFilesFromStorage)(adminClient, validated.bucket, [validated.rutaArchivo]);
            throw err;
        }
    }
    async updateMetadata(params) {
        const { mediaId, dto, actor, ip } = params;
        if (actor.rol !== 'ADMIN') {
            throw new common_1.ForbiddenException('Solo los administradores pueden reasignar metadatos globales.');
        }
        const existing = await this.prisma.archivoMedia.findUnique({ where: { id: mediaId } });
        if (!existing) {
            throw new common_1.NotFoundException(`Archivo multimedia con ID ${mediaId} no encontrado.`);
        }
        const updated = await this.prisma.archivoMedia.update({
            where: { id: mediaId },
            data: {
                ...(dto.alt_text !== undefined ? { alt_text: dto.alt_text.trim() || null } : {}),
                ...(dto.entidad_tipo !== undefined ? { entidad_tipo: dto.entidad_tipo || null } : {}),
                ...(dto.entidad_id !== undefined ? { entidad_id: dto.entidad_id || null } : {}),
                ...(dto.eleccion_id !== undefined ? { eleccion_id: dto.eleccion_id || null } : {}),
            },
        });
        if (dto.entidad_tipo) {
            await this.linker.linkMediaToEntity({
                mediaId: updated.id,
                urlPublica: updated.url_publica,
                esPrivado: updated.es_privado,
                entidadTipo: dto.entidad_tipo,
                entidadId: dto.entidad_id,
            });
        }
        await this.auditoria.registrar({
            eleccion_id: updated.eleccion_id || undefined,
            actor_tipo: actor.rol,
            actor_id: actor.actorId,
            accion: 'ACTUALIZAR_METADATA_IMAGEN',
            entidad: 'archivo_media',
            entidad_id: mediaId,
            datos_antes: { alt_text: existing.alt_text, entidad_tipo: existing.entidad_tipo, entidad_id: existing.entidad_id },
            datos_despues: { alt_text: updated.alt_text, entidad_tipo: updated.entidad_tipo, entidad_id: updated.entidad_id },
            ip,
        });
        const urlVisualizacion = await this.linker.resolveDisplayUrl(updated);
        return {
            ...updated,
            url_visualizacion: urlVisualizacion,
        };
    }
};
exports.ImageUpdateService = ImageUpdateService;
exports.ImageUpdateService = ImageUpdateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService,
        image_validation_service_1.ImageValidationService,
        media_entity_linker_helper_1.MediaEntityLinkerHelper])
], ImageUpdateService);
//# sourceMappingURL=image-update.service.js.map