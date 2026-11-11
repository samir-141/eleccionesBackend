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
exports.MediaQueryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const auditoria_service_1 = require("../../auditoria/auditoria.service");
const media_entity_linker_helper_1 = require("./media-entity-linker.helper");
let MediaQueryService = class MediaQueryService {
    prisma;
    auditoria;
    linker;
    constructor(prisma, auditoria, linker) {
        this.prisma = prisma;
        this.auditoria = auditoria;
        this.linker = linker;
    }
    async listar(filtros = {}) {
        const where = {};
        if (filtros.categoria && filtros.categoria !== 'todas') {
            where.categoria = filtros.categoria;
        }
        if (filtros.eleccion_id) {
            where.eleccion_id = filtros.eleccion_id;
        }
        if (filtros.entidad_tipo) {
            where.entidad_tipo = filtros.entidad_tipo;
        }
        if (filtros.q?.trim()) {
            const q = filtros.q.trim();
            where.OR = [
                { nombre_original: { contains: q, mode: 'insensitive' } },
                { nombre_interno: { contains: q, mode: 'insensitive' } },
                { alt_text: { contains: q, mode: 'insensitive' } },
                { ruta_archivo: { contains: q, mode: 'insensitive' } },
            ];
        }
        const items = await this.prisma.archivoMedia.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
        const usageMap = await this.linker.getUsageMap(items.map((i) => i.id));
        const enriched = await Promise.all(items.map(async (item) => {
            const usado_en = usageMap.get(item.id) || [];
            const en_uso = usado_en.length > 0;
            const url_visualizacion = await this.linker.resolveDisplayUrl(item);
            return {
                ...item,
                en_uso,
                usado_en,
                url_visualizacion,
            };
        }));
        const resultado = filtros.solo_sin_uso
            ? enriched.filter((item) => !item.en_uso)
            : enriched;
        const totalBytes = items.reduce((sum, i) => sum + i.tamano_bytes, 0);
        const totalSinUso = enriched.filter((i) => !i.en_uso).length;
        return {
            items: resultado,
            resumen: {
                total: items.length,
                en_uso: items.length - totalSinUso,
                sin_uso: totalSinUso,
                total_bytes: totalBytes,
            },
        };
    }
    async obtenerPorId(id) {
        const media = await this.prisma.archivoMedia.findUnique({ where: { id } });
        if (!media) {
            throw new common_1.NotFoundException(`Imagen con ID ${id} no encontrada.`);
        }
        const usageMap = await this.linker.getUsageMap([id]);
        const usado_en = usageMap.get(id) || [];
        const url_visualizacion = await this.linker.resolveDisplayUrl(media);
        return {
            ...media,
            en_uso: usado_en.length > 0,
            usado_en,
            url_visualizacion,
        };
    }
    async generarUrlFirmada(id, actor) {
        const media = await this.prisma.archivoMedia.findUnique({ where: { id } });
        if (!media) {
            throw new common_1.NotFoundException(`Imagen con ID ${id} no encontrada.`);
        }
        if (actor.rol === 'DOCENTE') {
            if (media.es_privado && (media.entidad_tipo !== 'docente' || media.entidad_id !== actor.docenteId)) {
                throw new common_1.ForbiddenException('Permiso denegado: no puedes obtener URLs firmadas de archivos privados de otro usuario.');
            }
        }
        const signedUrl = await this.linker.resolveDisplayUrl(media);
        return {
            id: media.id,
            es_privado: media.es_privado,
            url: signedUrl,
        };
    }
    async obtenerConfiguracionPublica() {
        let config = await this.prisma.configuracionInstitucional.findUnique({
            where: { clave: 'global' },
        });
        if (!config) {
            config = await this.prisma.configuracionInstitucional.create({
                data: { clave: 'global' },
            });
        }
        const materialElectoral = await this.prisma.archivoMedia.findMany({
            where: {
                categoria: 'material-electoral',
                es_privado: false,
            },
            orderBy: { created_at: 'desc' },
            take: 8,
            select: {
                id: true,
                nombre_original: true,
                url_publica: true,
                alt_text: true,
                created_at: true,
            },
        });
        return {
            institucion: config,
            material_electoral: materialElectoral.filter((m) => Boolean(m.url_publica)),
        };
    }
    async actualizarConfiguracionInstitucional(dto, actor, ip) {
        let existing = await this.prisma.configuracionInstitucional.findUnique({
            where: { clave: 'global' },
        });
        if (!existing) {
            existing = await this.prisma.configuracionInstitucional.create({
                data: { clave: 'global' },
            });
        }
        let logoUrl = existing.logo_url;
        let logoMediaId = existing.logo_media_id;
        if (dto.logo_media_id !== undefined) {
            if (dto.logo_media_id === null) {
                logoUrl = null;
                logoMediaId = null;
            }
            else {
                const media = await this.prisma.archivoMedia.findUnique({ where: { id: dto.logo_media_id } });
                if (!media || media.es_privado || !media.url_publica) {
                    throw new common_1.NotFoundException('El logotipo institucional debe ser una imagen pública válida.');
                }
                logoUrl = media.url_publica;
                logoMediaId = media.id;
            }
        }
        let bannerUrl = existing.banner_url;
        let bannerMediaId = existing.banner_media_id;
        if (dto.banner_media_id !== undefined) {
            if (dto.banner_media_id === null) {
                bannerUrl = null;
                bannerMediaId = null;
            }
            else {
                const media = await this.prisma.archivoMedia.findUnique({ where: { id: dto.banner_media_id } });
                if (!media || media.es_privado || !media.url_publica) {
                    throw new common_1.NotFoundException('El banner institucional debe ser una imagen pública válida.');
                }
                bannerUrl = media.url_publica;
                bannerMediaId = media.id;
            }
        }
        const updated = await this.prisma.configuracionInstitucional.update({
            where: { clave: 'global' },
            data: {
                ...(dto.nombre_institucion !== undefined ? { nombre_institucion: dto.nombre_institucion.trim() } : {}),
                ...(dto.subtitulo !== undefined ? { subtitulo: dto.subtitulo.trim() } : {}),
                ...(dto.titulo_portada !== undefined ? { titulo_portada: dto.titulo_portada.trim() } : {}),
                logo_media_id: logoMediaId,
                logo_url: logoUrl,
                banner_media_id: bannerMediaId,
                banner_url: bannerUrl,
            },
        });
        await this.auditoria.registrar({
            actor_tipo: actor.rol,
            actor_id: actor.actorId,
            accion: 'ACTUALIZAR_IDENTIDAD_INSTITUCIONAL',
            entidad: 'configuracion_institucional',
            entidad_id: updated.id,
            datos_despues: {
                nombre_institucion: updated.nombre_institucion,
                logo_media_id: updated.logo_media_id,
                banner_media_id: updated.banner_media_id,
            },
            ip,
        });
        return updated;
    }
};
exports.MediaQueryService = MediaQueryService;
exports.MediaQueryService = MediaQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService,
        media_entity_linker_helper_1.MediaEntityLinkerHelper])
], MediaQueryService);
//# sourceMappingURL=media-query.service.js.map