import { VerifiedActor } from '../../lib/auth/token.utils';
import { UpdateInstitucionMediaDto, UpdateMediaDto, UploadMediaMetadataDto } from './dto/media.dto';
import { SupabaseDiagnosticsService } from './services/supabase-diagnostics.service';
import { ImageUploadService } from './services/image-upload.service';
import { ImageUpdateService } from './services/image-update.service';
import { ImageDeleteService } from './services/image-delete.service';
import { MediaQueryService } from './services/media-query.service';
import { PrismaService } from '../../database/prisma.service';
export declare class MediaController {
    private readonly diagnosticsService;
    private readonly uploadService;
    private readonly updateService;
    private readonly deleteService;
    private readonly queryService;
    private readonly prisma;
    constructor(diagnosticsService: SupabaseDiagnosticsService, uploadService: ImageUploadService, updateService: ImageUpdateService, deleteService: ImageDeleteService, queryService: MediaQueryService, prisma: PrismaService);
    obtenerInstitucionPublica(): Promise<{
        institucion: {
            id: string;
            banner_url: string | null;
            banner_media_id: string | null;
            logo_url: string | null;
            logo_media_id: string | null;
            updated_at: Date;
            nombre_institucion: string;
            subtitulo: string;
            titulo_portada: string;
            clave: string;
        };
        material_electoral: {
            id: string;
            created_at: Date;
            nombre_original: string;
            url_publica: string | null;
            alt_text: string | null;
        }[];
    }>;
    obtenerDiagnostico(): Promise<import("./services/supabase-diagnostics.service").SupabaseDiagnosticReport>;
    inicializarBuckets(): Promise<{
        success: boolean;
        resultados: {
            [x: string]: {
                created: boolean;
                alreadyExists: boolean;
                error: string | null;
            };
        };
        diagnostico: import("./services/supabase-diagnostics.service").SupabaseDiagnosticReport;
    }>;
    listarMedios(categoria?: string, eleccion_id?: string, entidad_tipo?: string, solo_sin_uso?: string, q?: string): Promise<{
        items: {
            en_uso: boolean;
            usado_en: import("./services/media-entity-linker.helper").MediaUsageRef[];
            url_visualizacion: string | null;
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
        }[];
        resumen: {
            total: number;
            en_uso: number;
            sin_uso: number;
            total_bytes: number;
        };
    }>;
    actualizarConfiguracionInstitucional(dto: UpdateInstitucionMediaDto, req: {
        actor: VerifiedActor;
    }, ip: string): Promise<{
        id: string;
        banner_url: string | null;
        banner_media_id: string | null;
        logo_url: string | null;
        logo_media_id: string | null;
        updated_at: Date;
        nombre_institucion: string;
        subtitulo: string;
        titulo_portada: string;
        clave: string;
    }>;
    obtenerDetalle(id: string): Promise<{
        en_uso: boolean;
        usado_en: import("./services/media-entity-linker.helper").MediaUsageRef[];
        url_visualizacion: string | null;
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
    obtenerUrlFirmada(id: string, req: {
        actor: VerifiedActor;
    }): Promise<{
        id: string;
        es_privado: boolean;
        url: string | null;
    }>;
    subirImagen(file: Express.Multer.File | undefined, dto: UploadMediaMetadataDto, req: {
        actor: VerifiedActor;
    }, ip: string): Promise<{
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
    reemplazarImagen(id: string, file: Express.Multer.File | undefined, req: {
        actor: VerifiedActor;
    }, ip: string): Promise<{
        url_visualizacion: string | null;
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
    actualizarMetadatos(id: string, dto: UpdateMediaDto, req: {
        actor: VerifiedActor;
    }, ip: string): Promise<{
        url_visualizacion: string | null;
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
    eliminarImagen(id: string, forzar: string | undefined, req: {
        actor: VerifiedActor;
    }, ip: string): Promise<{
        success: boolean;
        id: string;
        message: string;
    }>;
    obtenerMiAvatar(req: {
        actor: VerifiedActor;
    }): Promise<{
        tiene_avatar: boolean;
        url: null;
        media: null;
    } | {
        tiene_avatar: boolean;
        url: string | null;
        media: {
            en_uso: boolean;
            usado_en: import("./services/media-entity-linker.helper").MediaUsageRef[];
            url_visualizacion: string | null;
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
        };
    }>;
    subirMiAvatar(file: Express.Multer.File | undefined, req: {
        actor: VerifiedActor;
    }, ip: string): Promise<{
        url_visualizacion: string | null;
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
    eliminarMiAvatar(req: {
        actor: VerifiedActor;
    }, ip: string): Promise<{
        success: boolean;
        id: string;
        message: string;
    } | {
        success: boolean;
        message: string;
    }>;
}
