import {
  BadRequestException,
  ConflictException,
  Injectable,
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
import { VerifiedActor } from '../../../lib/auth/token.utils';
import { UploadMediaMetadataDto } from '../dto/media.dto';
import { ImageValidationService, UploadedBinaryFile } from './image-validation.service';
import { MediaEntityLinkerHelper } from './media-entity-linker.helper';

@Injectable()
export class ImageUploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly validator: ImageValidationService,
    private readonly linker: MediaEntityLinkerHelper,
  ) {}

  async uploadImage(params: {
    file: UploadedBinaryFile | undefined;
    dto: UploadMediaMetadataDto;
    actor: VerifiedActor;
    ip: string;
  }) {
    const { file, dto, actor, ip } = params;

    // 1. Validación estricta (formato real, magic bytes, SVG XSS, tamaño, I17 y permisos RBAC)
    const validated = this.validator.validateAndPrepare({
      file,
      actor,
      categoria: dto.categoria,
      entidadTipo: dto.entidad_tipo,
      entidadId: dto.entidad_id,
      eleccionId: dto.eleccion_id,
    });

    // 2. Verificar si la elección referenciada existe (cuando se envía eleccion_id)
    if (dto.eleccion_id) {
      const eleccionExiste = await this.prisma.eleccion.findUnique({
        where: { id: dto.eleccion_id },
        select: { id: true },
      });
      if (!eleccionExiste) {
        throw new BadRequestException(`Elección con ID ${dto.eleccion_id} no encontrada.`);
      }
    }

    // 3. Prevención de duplicados exactos (mismo archivo SHA-256 en el mismo bucket/entidad/categoría)
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
      throw new ConflictException(
        `Esta imagen ya fue registrada previamente (${existingDuplicate.nombre_original}). Puedes seleccionarla desde la biblioteca sin duplicar almacenamiento.`,
      );
    }

    // 4. Obtener cliente administrativo de Supabase (falla explícitamente si no está configurado)
    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      throw new ServiceUnavailableException(
        'Supabase Storage no está configurado en el servidor. Revisa el diagnóstico para configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env.',
      );
    }

    // 5. Subir binario a Supabase Storage primero (nunca registrar archivo inexistente en BD)
    await uploadBufferToStorage(
      adminClient,
      validated.bucket,
      validated.rutaArchivo,
      validated.buffer,
      validated.detectedMime,
      false,
    );

    const urlPublica = validated.esPrivado
      ? null
      : getPublicFileUrl(adminClient, validated.bucket, validated.rutaArchivo);

    // 6. Registrar referencia persistente en PostgreSQL con rollback compensatorio si falla
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

      // 7. Vincular automáticamente con entidad de destino si se especificó
      if (dto.entidad_tipo) {
        await this.linker.linkMediaToEntity({
          mediaId: media.id,
          urlPublica,
          esPrivado: validated.esPrivado,
          entidadTipo: dto.entidad_tipo,
          entidadId: dto.entidad_id,
        });
      }

      // 8. Registrar en auditoría inmutable (Invariante I12)
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
    } catch (dbErr: any) {
      // Compensación obligatoria: eliminar el objeto recién subido en Storage si la BD falló
      await deleteFilesFromStorage(adminClient, validated.bucket, [validated.rutaArchivo]);
      throw dbErr;
    }
  }
}
