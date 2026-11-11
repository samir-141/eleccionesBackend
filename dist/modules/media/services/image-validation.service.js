"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageValidationService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const path = require("path");
const storage_config_1 = require("../../../lib/supabase/storage-config");
const PROHIBITED_DNI_ENTITIES = new Set([
    'dni',
    'elector',
    'electores',
    'documento_identidad',
    'cedula_identidad',
    'biometria',
]);
let ImageValidationService = class ImageValidationService {
    detectRealMimeType(buffer) {
        if (!buffer || buffer.length < 12) {
            return null;
        }
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
            return 'image/jpeg';
        }
        if (buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47 &&
            buffer[4] === 0x0d &&
            buffer[5] === 0x0a &&
            buffer[6] === 0x1a &&
            buffer[7] === 0x0a) {
            return 'image/png';
        }
        if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
            buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
            return 'image/webp';
        }
        if (!buffer.includes(0x00)) {
            const head = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('utf8').trimStart();
            if (/^(?:<\?xml[\s\S]*?\?>\s*|<!--[\s\S]*?-->\s*|<!DOCTYPE\s+svg[\s\S]*?>\s*)*<svg\b/i.test(head)) {
                return 'image/svg+xml';
            }
        }
        return null;
    }
    sanitizeAndValidateSvg(buffer) {
        if (buffer.includes(0x00)) {
            throw new common_1.BadRequestException('El archivo SVG contiene bytes binarios inválidos.');
        }
        let svgText = buffer.toString('utf8').trim();
        if (!/<svg\b[\s\S]*<\/svg>\s*$/i.test(svgText)) {
            throw new common_1.BadRequestException('El archivo SVG no posee una estructura XML válida (<svg>...</svg>).');
        }
        svgText = svgText.replace(/<!--[\s\S]*?-->/g, '');
        const dangerousPatterns = [
            { regex: /<script\b/i, reason: 'Contiene etiquetas <script> prohibidas.' },
            { regex: /<foreignObject\b/i, reason: 'Contiene etiquetas <foreignObject> prohibidas.' },
            { regex: /<(iframe|object|embed|applet|meta|base|link)\b/i, reason: 'Contiene etiquetas HTML incrustadas prohibidas.' },
            { regex: /\bon[a-z]{2,}\s*=/i, reason: 'Contiene manejadores de eventos inline (onload/onerror/onclick).' },
            { regex: /(javascript|vbscript)\s*:/i, reason: 'Contiene esquemas ejecutables (javascript:/vbscript:).' },
            { regex: /data\s*:\s*text\/html/i, reason: 'Contiene URIs data:text/html peligrosas.' },
        ];
        for (const check of dangerousPatterns) {
            if (check.regex.test(svgText)) {
                throw new common_1.BadRequestException(`SVG rechazado por seguridad: ${check.reason}`);
            }
        }
        return Buffer.from(svgText, 'utf8');
    }
    validateActorPermissions(params) {
        if (!(0, storage_config_1.isValidMediaCategoria)(params.categoria)) {
            throw new common_1.BadRequestException(`Categoría inválida "${params.categoria}". Permitidas: ${Object.keys(storage_config_1.CATEGORIA_STORAGE_RULES).join(', ')}.`);
        }
        const entidadNorm = (params.entidadTipo || '').trim().toLowerCase();
        if (entidadNorm && PROHIBITED_DNI_ENTITIES.has(entidadNorm)) {
            throw new common_1.ForbiddenException('Invariante I17: Está estrictamente prohibido almacenar fotografías de DNI, documentos de identidad o electores.');
        }
        if (params.actor.rol === 'DOCENTE') {
            if (params.categoria !== 'usuarios' || entidadNorm !== 'docente') {
                throw new common_1.ForbiddenException('Un docente de aula solo puede gestionar su propia fotografía de perfil.');
            }
            if (!params.entidadId || params.entidadId !== params.actor.docenteId) {
                throw new common_1.ForbiddenException('Permiso denegado: no puedes cargar ni modificar imágenes pertenecientes a otro usuario o entidad.');
            }
        }
        return { categoria: params.categoria };
    }
    validateAndPrepare(params) {
        const { file, actor, categoria, entidadTipo, entidadId, eleccionId } = params;
        const { categoria: validCategoria } = this.validateActorPermissions({
            actor,
            categoria,
            entidadTipo,
            entidadId,
        });
        if (!file || !file.buffer || file.buffer.length === 0) {
            throw new common_1.BadRequestException('No se recibió ningún archivo de imagen válido.');
        }
        const config = (0, storage_config_1.getStorageConfig)();
        if (file.buffer.length > config.maxImageSizeBytes || file.size > config.maxImageSizeBytes) {
            const maxMb = (config.maxImageSizeBytes / (1024 * 1024)).toFixed(2);
            throw new common_1.BadRequestException(`El archivo excede el tamaño máximo permitido de ${maxMb} MB.`);
        }
        const nombreOriginal = path.basename(file.originalname || 'imagen').trim();
        if (!nombreOriginal || nombreOriginal.includes('..') || /[/\\]/.test(nombreOriginal)) {
            throw new common_1.BadRequestException('Nombre de archivo no válido.');
        }
        const ext = path.extname(nombreOriginal).toLowerCase();
        if (!storage_config_1.ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
            throw new common_1.BadRequestException(`Extensión no permitida (${ext || 'sin extensión'}). Solo se permiten: JPG, JPEG, PNG, WEBP y SVG.`);
        }
        const detectedMime = this.detectRealMimeType(file.buffer);
        if (!detectedMime || !storage_config_1.ALLOWED_IMAGE_MIME_TYPES.includes(detectedMime)) {
            throw new common_1.BadRequestException('El contenido binario del archivo no corresponde a una imagen válida (JPG, PNG, WEBP o SVG).');
        }
        const expectedExtsForMime = {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
            'image/svg+xml': ['.svg'],
        };
        if (!expectedExtsForMime[detectedMime].includes(ext)) {
            throw new common_1.BadRequestException(`Inconsistencia de seguridad: la extensión (${ext}) no coincide con el tipo real del archivo (${detectedMime}).`);
        }
        let finalBuffer = file.buffer;
        if (detectedMime === 'image/svg+xml') {
            finalBuffer = this.sanitizeAndValidateSvg(file.buffer);
        }
        const finalExtension = storage_config_1.MIME_TO_EXTENSION[detectedMime];
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
        const { bucket, esPrivado } = (0, storage_config_1.getBucketForCategoria)(validCategoria);
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
    buildStoragePath(params) {
        const cleanId = (val) => (val ? val.replace(/[^a-zA-Z0-9_-]/g, '') : '');
        const rule = storage_config_1.CATEGORIA_STORAGE_RULES[params.categoria];
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
};
exports.ImageValidationService = ImageValidationService;
exports.ImageValidationService = ImageValidationService = __decorate([
    (0, common_1.Injectable)()
], ImageValidationService);
//# sourceMappingURL=image-validation.service.js.map