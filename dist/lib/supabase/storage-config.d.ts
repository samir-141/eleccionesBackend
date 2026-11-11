export type MediaCategoria = 'candidatos' | 'listas' | 'organizaciones' | 'instituciones' | 'usuarios' | 'material-electoral';
export declare const MEDIA_CATEGORIAS: readonly MediaCategoria[];
export interface CategoriaStorageRule {
    categoria: MediaCategoria;
    esPrivado: boolean;
    requiereEleccionIdEnRuta: boolean;
    descripcion: string;
}
export declare const CATEGORIA_STORAGE_RULES: Record<MediaCategoria, CategoriaStorageRule>;
export declare const ALLOWED_IMAGE_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
export declare const MIME_TO_EXTENSION: Record<AllowedImageMimeType, string>;
export declare const ALLOWED_IMAGE_EXTENSIONS: readonly [".jpg", ".jpeg", ".png", ".webp", ".svg"];
export declare function getStorageConfig(): {
    buckets: {
        public: string;
        private: string;
    };
    maxImageSizeBytes: number;
    signedUrlTtlSeconds: number;
    allowedMimeTypes: ("image/jpeg" | "image/png" | "image/webp" | "image/svg+xml")[];
    allowedExtensions: (".jpg" | ".jpeg" | ".png" | ".webp" | ".svg")[];
};
export declare function getBucketForCategoria(categoria: MediaCategoria): {
    bucket: string;
    esPrivado: boolean;
};
export declare function isValidMediaCategoria(value: string): value is MediaCategoria;
