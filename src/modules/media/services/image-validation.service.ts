import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  AllowedImageMimeType,
  CATEGORIA_STORAGE_RULES,
  getBucketForCategoria,
  getStorageConfig,
  isValidMediaCategoria,
  MediaCategoria,
  MIME_TO_EXTENSION,
} from '../../../lib/supabase/storage-config';
import { VerifiedActor } from '../../../lib/auth/token.utils';

export interface UploadedBinaryFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ValidatedImageResult {
  buffer: Buffer;
  detectedMime: AllowedImageMimeType;
  extension: string;
  nombreOriginal: string;
  nombreInterno: string;
  bucket: string;
  esPrivado: boolean;
  rutaArchivo: string;
  tamanoBytes: number;
  checksumSha256: string;
}

const PROHIBITED_DNI_ENTITIES = new Set([
  'dni',
  'elector',
  'electores',
  'documento_identidad',
  'cedula_identidad',
  'biometria',
]);

@Injectable()
export class ImageValidationService {
  /**
   * Detecta el tipo MIME real inspeccionando los magic bytes / firma binaria del archivo.
   */
  detectRealMimeType(buffer: Buffer): AllowedImageMimeType | null {
    if (!buffer || buffer.length < 12) {
      return null;
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // WEBP: "RIFF" .... "WEBP"
    if (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }

    // SVG: archivo XML/texto legible (sin bytes nulos binarios) que inicia con <svg (con opcional <?xml, <!-- -->, <!DOCTYPE)
    if (!buffer.includes(0x00)) {
      const head = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('utf8').trimStart();
      if (/^(?:<\?xml[\s\S]*?\?>\s*|<!--[\s\S]*?-->\s*|<!DOCTYPE\s+svg[\s\S]*?>\s*)*<svg\b/i.test(head)) {
        return 'image/svg+xml';
      }
    }

    return null;
  }

  /**
   * Sanitiza y valida un buffer SVG rechazando payloads activos (XSS, scripts, event handlers).
   */
  sanitizeAndValidateSvg(buffer: Buffer): Buffer {
    if (buffer.includes(0x00)) {
      throw new BadRequestException('El archivo SVG contiene bytes binarios inválidos.');
    }

    let svgText = buffer.toString('utf8').trim();
    if (!/<svg\b[\s\S]*<\/svg>\s*$/i.test(svgText)) {
      throw new BadRequestException('El archivo SVG no posee una estructura XML válida (<svg>...</svg>).');
    }

    // Eliminar comentarios XML y secciones CDATA potencialmente ofuscadas
    svgText = svgText.replace(/<!--[\s\S]*?-->/g, '');

    const dangerousPatterns: Array<{ regex: RegExp; reason: string }> = [
      { regex: /<script\b/i, reason: 'Contiene etiquetas <script> prohibidas.' },
      { regex: /<foreignObject\b/i, reason: 'Contiene etiquetas <foreignObject> prohibidas.' },
      { regex: /<(iframe|object|embed|applet|meta|base|link)\b/i, reason: 'Contiene etiquetas HTML incrustadas prohibidas.' },
      { regex: /\bon[a-z]{2,}\s*=/i, reason: 'Contiene manejadores de eventos inline (onload/onerror/onclick).' },
      { regex: /(javascript|vbscript)\s*:/i, reason: 'Contiene esquemas ejecutables (javascript:/vbscript:).' },
      { regex: /data\s*:\s*text\/html/i, reason: 'Contiene URIs data:text/html peligrosas.' },
    ];

    for (const check of dangerousPatterns) {
      if (check.regex.test(svgText)) {
        throw new BadRequestException(`SVG rechazado por seguridad: ${check.reason}`);
      }
    }

    return Buffer.from(svgText, 'utf8');
  }

  /**
   * Valida permisos de actor, invariante I17 y estructura de categoría/entidad.
   */
  validateActorPermissions(params: {
    actor: VerifiedActor;
    categoria: string;
    entidadTipo?: string;
    entidadId?: string;
  }): { categoria: MediaCategoria } {
    if (!isValidMediaCategoria(params.categoria)) {
      throw new BadRequestException(
        `Categoría inválida "${params.categoria}". Permitidas: ${Object.keys(CATEGORIA_STORAGE_RULES).join(', ')}.`,
      );
    }

    const entidadNorm = (params.entidadTipo || '').trim().toLowerCase();
    if (entidadNorm && PROHIBITED_DNI_ENTITIES.has(entidadNorm)) {
      throw new ForbiddenException(
        'Invariante I17: Está estrictamente prohibido almacenar fotografías de DNI, documentos de identidad o electores.',
      );
    }

    if (params.actor.rol === 'DOCENTE') {
      if (params.categoria !== 'usuarios' || entidadNorm !== 'docente') {
        throw new ForbiddenException(
          'Un docente de aula solo puede gestionar su propia fotografía de perfil.',
        );
      }
      if (!params.entidadId || params.entidadId !== params.actor.docenteId) {
        throw new ForbiddenException(
          'Permiso denegado: no puedes cargar ni modificar imágenes pertenecientes a otro usuario o entidad.',
        );
      }
    }

    return { categoria: params.categoria };
  }

  /**
   * Ejecuta todas las validaciones obligatorias y genera nombre interno + ruta única segura.
   */
  validateAndPrepare(params: {
    file: UploadedBinaryFile | undefined;
    actor: VerifiedActor;
    categoria: string;
    entidadTipo?: string;
    entidadId?: string;
    eleccionId?: string;
  }): ValidatedImageResult {
    const { file, actor, categoria, entidadTipo, entidadId, eleccionId } = params;
    const { categoria: validCategoria } = this.validateActorPermissions({
      actor,
      categoria,
      entidadTipo,
      entidadId,
    });

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('No se recibió ningún archivo de imagen válido.');
    }

    const config = getStorageConfig();
    if (file.buffer.length > config.maxImageSizeBytes || file.size > config.maxImageSizeBytes) {
      const maxMb = (config.maxImageSizeBytes / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(
        `El archivo excede el tamaño máximo permitido de ${maxMb} MB.`,
      );
    }

    const nombreOriginal = path.basename(file.originalname || 'imagen').trim();
    if (!nombreOriginal || nombreOriginal.includes('..') || /[/\\]/.test(nombreOriginal)) {
      throw new BadRequestException('Nombre de archivo no válido.');
    }

    const ext = path.extname(nombreOriginal).toLowerCase();
    if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
      throw new BadRequestException(
        `Extensión no permitida (${ext || 'sin extensión'}). Solo se permiten: JPG, JPEG, PNG, WEBP y SVG.`,
      );
    }

    const detectedMime = this.detectRealMimeType(file.buffer);
    if (!detectedMime || !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(detectedMime)) {
      throw new BadRequestException(
        'El contenido binario del archivo no corresponde a una imagen válida (JPG, PNG, WEBP o SVG).',
      );
    }

    // Verificar coherencia entre extensión declarada y magic bytes reales (prevenir spoofing)
    const expectedExtsForMime: Record<AllowedImageMimeType, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg'],
    };

