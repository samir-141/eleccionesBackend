import { MediaCategoria } from '../../../lib/supabase/storage-config';
export declare class UploadMediaMetadataDto {
    categoria: MediaCategoria;
    entidad_tipo?: string;
    entidad_id?: string;
    eleccion_id?: string;
    alt_text?: string;
}
export declare class UpdateMediaDto {
    alt_text?: string;
    entidad_tipo?: string;
    entidad_id?: string;
    eleccion_id?: string;
}
export declare class UpdateInstitucionMediaDto {
    nombre_institucion?: string;
    subtitulo?: string;
    titulo_portada?: string;
    logo_media_id?: string | null;
    banner_media_id?: string | null;
}
