import { PrismaService } from '../../../database/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { VerifiedActor } from '../../../lib/auth/token.utils';
import { UploadMediaMetadataDto } from '../dto/media.dto';
import { ImageValidationService, UploadedBinaryFile } from './image-validation.service';
import { MediaEntityLinkerHelper } from './media-entity-linker.helper';
export declare class ImageUploadService {
    private readonly prisma;
    private readonly auditoria;
    private readonly validator;
    private readonly linker;
    constructor(prisma: PrismaService, auditoria: AuditoriaService, validator: ImageValidationService, linker: MediaEntityLinkerHelper);
    uploadImage(params: {
        file: UploadedBinaryFile | undefined;
        dto: UploadMediaMetadataDto;
        actor: VerifiedActor;
        ip: string;
    }): Promise<{
        url_visualizacion: string | null;
        en_uso: boolean;
        id: string;
        entidad_id: string | null;
        created_at: Date;
        eleccion_id: string | null;
        nombre_original: string;
        nombre_interno: string;
        bucket: string;
        ruta_archivo: string;
        url_publica: string | null;
        es_privado: boolean;
        mime_type: string;
        tamano_bytes: number;
        checksum_sha256: string | null;
        categoria: string;
        entidad_tipo: string | null;
        subido_por: string;
        alt_text: string | null;
        updated_at: Date;
    }>;
}
