export declare class CreateCandidatoDto {
    nombres: string;
    apellidos: string;
    cargo: string;
    orden?: number;
    foto_url?: string | null;
    foto_media_id?: string | null;
}
export declare class UpdateCandidatoDto {
    nombres?: string;
    apellidos?: string;
    cargo?: string;
    orden?: number;
    foto_url?: string | null;
    foto_media_id?: string | null;
}
