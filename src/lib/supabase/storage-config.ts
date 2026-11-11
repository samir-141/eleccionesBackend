import { env } from '../../config/env.config';

export type MediaCategoria =
  | 'candidatos'
  | 'listas'
  | 'organizaciones'
  | 'instituciones'
  | 'usuarios'
  | 'material-electoral';

export const MEDIA_CATEGORIAS: readonly MediaCategoria[] = [
  'candidatos',
  'listas',
  'organizaciones',
  'instituciones',
  'usuarios',
  'material-electoral',
] as const;

export interface CategoriaStorageRule {
  categoria: MediaCategoria;
  esPrivado: boolean;
  requiereEleccionIdEnRuta: boolean;
  descripcion: string;
}

export const CATEGORIA_STORAGE_RULES: Record<MediaCategoria, CategoriaStorageRule> = {
  candidatos: {
    categoria: 'candidatos',
    esPrivado: false,
    requiereEleccionIdEnRuta: true,
    descripcion: 'Fotografías oficiales de candidatos postulantes visibles en boletas y listas.',
  },
  listas: {
    categoria: 'listas',
    esPrivado: false,
    requiereEleccionIdEnRuta: true,
    descripcion: 'Logotipos y símbolos oficiales de listas electorales / partidos.',
  },
  organizaciones: {
    categoria: 'organizaciones',
    esPrivado: false,
    requiereEleccionIdEnRuta: false,
    descripcion: 'Emblemas de movimientos o agrupaciones estudiantiles.',
  },
  instituciones: {
    categoria: 'instituciones',
    esPrivado: false,
    requiereEleccionIdEnRuta: false,
    descripcion: 'Escudo, insignia y banners oficiales de la institución educativa.',
  },
  usuarios: {
    categoria: 'usuarios',
    esPrivado: true,
    requiereEleccionIdEnRuta: false,
    descripcion: 'Fotografías de perfil de encargados/docentes (almacenamiento privado con URL firmada).',
  },
  'material-electoral': {
    categoria: 'material-electoral',
    esPrivado: false,
    requiereEleccionIdEnRuta: true,
    descripcion: 'Banners, afiches de campaña y material informativo electoral.',
  },
};

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MIME_TO_EXTENSION: Record<AllowedImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'] as const;

export function getStorageConfig() {
  return {
    buckets: {
      public: env.SUPABASE_BUCKET_PUBLIC || 'elecciones-media',
      private: env.SUPABASE_BUCKET_PRIVATE || 'elecciones-privado',
    },
    maxImageSizeBytes: env.MAX_IMAGE_SIZE_BYTES || 5 * 1024 * 1024,
    signedUrlTtlSeconds: env.SUPABASE_SIGNED_URL_TTL_SECONDS || 300,
    allowedMimeTypes: [...ALLOWED_IMAGE_MIME_TYPES],
    allowedExtensions: [...ALLOWED_IMAGE_EXTENSIONS],
  };
}

export function getBucketForCategoria(categoria: MediaCategoria): {
  bucket: string;
  esPrivado: boolean;
} {
  const config = getStorageConfig();
  const rule = CATEGORIA_STORAGE_RULES[categoria];
  return {
    bucket: rule.esPrivado ? config.buckets.private : config.buckets.public,
    esPrivado: rule.esPrivado,
  };
}

export function isValidMediaCategoria(value: string): value is MediaCategoria {
  return (MEDIA_CATEGORIAS as readonly string[]).includes(value);
}
