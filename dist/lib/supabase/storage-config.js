"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_IMAGE_EXTENSIONS = exports.MIME_TO_EXTENSION = exports.ALLOWED_IMAGE_MIME_TYPES = exports.CATEGORIA_STORAGE_RULES = exports.MEDIA_CATEGORIAS = void 0;
exports.getStorageConfig = getStorageConfig;
exports.getBucketForCategoria = getBucketForCategoria;
exports.isValidMediaCategoria = isValidMediaCategoria;
const env_config_1 = require("../../config/env.config");
exports.MEDIA_CATEGORIAS = [
    'candidatos',
    'listas',
    'organizaciones',
    'instituciones',
    'usuarios',
    'material-electoral',
];
exports.CATEGORIA_STORAGE_RULES = {
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
exports.ALLOWED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
];
exports.MIME_TO_EXTENSION = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
};
exports.ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
function getStorageConfig() {
    return {
        buckets: {
            public: env_config_1.env.SUPABASE_BUCKET_PUBLIC || 'elecciones-media',
            private: env_config_1.env.SUPABASE_BUCKET_PRIVATE || 'elecciones-privado',
        },
        maxImageSizeBytes: env_config_1.env.MAX_IMAGE_SIZE_BYTES || 5 * 1024 * 1024,
        signedUrlTtlSeconds: env_config_1.env.SUPABASE_SIGNED_URL_TTL_SECONDS || 300,
        allowedMimeTypes: [...exports.ALLOWED_IMAGE_MIME_TYPES],
        allowedExtensions: [...exports.ALLOWED_IMAGE_EXTENSIONS],
    };
}
function getBucketForCategoria(categoria) {
    const config = getStorageConfig();
    const rule = exports.CATEGORIA_STORAGE_RULES[categoria];
    return {
        bucket: rule.esPrivado ? config.buckets.private : config.buckets.public,
        esPrivado: rule.esPrivado,
    };
}
function isValidMediaCategoria(value) {
    return exports.MEDIA_CATEGORIAS.includes(value);
}
//# sourceMappingURL=storage-config.js.map