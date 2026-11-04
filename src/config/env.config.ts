import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env de backend si no está en proceso
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('4000'),
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL de conexión válida a PostgreSQL'),
  DATABASE_URL_ESCRUTINIO: z.string().url('DATABASE_URL_ESCRUTINIO debe ser una URL de conexión válida').optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres para garantizar seguridad criptográfica'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET debe tener al menos 16 caracteres'),
  TOTP_SERVICE_NAME: z.string().default('Elecciones Escolares'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  REDIS_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ ERROR FATAL: Variables de entorno inválidas o faltantes en .env:');
    console.error(result.error.format());
    throw new Error('Configuración de entorno inválida. Revisa backend/.env contra backend/.env.example');
  }

  return result.data;
}

export const env = validateEnv();

