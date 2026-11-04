"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
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