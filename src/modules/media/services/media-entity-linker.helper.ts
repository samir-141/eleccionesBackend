import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { getSupabaseAdminClient } from '../../../lib/supabase/client';
import { createSignedFileUrl } from '../../../lib/supabase/storage';
import { getStorageConfig } from '../../../lib/supabase/storage-config';

export interface MediaUsageRef {
  tipo: 'partido' | 'candidato' | 'docente' | 'eleccion' | 'institucion';
  id: string;
  etiqueta: string;
}

@Injectable()
export class MediaEntityLinkerHelper {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve la URL visualizable de un ArchivoMedia.
   * Invariante de seguridad: las URLs firmadas temporales jamás se persisten en PostgreSQL;
   * se generan dinámicamente para archivos privados.
   */
  async resolveDisplayUrl(media: {
    bucket: string;
    ruta_archivo: string;
    url_publica: string | null;
    es_privado: boolean;
  }): Promise<string | null> {
    if (!media.es_privado) {
      return media.url_publica;
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) return null;

    const { signedUrlTtlSeconds } = getStorageConfig();
    return createSignedFileUrl(adminClient, media.bucket, media.ruta_archivo, signedUrlTtlSeconds);
  }

  /**
   * Vincula un ArchivoMedia existente a una entidad de negocio real del sistema electoral.
   */
  async linkMediaToEntity(params: {
    mediaId: string;
    urlPublica: string | null;
    esPrivado: boolean;
    entidadTipo?: string;
    entidadId?: string;
  }) {
    const tipo = (params.entidadTipo || '').trim().toLowerCase();
    const entidadId = params.entidadId?.trim();
    if (!tipo) return;

    if (tipo === 'partido') {
      if (!entidadId) throw new BadRequestException('entidad_id requerido para vincular logotipo a un partido.');
      if (params.esPrivado) {
        throw new BadRequestException('El logotipo de un partido debe provenir del bucket público para mostrarse en la cédula.');
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
      if (!entidadId) throw new BadRequestException('entidad_id requerido para vincular fotografía a un candidato.');
      if (params.esPrivado) {
        throw new BadRequestException('La fotografía de un candidato debe provenir del bucket público.');
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
      if (!entidadId) throw new BadRequestException('entidad_id requerido para vincular avatar a un docente.');
      await this.prisma.docente.update({
        where: { id: entidadId },
        data: {
          avatar_media_id: params.mediaId,
        },
      });
      return;
    }

    if (tipo === 'eleccion') {
      if (!entidadId) throw new BadRequestException('entidad_id requerido para vincular banner a una elección.');
      if (params.esPrivado) {
        throw new BadRequestException('El banner electoral debe provenir del bucket público.');
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
        throw new BadRequestException('La imagen institucional pública debe provenir del bucket público.');
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
      } else {
        await this.prisma.configuracionInstitucional.update({
          where: { clave: 'global' },
          data:
            tipo === 'institucion_logo'
              ? { logo_media_id: params.mediaId, logo_url: params.urlPublica }
              : { banner_media_id: params.mediaId, banner_url: params.urlPublica },
        });
      }
    }
  }

  /**
   * Propaga una nueva URL pública a todas las entidades que referencian un mediaId (ej. al reemplazar un archivo).
   */
  async propagateUpdatedUrl(mediaId: string, nuevaUrlPublica: string | null) {
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

  /**
   * Limpia las referencias en entidades relacionadas antes de eliminar un archivo media.
   */
  async clearEntityReferences(mediaId: string) {
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

  /**
   * Calcula las referencias activas en base de datos para un conjunto de IDs de archivo_media.
   */
  async getUsageMap(mediaIds: string[]): Promise<Map<string, MediaUsageRef[]>> {
    const map = new Map<string, MediaUsageRef[]>();
    if (!mediaIds.length) return map;

    const addRef = (mediaId: string, ref: MediaUsageRef) => {
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
}

