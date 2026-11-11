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
exports.MediaEntityLinkerHelper = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("../../../lib/supabase/client");
const storage_1 = require("../../../lib/supabase/storage");
const storage_config_1 = require("../../../lib/supabase/storage-config");
let MediaEntityLinkerHelper = class MediaEntityLinkerHelper {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveDisplayUrl(media) {
        if (!media.es_privado) {
            return media.url_publica;
        }
        const adminClient = (0, client_1.getSupabaseAdminClient)();
        if (!adminClient)
            return null;
        const { signedUrlTtlSeconds } = (0, storage_config_1.getStorageConfig)();
        return (0, storage_1.createSignedFileUrl)(adminClient, media.bucket, media.ruta_archivo, signedUrlTtlSeconds);
    }
    async linkMediaToEntity(params) {
        const tipo = (params.entidadTipo || '').trim().toLowerCase();
        const entidadId = params.entidadId?.trim();
        if (!tipo)
            return;
        if (tipo === 'partido') {
            if (!entidadId)
                throw new common_1.BadRequestException('entidad_id requerido para vincular logotipo a un partido.');
            if (params.esPrivado) {
                throw new common_1.BadRequestException('El logotipo de un partido debe provenir del bucket público para mostrarse en la cédula.');
            }
            await this.prisma.partido.update({
                where: { id: entidadId },
                data: {
                    logo_media_id: params.mediaId,
                    logo_url: params.urlPublica,
                },
            });
            return;
        }
        if (tipo === 'candidato') {
            if (!entidadId)
                throw new common_1.BadRequestException('entidad_id requerido para vincular fotografía a un candidato.');
            if (params.esPrivado) {
                throw new common_1.BadRequestException('La fotografía de un candidato debe provenir del bucket público.');
            }
            await this.prisma.candidato.update({
                where: { id: entidadId },
                data: {
                    foto_media_id: params.mediaId,
                    foto_url: params.urlPublica,
                },
            });
            return;
        }
        if (tipo === 'docente') {
            if (!entidadId)
                throw new common_1.BadRequestException('entidad_id requerido para vincular avatar a un docente.');
            await this.prisma.docente.update({
                where: { id: entidadId },
                data: {
                    avatar_media_id: params.mediaId,
                },
            });
            return;
        }
        if (tipo === 'eleccion') {
            if (!entidadId)
                throw new common_1.BadRequestException('entidad_id requerido para vincular banner a una elección.');
            if (params.esPrivado) {
                throw new common_1.BadRequestException('El banner electoral debe provenir del bucket público.');
            }
            await this.prisma.eleccion.update({
                where: { id: entidadId },
                data: {
                    banner_media_id: params.mediaId,
                    banner_url: params.urlPublica,
                },
            });
            return;
        }
        if (tipo === 'institucion_logo' || tipo === 'institucion_banner') {
            if (params.esPrivado) {
                throw new common_1.BadRequestException('La imagen institucional pública debe provenir del bucket público.');
            }
            const existing = await this.prisma.configuracionInstitucional.findUnique({
                where: { clave: 'global' },
            });
            if (!existing) {
                await this.prisma.configuracionInstitucional.create({
                    data: {
                        clave: 'global',
                        ...(tipo === 'institucion_logo'
                            ? { logo_media_id: params.mediaId, logo_url: params.urlPublica }
                            : { banner_media_id: params.mediaId, banner_url: params.urlPublica }),
                    },
                });
            }
            else {
                await this.prisma.configuracionInstitucional.update({
                    where: { clave: 'global' },
                    data: tipo === 'institucion_logo'
                        ? { logo_media_id: params.mediaId, logo_url: params.urlPublica }
                        : { banner_media_id: params.mediaId, banner_url: params.urlPublica },
                });
            }
        }
    }
    async propagateUpdatedUrl(mediaId, nuevaUrlPublica) {
        await Promise.all([
            this.prisma.partido.updateMany({
                where: { logo_media_id: mediaId },
                data: { logo_url: nuevaUrlPublica },
            }),
            this.prisma.candidato.updateMany({
                where: { foto_media_id: mediaId },
                data: { foto_url: nuevaUrlPublica },
            }),
            this.prisma.eleccion.updateMany({
                where: { banner_media_id: mediaId },
                data: { banner_url: nuevaUrlPublica },
            }),
            this.prisma.configuracionInstitucional.updateMany({
                where: { logo_media_id: mediaId },
                data: { logo_url: nuevaUrlPublica },
            }),
            this.prisma.configuracionInstitucional.updateMany({
                where: { banner_media_id: mediaId },
                data: { banner_url: nuevaUrlPublica },
            }),
        ]);
    }
    async clearEntityReferences(mediaId) {
        await Promise.all([
            this.prisma.partido.updateMany({
                where: { logo_media_id: mediaId },
                data: { logo_media_id: null, logo_url: null },
            }),
            this.prisma.candidato.updateMany({
                where: { foto_media_id: mediaId },
                data: { foto_media_id: null, foto_url: null },
            }),
            this.prisma.docente.updateMany({
                where: { avatar_media_id: mediaId },
                data: { avatar_media_id: null },
            }),
            this.prisma.eleccion.updateMany({
                where: { banner_media_id: mediaId },
                data: { banner_media_id: null, banner_url: null },
            }),
            this.prisma.configuracionInstitucional.updateMany({
                where: { logo_media_id: mediaId },
                data: { logo_media_id: null, logo_url: null },
            }),
            this.prisma.configuracionInstitucional.updateMany({
                where: { banner_media_id: mediaId },
                data: { banner_media_id: null, banner_url: null },
            }),
        ]);
    }
    async getUsageMap(mediaIds) {
        const map = new Map();
        if (!mediaIds.length)
            return map;
        const addRef = (mediaId, ref) => {
            const list = map.get(mediaId) || [];
            list.push(ref);
            map.set(mediaId, list);
        };
        const [partidos, candidatos, docentes, elecciones, insts] = await Promise.all([
            this.prisma.partido.findMany({
                where: { logo_media_id: { in: mediaIds } },
                select: { id: true, nombre: true, numero_lista: true, logo_media_id: true },
            }),
            this.prisma.candidato.findMany({
                where: { foto_media_id: { in: mediaIds } },
                select: { id: true, nombres: true, apellidos: true, cargo: true, foto_media_id: true },
            }),
            this.prisma.docente.findMany({
                where: { avatar_media_id: { in: mediaIds } },
                select: { id: true, username: true, avatar_media_id: true },
            }),
            this.prisma.eleccion.findMany({
                where: { banner_media_id: { in: mediaIds } },
                select: { id: true, nombre: true, banner_media_id: true },
            }),
            this.prisma.configuracionInstitucional.findMany({
                where: {
                    OR: [
                        { logo_media_id: { in: mediaIds } },
                        { banner_media_id: { in: mediaIds } },
                    ],
                },
                select: { id: true, nombre_institucion: true, logo_media_id: true, banner_media_id: true },
            }),
        ]);
        for (const p of partidos) {
            if (p.logo_media_id) {
                addRef(p.logo_media_id, {
                    tipo: 'partido',
                    id: p.id,
                    etiqueta: `Partido Lista #${p.numero_lista}: ${p.nombre}`,
                });
            }
        }
        for (const c of candidatos) {
            if (c.foto_media_id) {
                addRef(c.foto_media_id, {
                    tipo: 'candidato',
                    id: c.id,
                    etiqueta: `Candidato: ${c.nombres} ${c.apellidos} (${c.cargo})`,
                });
            }
        }
        for (const d of docentes) {
            if (d.avatar_media_id) {
                addRef(d.avatar_media_id, {
                    tipo: 'docente',
                    id: d.id,
                    etiqueta: `Perfil Docente: ${d.username}`,
                });
            }
        }
        for (const el of elecciones) {
            if (el.banner_media_id) {
                addRef(el.banner_media_id, {
                    tipo: 'eleccion',
                    id: el.id,
                    etiqueta: `Banner Elección: ${el.nombre}`,
                });
            }
        }
        for (const ins of insts) {
            if (ins.logo_media_id && mediaIds.includes(ins.logo_media_id)) {
                addRef(ins.logo_media_id, {
                    tipo: 'institucion',
                    id: ins.id,
                    etiqueta: `Logo Institucional (${ins.nombre_institucion})`,
                });
            }
            if (ins.banner_media_id && mediaIds.includes(ins.banner_media_id)) {
                addRef(ins.banner_media_id, {
                    tipo: 'institucion',
                    id: ins.id,
                    etiqueta: `Banner Principal (${ins.nombre_institucion})`,
                });
            }
        }
        return map;
    }
};
exports.MediaEntityLinkerHelper = MediaEntityLinkerHelper;
exports.MediaEntityLinkerHelper = MediaEntityLinkerHelper = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MediaEntityLinkerHelper);
//# sourceMappingURL=media-entity-linker.helper.js.map