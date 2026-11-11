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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const media_auth_guard_1 = require("./guards/media-auth.guard");
const media_dto_1 = require("./dto/media.dto");
const supabase_diagnostics_service_1 = require("./services/supabase-diagnostics.service");
const image_upload_service_1 = require("./services/image-upload.service");
const image_update_service_1 = require("./services/image-update.service");
const image_delete_service_1 = require("./services/image-delete.service");
const media_query_service_1 = require("./services/media-query.service");
const prisma_service_1 = require("../../database/prisma.service");
let MediaController = class MediaController {
    diagnosticsService;
    uploadService;
    updateService;
    deleteService;
    queryService;
    prisma;
    constructor(diagnosticsService, uploadService, updateService, deleteService, queryService, prisma) {
        this.diagnosticsService = diagnosticsService;
        this.uploadService = uploadService;
        this.updateService = updateService;
        this.deleteService = deleteService;
        this.queryService = queryService;
        this.prisma = prisma;
    }
    async obtenerInstitucionPublica() {
        return this.queryService.obtenerConfiguracionPublica();
    }
    async obtenerDiagnostico() {
        return this.diagnosticsService.runDiagnostics();
    }
    async inicializarBuckets() {
        return this.diagnosticsService.initializeRequiredBuckets();
    }
    async listarMedios(categoria, eleccion_id, entidad_tipo, solo_sin_uso, q) {
        return this.queryService.listar({
            categoria,
            eleccion_id,
            entidad_tipo,
            solo_sin_uso: solo_sin_uso === 'true' || solo_sin_uso === '1',
            q,
        });
    }
    async actualizarConfiguracionInstitucional(dto, req, ip) {
        return this.queryService.actualizarConfiguracionInstitucional(dto, req.actor, ip);
    }
    async obtenerDetalle(id) {
        return this.queryService.obtenerPorId(id);
    }
    async obtenerUrlFirmada(id, req) {
        return this.queryService.generarUrlFirmada(id, req.actor);
    }
    async subirImagen(file, dto, req, ip) {
        return this.uploadService.uploadImage({
            file: file,
            dto,
            actor: req.actor,
            ip,
        });
    }
    async reemplazarImagen(id, file, req, ip) {
        return this.updateService.replaceImage({
            mediaId: id,
            file: file,
            actor: req.actor,
            ip,
        });
    }
    async actualizarMetadatos(id, dto, req, ip) {
        return this.updateService.updateMetadata({
            mediaId: id,
            dto,
            actor: req.actor,
            ip,
        });
    }
    async eliminarImagen(id, forzar, req, ip) {
        return this.deleteService.deleteImage({
            mediaId: id,
            forzar: forzar === 'true' || forzar === '1',
            actor: req.actor,
            ip,
        });
    }
    async obtenerMiAvatar(req) {
        if (!req.actor.docenteId) {
            throw new common_1.BadRequestException('Identificador de docente ausente en el token.');
        }
        const docente = await this.prisma.docente.findUnique({
            where: { id: req.actor.docenteId },
            select: { id: true, username: true, avatar_media_id: true },
        });
        if (!docente?.avatar_media_id) {
            return { tiene_avatar: false, url: null, media: null };
        }
        const media = await this.queryService.obtenerPorId(docente.avatar_media_id);
        return {
            tiene_avatar: true,
            url: media.url_visualizacion,
            media,
        };
    }
    async subirMiAvatar(file, req, ip) {
        if (!req.actor.docenteId) {
            throw new common_1.BadRequestException('Identificador de docente ausente en el token.');
        }
        const docente = await this.prisma.docente.findUnique({
            where: { id: req.actor.docenteId },
            select: { id: true, eleccion_id: true, avatar_media_id: true },
        });
        if (!docente) {
            throw new common_1.BadRequestException('Docente no encontrado.');
        }
        if (docente.avatar_media_id) {
            return this.updateService.replaceImage({
                mediaId: docente.avatar_media_id,
                file: file,
                actor: req.actor,
                ip,
            });
        }
        return this.uploadService.uploadImage({
            file: file,
            dto: {
                categoria: 'usuarios',
                entidad_tipo: 'docente',
                entidad_id: docente.id,
                eleccion_id: docente.eleccion_id,
                alt_text: `Foto de perfil docente ${req.actor.username}`,
            },
            actor: req.actor,
            ip,
        });
    }
    async eliminarMiAvatar(req, ip) {
        if (!req.actor.docenteId) {
            throw new common_1.BadRequestException('Identificador de docente ausente en el token.');
        }
        const docente = await this.prisma.docente.findUnique({
            where: { id: req.actor.docenteId },
            select: { avatar_media_id: true },
        });
        if (!docente?.avatar_media_id) {
            return { success: true, message: 'No tienes un avatar registrado actualmente.' };
        }
        return this.deleteService.deleteImage({
            mediaId: docente.avatar_media_id,
            forzar: true,
            actor: req.actor,
            ip,
        });
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Get)('api/public/media/institucion'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "obtenerInstitucionPublica", null);
__decorate([
    (0, common_1.Get)('api/admin/media/diagnostico'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "obtenerDiagnostico", null);
__decorate([
    (0, common_1.Post)('api/admin/media/diagnostico/inicializar-buckets'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "inicializarBuckets", null);
__decorate([
    (0, common_1.Get)('api/admin/media'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN'),
    __param(0, (0, common_1.Query)('categoria')),
    __param(1, (0, common_1.Query)('eleccion_id')),
    __param(2, (0, common_1.Query)('entidad_tipo')),
    __param(3, (0, common_1.Query)('solo_sin_uso')),
    __param(4, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "listarMedios", null);
__decorate([
    (0, common_1.Put)('api/admin/media/institucion/configuracion'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [media_dto_1.UpdateInstitucionMediaDto, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "actualizarConfiguracionInstitucional", null);
__decorate([
    (0, common_1.Get)('api/admin/media/:id'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "obtenerDetalle", null);
__decorate([
    (0, common_1.Get)('api/admin/media/:id/signed-url'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN', 'DOCENTE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "obtenerUrlFirmada", null);
__decorate([
    (0, common_1.Post)('api/admin/media/upload'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 15 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, media_dto_1.UploadMediaMetadataDto, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "subirImagen", null);
__decorate([
    (0, common_1.Put)('api/admin/media/:id/replace'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 15 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "reemplazarImagen", null);
__decorate([
    (0, common_1.Patch)('api/admin/media/:id'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, media_dto_1.UpdateMediaDto, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "actualizarMetadatos", null);
__decorate([
    (0, common_1.Delete)('api/admin/media/:id'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('forzar')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "eliminarImagen", null);
__decorate([
    (0, common_1.Get)('api/docente/media/avatar'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('DOCENTE'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "obtenerMiAvatar", null);
__decorate([
    (0, common_1.Post)('api/docente/media/avatar'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('DOCENTE'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 15 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "subirMiAvatar", null);
__decorate([
    (0, common_1.Delete)('api/docente/media/avatar'),
    (0, common_1.UseGuards)(media_auth_guard_1.MediaAuthGuard),
    (0, media_auth_guard_1.RequireMediaRoles)('DOCENTE'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "eliminarMiAvatar", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [supabase_diagnostics_service_1.SupabaseDiagnosticsService,
        image_upload_service_1.ImageUploadService,
        image_update_service_1.ImageUpdateService,
        image_delete_service_1.ImageDeleteService,
        media_query_service_1.MediaQueryService,
        prisma_service_1.PrismaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map