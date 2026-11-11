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
exports.ImageDeleteService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const auditoria_service_1 = require("../../auditoria/auditoria.service");
const client_1 = require("../../../lib/supabase/client");
const storage_1 = require("../../../lib/supabase/storage");
const media_entity_linker_helper_1 = require("./media-entity-linker.helper");
let ImageDeleteService = class ImageDeleteService {
    prisma;
    auditoria;
    linker;
    constructor(prisma, auditoria, linker) {
        this.prisma = prisma;
        this.auditoria = auditoria;
        this.linker = linker;
    }
    async deleteImage(params) {
        const { mediaId, forzar = false, actor, ip } = params;
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
                throw new common_1.ForbiddenException('Permiso denegado: no puedes eliminar imágenes de otros usuarios o listas electorales.');
            }
        }
        const usageMap = await this.linker.getUsageMap([mediaId]);
        const usadoEn = usageMap.get(mediaId) || [];
        if (usadoEn.length > 0 && !forzar) {
            throw new common_1.ConflictException({
                message: `Esta imagen está actualmente en uso en ${usadoEn.length} elemento(s). Confirma la eliminación forzada para desvincularla y eliminarla.`,
                usado_en: usadoEn,
            });
        }
        const adminClient = (0, client_1.getSupabaseAdminClient)();
        if (!adminClient) {
            throw new common_1.ServiceUnavailableException('Supabase Storage no está configurado; no es posible eliminar el archivo remoto en Storage.');
        }
        const storageRemoval = await (0, storage_1.deleteFilesFromStorage)(adminClient, existing.bucket, [
            existing.ruta_archivo,
        ]);
        if (!storageRemoval.removed) {
            throw new common_1.ServiceUnavailableException(`Error al eliminar archivo en Supabase Storage: ${storageRemoval.error}`);
        }
        await this.linker.clearEntityReferences(mediaId);
        await this.prisma.archivoMedia.delete({ where: { id: mediaId } });
        await this.auditoria.registrar({
            eleccion_id: existing.eleccion_id || undefined,
            actor_tipo: actor.rol,
            actor_id: actor.actorId,
            accion: 'ELIMINAR_IMAGEN_STORAGE',
            entidad: 'archivo_media',
            entidad_id: mediaId,
            datos_antes: {
                nombre_original: existing.nombre_original,
                bucket: existing.bucket,
                ruta_archivo: existing.ruta_archivo,
                usado_en: usadoEn.map((u) => u.etiqueta),
            },
            ip,
        });
        return {
            success: true,
            id: mediaId,
            message: `Imagen "${existing.nombre_original}" eliminada de Supabase Storage y de la base de datos.`,
        };
    }
};
exports.ImageDeleteService = ImageDeleteService;
exports.ImageDeleteService = ImageDeleteService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService,
        media_entity_linker_helper_1.MediaEntityLinkerHelper])
], ImageDeleteService);
//# sourceMappingURL=image-delete.service.js.map