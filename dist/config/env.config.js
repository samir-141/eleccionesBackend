"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const candidateEnvPaths = [
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env.local'),
];
for (const envPath of candidateEnvPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false });
    }
}
const optionalNonEmptyString = zod_1.z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), zod_1.z.string().optional());
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform((val) => parseInt(val, 10)).default('4000'),
    DATABASE_URL: zod_1.z.string().url('DATABASE_URL debe ser una URL de conexión válida a PostgreSQL'),
    DATABASE_URL_ESCRUTINIO: zod_1.z.string().url('DATABASE_URL_ESCRUTINIO debe ser una URL de conexión válida').optional(),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres para garantizar seguridad criptográfica'),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    COOKIE_SECRET: zod_1.z.string().min(16, 'COOKIE_SECRET debe tener al menos 16 caracteres'),
    TOTP_SERVICE_NAME: zod_1.z.string().default('Elecciones Escolares'),
    FRONTEND_URL: zod_1.z.string().url().default('http://localhost:3000'),
    REDIS_URL: zod_1.z.string().url().optional(),
    SUPABASE_URL: optionalNonEmptyString,
    NEXT_PUBLIC_SUPABASE_URL: optionalNonEmptyString,
    SUPABASE_ANON_KEY: optionalNonEmptyString,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmptyString,
    SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
    SUPABASE_BUCKET_PUBLIC: zod_1.z.string().default('elecciones-media'),
    SUPABASE_BUCKET_PRIVATE: zod_1.z.string().default('elecciones-privado'),
    MAX_IMAGE_SIZE_BYTES: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((n) => !Number.isNaN(n) && n > 0, { message: 'MAX_IMAGE_SIZE_BYTES debe ser un entero positivo' })
        .default('5242880'),
    SUPABASE_SIGNED_URL_TTL_SECONDS: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((n) => !Number.isNaN(n) && n >= 30, { message: 'SUPABASE_SIGNED_URL_TTL_SECONDS debe ser al menos 30s' })
        .default('300'),
});
function validateEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ ERROR FATAL: Variables de entorno inválidas o faltantes en .env:');
        console.error(result.error.format());
        throw new Error('Configuración de entorno inválida. Revisa backend/.env contra backend/.env.example');
    }
    return result.data;
}
exports.env = validateEnv();
//# sourceMappingURL=env.config.js.map