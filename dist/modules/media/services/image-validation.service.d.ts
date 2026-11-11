import { AllowedImageMimeType, MediaCategoria } from '../../../lib/supabase/storage-config';
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
export declare class ImageValidationService {
    detectRealMimeType(buffer: Buffer): AllowedImageMimeType | null;
    sanitizeAndValidateSvg(buffer: Buffer): Buffer;
    validateActorPermissions(params: {
        actor: VerifiedActor;
        categoria: string;
        entidadTipo?: string;
        entidadId?: string;
    }): {
        categoria: MediaCategoria;
    };
    validateAndPrepare(params: {
        file: UploadedBinaryFile | undefined;
        actor: VerifiedActor;
        categoria: string;
        entidadTipo?: string;
        entidadId?: string;
        eleccionId?: string;
    }): ValidatedImageResult;
    buildStoragePath(params: {
        categoria: MediaCategoria;
        eleccionId?: string;
        entidadTipo?: string;
        entidadId?: string;
        nombreInterno: string;
    }): string;
}
