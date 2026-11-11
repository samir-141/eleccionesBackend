import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { issueAdminToken, issueDocenteToken, verifyBearerToken } from '../../src/lib/auth/token.utils';
import { MediaAuthGuard } from '../../src/modules/media/guards/media-auth.guard';
import { Reflector } from '@nestjs/core';
import { inspectSupabaseEnv } from '../../src/lib/supabase/client';
import { getBucketForCategoria } from '../../src/lib/supabase/storage-config';

describe('Media Storage Lifecycle, Esquema SQL y Seguridad RBAC', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    const sql01 = fs.readFileSync(
      path.resolve(__dirname, '../../prisma/migrations/01_initial_schema.sql'),
      'utf-8',
    );
    const sql04 = fs.readFileSync(
      path.resolve(__dirname, '../../prisma/migrations/04_media_storage_and_candidatos.sql'),
      'utf-8',
    );
    await db.exec(sql01);
    await db.exec(sql04);
  });

  afterAll(async () => {
    await db.close();
  });

  it('crea tablas archivo_media, candidato y configuracion_institucional manteniendo intactas las invariantes de urna', async () => {
    const tablesRes = await db.query<{ table_name: string }>(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('archivo_media', 'candidato', 'configuracion_institucional', 'urna');
    `);
    const names = tablesRes.rows.map((r) => r.table_name).sort();
    expect(names).toEqual(['archivo_media', 'candidato', 'configuracion_institucional', 'urna']);

    // Verificar tabla urna intacta con exactamente 4 columnas (Invariante I2)
    const urnaCols = await db.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'urna';
    `);
    expect(urnaCols.rows).toHaveLength(4);
  });

  it('persiste referencias de imágenes sin duplicar ruta+bucket y las vincula a partido y candidato', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elección Media Test') RETURNING id;`)
    ).rows[0].id;

    const media = (
      await db.query<{ id: string; url_publica: string }>(`
        INSERT INTO archivo_media (
          nombre_original, nombre_interno, bucket, ruta_archivo,
          url_publica, es_privado, mime_type, tamano_bytes, categoria, eleccion_id, subido_por
        ) VALUES (
          'logo-lista-1.png', '170000-abc-logo-lista-1.png', 'elecciones-media',
          'listas/${eleccion}/170000-abc-logo-lista-1.png',
          'https://demo.supabase.co/storage/v1/object/public/elecciones-media/listas/${eleccion}/170000-abc-logo-lista-1.png',
          FALSE, 'image/png', 12040, 'listas', '${eleccion}', 'admin'
        )
        RETURNING id, url_publica;
      `)
    ).rows[0];

    // Intentar insertar registro duplicado en mismo bucket + ruta -> Debe rechazar por constraint UNIQUE
    await expect(
      db.query(`
        INSERT INTO archivo_media (
          nombre_original, nombre_interno, bucket, ruta_archivo,
          mime_type, tamano_bytes, categoria
        ) VALUES (
          'dup.png', '170001-dup.png', 'elecciones-media',
          'listas/${eleccion}/170000-abc-logo-lista-1.png',
          'image/png', 12040, 'listas'
        );
      `),
    ).rejects.toThrow();

    // Crear partido vinculado al archivo_media
    const partido = (
      await db.query<{ id: string; logo_media_id: string }>(`
        INSERT INTO partido (eleccion_id, numero_lista, nombre, logo_url, logo_media_id)
        VALUES ('${eleccion}', 1, 'Lista Renovación', '${media.url_publica}', '${media.id}')
        RETURNING id, logo_media_id;
      `)
    ).rows[0];
    expect(partido.logo_media_id).toBe(media.id);

    // Crear candidato vinculado al partido
    const cand = (
      await db.query<{ id: string }>(`
        INSERT INTO candidato (eleccion_id, partido_id, nombres, apellidos, cargo)
        VALUES ('${eleccion}', '${partido.id}', 'Sofía', 'Mendoza', 'Alcaldesa Escolar')
        RETURNING id;
      `)
    ).rows[0];
    expect(cand.id).toBeTruthy();

    // Al eliminar media, ON DELETE SET NULL mantiene al partido sin romper la elección
    await db.query(`DELETE FROM archivo_media WHERE id = '${media.id}';`);
    const partidoPost = await db.query<{ logo_media_id: string | null }>(`
      SELECT logo_media_id FROM partido WHERE id = '${partido.id}';
    `);
    expect(partidoPost.rows[0].logo_media_id).toBeNull();
  });

  it('separa correctamente buckets públicos y privados según categoría', () => {
    expect(getBucketForCategoria('listas')).toEqual({ bucket: 'elecciones-media', esPrivado: false });
    expect(getBucketForCategoria('candidatos')).toEqual({ bucket: 'elecciones-media', esPrivado: false });
    expect(getBucketForCategoria('instituciones')).toEqual({ bucket: 'elecciones-media', esPrivado: false });
    expect(getBucketForCategoria('usuarios')).toEqual({ bucket: 'elecciones-privado', esPrivado: true });
  });

  it('emite y verifica tokens firmados HMAC y bloquea accesos anónimos o con rol insuficiente en MediaAuthGuard', () => {
    const adminToken = issueAdminToken('admin');
    const docenteToken = issueDocenteToken({
      id: '33333333-3333-4333-8333-333333333333',
      username: 'docente_test',
      aula_id: '44444444-4444-4444-8444-444444444444',
    });

    expect(verifyBearerToken(`Bearer ${adminToken}`)?.rol).toBe('ADMIN');
    expect(verifyBearerToken(`Bearer ${docenteToken}`)?.rol).toBe('DOCENTE');
    expect(verifyBearerToken('Bearer admin_sec_token_falsificado')).toBeNull();

    const reflector = {
      getAllAndOverride: () => ['ADMIN'],
    } as unknown as Reflector;
    const guard = new MediaAuthGuard(reflector);

    const mockCtx = (authHeader?: string) =>
      ({
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ headers: { authorization: authHeader } }),
        }),
      }) as any;

    expect(() => guard.canActivate(mockCtx(undefined))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(mockCtx('Bearer token_invalido'))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(mockCtx(`Bearer ${docenteToken}`))).toThrow(ForbiddenException);
    expect(guard.canActivate(mockCtx(`Bearer ${adminToken}`))).toBe(true);
  });

  it('diagnostica de forma explícita las variables faltantes sin inventar credenciales ni ocultar errores', () => {
    const envStatus = inspectSupabaseEnv();
    // Si no existen SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY, debe reportarlo claramente
    if (!envStatus.hasServiceRoleKey || !envStatus.hasUrl) {
      expect(envStatus.missingVariables.length).toBeGreaterThan(0);
      expect(envStatus.missingVariables.some((m) => m.whereToGet.includes('Supabase Dashboard'))).toBe(true);
    } else {
      expect(envStatus.configured).toBe(true);
    }
  });
});