    if (!expectedExtsForMime[detectedMime].includes(ext)) {
      throw new BadRequestException(
        `Inconsistencia de seguridad: la extensión (${ext}) no coincide con el tipo real del archivo (${detectedMime}).`,
      );
    }

    let finalBuffer = file.buffer;
    if (detectedMime === 'image/svg+xml') {
      finalBuffer = this.sanitizeAndValidateSvg(file.buffer);
    }

    const finalExtension = MIME_TO_EXTENSION[detectedMime];
    const baseNameWithoutExt = path.basename(nombreOriginal, ext);
    const safeSlug = baseNameWithoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'imagen';

    const uniqueSuffix = crypto.randomUUID().split('-')[0];
    const timestamp = Date.now();
    const nombreInterno = `${timestamp}-${uniqueSuffix}-${safeSlug}.${finalExtension}`;

    const rutaArchivo = this.buildStoragePath({
      categoria: validCategoria,
      eleccionId,
      entidadTipo,
      entidadId,
      nombreInterno,
    });

    const { bucket, esPrivado } = getBucketForCategoria(validCategoria);
    const checksumSha256 = crypto.createHash('sha256').update(finalBuffer).digest('hex');

    return {
      buffer: finalBuffer,
      detectedMime,
      extension: finalExtension,
      nombreOriginal,
      nombreInterno,
      bucket,
      esPrivado,
      rutaArchivo,
      tamanoBytes: finalBuffer.length,
      checksumSha256,
    };
  }

  buildStoragePath(params: {
    categoria: MediaCategoria;
    eleccionId?: string;
    entidadTipo?: string;
    entidadId?: string;
    nombreInterno: string;
  }): string {
    const cleanId = (val?: string) => (val ? val.replace(/[^a-zA-Z0-9_-]/g, '') : '');
    const rule = CATEGORIA_STORAGE_RULES[params.categoria];

    if (params.categoria === 'usuarios') {
      const roleFolder = cleanId(params.entidadTipo) || 'admin';
      const userFolder = cleanId(params.entidadId) || 'general';
      return `usuarios/${roleFolder}/${userFolder}/${params.nombreInterno}`;
    }

    if (rule.requiereEleccionIdEnRuta) {
      const folder = cleanId(params.eleccionId) || 'general';
      return `${params.categoria}/${folder}/${params.nombreInterno}`;
    }

    return `${params.categoria}/${params.nombreInterno}`;
  }
}
