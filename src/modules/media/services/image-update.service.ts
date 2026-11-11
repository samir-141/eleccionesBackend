import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { getSupabaseAdminClient } from '../../../lib/supabase/client';
import {
  deleteFilesFromStorage,
  getPublicFileUrl,
  uploadBufferToStorage,
} from '../../../lib/supabase/storage';
import { MediaCategoria } from '../../../lib/supabase/storage-config';
import { VerifiedActor } from '../../../lib/auth/token.utils';
import { UpdateMediaDto } from '../dto/media.dto';
import { ImageValidationService, UploadedBinaryFile } from './image-validation.service';
import { MediaEntityLinkerHelper } from './media-entity-linker.helper';

@Injectable()
export class ImageUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly validator: ImageValidationService,
    private readonly linker: MediaEntityLinkerHelper,
  ) {}

  /**
   * Reemplaza físicamente el archivo binario en Supabase Storage y actualiza sus referencias en BD.
   */
  async replaceImage(params: {
    mediaId: string;
    file: UploadedBinaryFile | undefined;
    actor: VerifiedActor;
    ip: string;
  }) {
    const { mediaId, file, actor, ip } = params;

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
          'Permiso denegado: solo puedes reemplazar tu propia imagen de perfil.',
        );
      }
    }

    const validated = this.validator.validateAndPrepare({
      file,
      actor,
      categoria: existing.categoria as MediaCategoria,
      entidadTipo: existing.entidad_tipo || undefined,
      entidadId: existing.entidad_id || undefined,
      eleccionId: existing.eleccion_id || undefined,
    });

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      throw new ServiceUnavailableException(
        'Supabase Storage no está configurado para reemplazar archivos.',
      );
    }

    const bucketAnterior = existing.bucket;
    const rutaAnterior = existing.ruta_archivo;
    const nombreOriginalAnterior = existing.nombre_original;

    // 1. Subir nuevo archivo primero con nombre interno único (evita problemas de caché CDN)
    await uploadBufferToStorage(
      adminClient,
      validated.bucket,
      validated.rutaArchivo,
      validated.buffer,
      validated.detectedMime,
      false,
    );

    const nuevaUrlPublica = validated.esPrivado
      ? null
      : getPublicFileUrl(adminClient, validated.bucket, validated.rutaArchivo);

    try {
      // 2. Actualizar registro en BD y propagar URL pública a entidades dependientes
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

      // 3. Limpiar archivo anterior en Supabase Storage si cambió la ruta
      if (rutaAnterior !== validated.rutaArchivo || bucketAnterior !== validated.bucket) {
        await deleteFilesFromStorage(adminClient, bucketAnterior, [rutaAnterior]);
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
    } catch (err) {
      // Rollback del nuevo objeto si la BD falló
      await deleteFilesFromStorage(adminClient, validated.bucket, [validated.rutaArchivo]);
      throw err;
    }
  }

  /**
   * Actualiza metadatos o vincula una imagen ya existente en biblioteca con una entidad.
   */
  async updateMetadata(params: {
    mediaId: string;
    dto: UpdateMediaDto;
    actor: VerifiedActor;
    ip: string;
  }) {
    const { mediaId, dto, actor, ip } = params;

    if (actor.rol !== 'ADMIN') {
      throw new ForbiddenException('Solo los administradores pueden reasignar metadatos globales.');
    }

    const existing = await this.prisma.archivoMedia.findUnique({ where: { id: mediaId } });
    if (!existing) {
      throw new NotFoundException(`Archivo multimedia con ID ${mediaId} no encontrado.`);
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
}
