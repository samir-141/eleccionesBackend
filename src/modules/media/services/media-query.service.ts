import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { VerifiedActor } from '../../../lib/auth/token.utils';
import { UpdateInstitucionMediaDto } from '../dto/media.dto';
import { MediaEntityLinkerHelper, MediaUsageRef } from './media-entity-linker.helper';

export interface MediaListFilter {
  categoria?: string;
  eleccion_id?: string;
  entidad_tipo?: string;
  solo_sin_uso?: boolean;
  q?: string;
}

@Injectable()
export class MediaQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly linker: MediaEntityLinkerHelper,
  ) {}

  async listar(filtros: MediaListFilter = {}) {
    const where: any = {};
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

    const enriched = await Promise.all(
      items.map(async (item) => {
        const usado_en: MediaUsageRef[] = usageMap.get(item.id) || [];
        const en_uso = usado_en.length > 0;
        const url_visualizacion = await this.linker.resolveDisplayUrl(item);
        return {
          ...item,
          en_uso,
          usado_en,
          url_visualizacion,
        };
      }),
    );

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

  async obtenerPorId(id: string) {
    const media = await this.prisma.archivoMedia.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Imagen con ID ${id} no encontrada.`);
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

  async generarUrlFirmada(id: string, actor: VerifiedActor) {
    const media = await this.prisma.archivoMedia.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Imagen con ID ${id} no encontrada.`);
    }

    if (actor.rol === 'DOCENTE') {
      if (media.es_privado && (media.entidad_tipo !== 'docente' || media.entidad_id !== actor.docenteId)) {
        throw new ForbiddenException(
          'Permiso denegado: no puedes obtener URLs firmadas de archivos privados de otro usuario.',
        );
      }
    }

    const signedUrl = await this.linker.resolveDisplayUrl(media);
    return {
      id: media.id,
      es_privado: media.es_privado,
      url: signedUrl,
    };
  }

  /**
   * Retorna configuración visual pública institucional + material de campaña público.
   * Nunca expone archivos privados ni URLs firmadas de usuarios.
   */
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

  async actualizarConfiguracionInstitucional(
    dto: UpdateInstitucionMediaDto,
    actor: VerifiedActor,
    ip: string,
  ) {
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
      } else {
        const media = await this.prisma.archivoMedia.findUnique({ where: { id: dto.logo_media_id } });
        if (!media || media.es_privado || !media.url_publica) {
          throw new NotFoundException('El logotipo institucional debe ser una imagen pública válida.');
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
      } else {
        const media = await this.prisma.archivoMedia.findUnique({ where: { id: dto.banner_media_id } });
        if (!media || media.es_privado || !media.url_publica) {
          throw new NotFoundException('El banner institucional debe ser una imagen pública válida.');
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
}
