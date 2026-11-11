import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { getSupabaseAdminClient } from '../../../lib/supabase/client';
import { deleteFilesFromStorage } from '../../../lib/supabase/storage';
import { VerifiedActor } from '../../../lib/auth/token.utils';
import { MediaEntityLinkerHelper } from './media-entity-linker.helper';

@Injectable()
export class ImageDeleteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly linker: MediaEntityLinkerHelper,
  ) {}

  async deleteImage(params: {
    mediaId: string;
    forzar?: boolean;
    actor: VerifiedActor;
    ip: string;
  }) {
    const { mediaId, forzar = false, actor, ip } = params;

    const existing = await this.prisma.archivoMedia.findUnique({
      where: { id: mediaId },
    });
    if (!existing) {
      throw new NotFoundException(`Archivo multimedia con ID ${mediaId} no encontrado.`);
    }

    if (actor.rol === 'DOCENTE') {
      if (
        existing.categoria !== 'usuarios' ||
        existing.entidad_tipo !== 'docente' ||
        existing.entidad_id !== actor.docenteId
      ) {
        throw new ForbiddenException(
          'Permiso denegado: no puedes eliminar imágenes de otros usuarios o listas electorales.',
        );
      }
    }

    const usageMap = await this.linker.getUsageMap([mediaId]);
    const usadoEn = usageMap.get(mediaId) || [];

    if (usadoEn.length > 0 && !forzar) {
      throw new ConflictException({
        message: `Esta imagen está actualmente en uso en ${usadoEn.length} elemento(s). Confirma la eliminación forzada para desvincularla y eliminarla.`,
        usado_en: usadoEn,
      });
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      throw new ServiceUnavailableException(
        'Supabase Storage no está configurado; no es posible eliminar el archivo remoto en Storage.',
      );
    }

    // 1. Eliminar objeto físico de Supabase Storage
    const storageRemoval = await deleteFilesFromStorage(adminClient, existing.bucket, [
      existing.ruta_archivo,
    ]);
    if (!storageRemoval.removed) {
      throw new ServiceUnavailableException(
        `Error al eliminar archivo en Supabase Storage: ${storageRemoval.error}`,
      );
    }

    // 2. Desvincular entidades dependientes y eliminar registro persistente en PostgreSQL
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
}
