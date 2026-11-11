import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Cargar variables en orden seguro sin sobrescribir variables ya definidas en el proceso:
// 1. backend/.env.local (prioridad en desarrollo local)
// 2. backend/.env
// 3. .env.local en la raíz del proyecto (compatibilidad si se define ahí)
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

const optionalNonEmptyString = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z.string().optional(),
);

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

  // Supabase Storage (opcionales para permitir arranque e inspección diagnóstica clara si faltan)
  SUPABASE_URL: optionalNonEmptyString,
  NEXT_PUBLIC_SUPABASE_URL: optionalNonEmptyString,
  SUPABASE_ANON_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmptyString,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
  SUPABASE_BUCKET_PUBLIC: z.string().default('elecciones-media'),
  SUPABASE_BUCKET_PRIVATE: z.string().default('elecciones-privado'),
  MAX_IMAGE_SIZE_BYTES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((n) => !Number.isNaN(n) && n > 0, { message: 'MAX_IMAGE_SIZE_BYTES debe ser un entero positivo' })
    .default('5242880'),
  SUPABASE_SIGNED_URL_TTL_SECONDS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((n) => !Number.isNaN(n) && n >= 30, { message: 'SUPABASE_SIGNED_URL_TTL_SECONDS debe ser al menos 30s' })
    .default('300'),
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
