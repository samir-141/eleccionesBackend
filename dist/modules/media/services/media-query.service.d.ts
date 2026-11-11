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
export declare class MediaQueryService {
    private readonly prisma;
    private readonly auditoria;
    private readonly linker;
    constructor(prisma: PrismaService, auditoria: AuditoriaService, linker: MediaEntityLinkerHelper);
    listar(filtros?: MediaListFilter): Promise<{
        items: {
            en_uso: boolean;
            usado_en: MediaUsageRef[];
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
    obtenerPorId(id: string): Promise<{
        en_uso: boolean;
        usado_en: MediaUsageRef[];
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
    generarUrlFirmada(id: string, actor: VerifiedActor): Promise<{
        id: string;
        es_privado: boolean;
        url: string | null;
    }>;
    obtenerConfiguracionPublica(): Promise<{
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
    actualizarConfiguracionInstitucional(dto: UpdateInstitucionMediaDto, actor: VerifiedActor, ip: string): Promise<{
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
}
