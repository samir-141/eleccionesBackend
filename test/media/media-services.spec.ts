import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import * as supabaseClientLib from '../../src/lib/supabase/client';
import { ImageValidationService } from '../../src/modules/media/services/image-validation.service';
import { MediaEntityLinkerHelper } from '../../src/modules/media/services/media-entity-linker.helper';
import { ImageUploadService } from '../../src/modules/media/services/image-upload.service';
import { ImageUpdateService } from '../../src/modules/media/services/image-update.service';
import { ImageDeleteService } from '../../src/modules/media/services/image-delete.service';
import { MediaQueryService } from '../../src/modules/media/services/media-query.service';
import { VerifiedActor } from '../../src/lib/auth/token.utils';

describe('Media Services End-to-End Flow (Upload, Query, Replace, Delete & Rollback)', () => {
  const adminActor: VerifiedActor = { rol: 'ADMIN', actorId: 'admin', username: 'admin' };
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const altPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x53,
  ]);

  let mediaRows: any[];
  let partidos: any[];
  let auditLogs: any[];
  let storedObjects: Map<string, Buffer>;
  let mockPrisma: any;
  let mockAuditoria: any;
  let validator: ImageValidationService;
  let linker: MediaEntityLinkerHelper;
  let uploadService: ImageUploadService;
  let updateService: ImageUpdateService;
  let deleteService: ImageDeleteService;
  let queryService: MediaQueryService;

  const createMockSupabaseClient = () => ({
    storage: {
      listBuckets: vi.fn(async () => ({
        data: [
          { id: 'elecciones-media', name: 'elecciones-media', public: true },
          { id: 'elecciones-privado', name: 'elecciones-privado', public: false },
        ],
        error: null,
      })),
      from: (bucket: string) => ({
        upload: vi.fn(async (filePath: string, buf: Buffer) => {
          storedObjects.set(`${bucket}/${filePath}`, buf);
          return { data: { path: filePath, fullPath: `${bucket}/${filePath}` }, error: null };
        }),
        getPublicUrl: (filePath: string) => ({
          data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${bucket}/${filePath}` },
        }),
        createSignedUrl: vi.fn(async (filePath: string, ttl: number) => ({
          data: { signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${bucket}/${filePath}?token=ttl_${ttl}` },
          error: null,
        })),
        remove: vi.fn(async (paths: string[]) => {
          for (const p of paths) storedObjects.delete(`${bucket}/${p}`);
          return { data: paths, error: null };
        }),
      }),
    },
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    mediaRows = [];
    partidos = [
      { id: 'partido-1', numero_lista: 1, nombre: 'Lista Innovación', logo_media_id: null, logo_url: null },
    ];
    auditLogs = [];
    storedObjects = new Map();

    mockPrisma = {
      eleccion: {
        findUnique: vi.fn(async ({ where }: any) => (where.id === 'elec-1' ? { id: 'elec-1' } : null)),
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
      partido: {
        update: vi.fn(async ({ where, data }: any) => {
          const p = partidos.find((x) => x.id === where.id);
          Object.assign(p, data);
          return p;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          let count = 0;
          partidos.forEach((p) => {
            if (p.logo_media_id === where.logo_media_id) {
              Object.assign(p, data);
              count++;
            }
          });
          return { count };
        }),
        findMany: vi.fn(async ({ where }: any) =>
          partidos.filter((p) => where?.logo_media_id?.in?.includes(p.logo_media_id)),
        ),
      },
      candidato: { findMany: vi.fn(async () => []), updateMany: vi.fn(async () => ({ count: 0 })) },
      docente: {
        findMany: vi.fn(async () => []),
        update: vi.fn(async () => ({})),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
      configuracionInstitucional: {
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
      archivoMedia: {
        findFirst: vi.fn(async ({ where }: any) =>
          mediaRows.find(
            (m) =>
              m.checksum_sha256 === where.checksum_sha256 &&
              m.categoria === where.categoria &&
              m.bucket === where.bucket,
          ) || null,
        ),
        findUnique: vi.fn(async ({ where }: any) => mediaRows.find((m) => m.id === where.id) || null),
        findMany: vi.fn(async () => [...mediaRows]),
        create: vi.fn(async ({ data }: any) => {
          const row = {
            id: `media-${mediaRows.length + 1}`,
            ...data,
            created_at: new Date(),
            updated_at: new Date(),
          };
          mediaRows.push(row);
          return row;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const row = mediaRows.find((m) => m.id === where.id);
          Object.assign(row, data, { updated_at: new Date() });
          return row;
        }),
        delete: vi.fn(async ({ where }: any) => {
          mediaRows = mediaRows.filter((m) => m.id !== where.id);
        }),
      },
    };

    mockAuditoria = {
      registrar: vi.fn(async (entry: any) => {
        auditLogs.push(entry);
        return entry;
      }),
    };

    validator = new ImageValidationService();
    linker = new MediaEntityLinkerHelper(mockPrisma);
    uploadService = new ImageUploadService(mockPrisma, mockAuditoria, validator, linker);
    updateService = new ImageUpdateService(mockPrisma, mockAuditoria, validator, linker);
    deleteService = new ImageDeleteService(mockPrisma, mockAuditoria, linker);
    queryService = new MediaQueryService(mockPrisma, mockAuditoria, linker);
  });

  it('falla explícitamente sin registrar datos fantasmas si Supabase Storage no está configurado', async () => {
    vi.spyOn(supabaseClientLib, 'getSupabaseAdminClient').mockReturnValue(null);

    await expect(
      uploadService.uploadImage({
        file: { originalname: 'logo.png', mimetype: 'image/png', size: pngBuffer.length, buffer: pngBuffer },
        dto: { categoria: 'listas', eleccion_id: 'elec-1' },
        actor: adminActor,
        ip: '127.0.0.1',
      }),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(mediaRows).toHaveLength(0);
  });

  it('ejecuta rollback en Storage si falla el registro en PostgreSQL después de subir', async () => {
    const mockClient = createMockSupabaseClient();
    vi.spyOn(supabaseClientLib, 'getSupabaseAdminClient').mockReturnValue(mockClient as any);
    mockPrisma.archivoMedia.create.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(
      uploadService.uploadImage({
        file: { originalname: 'logo.png', mimetype: 'image/png', size: pngBuffer.length, buffer: pngBuffer },
        dto: { categoria: 'listas', eleccion_id: 'elec-1' },
        actor: adminActor,
        ip: '127.0.0.1',
      }),
    ).rejects.toThrow('DB connection lost');

    expect(storedObjects.size).toBe(0);
    expect(mediaRows).toHaveLength(0);
  });

  it('completa ciclo Subir -> Vincular -> Consultar -> Reemplazar -> Eliminar con detección de uso', async () => {
    const mockClient = createMockSupabaseClient();
    vi.spyOn(supabaseClientLib, 'getSupabaseAdminClient').mockReturnValue(mockClient as any);

    // 1. Subir logotipo vinculado a partido-1
    const uploaded = await uploadService.uploadImage({
      file: { originalname: 'logo-1.png', mimetype: 'image/png', size: pngBuffer.length, buffer: pngBuffer },
      dto: { categoria: 'listas', eleccion_id: 'elec-1', entidad_tipo: 'partido', entidad_id: 'partido-1' },
      actor: adminActor,
      ip: '127.0.0.1',
    });

    expect(uploaded.id).toBe('media-1');
    expect(uploaded.url_publica).toContain('elecciones-media/listas/elec-1/');
    expect(partidos[0].logo_media_id).toBe('media-1');
    expect(partidos[0].logo_url).toBe(uploaded.url_publica);
    expect(storedObjects.size).toBe(1);

    // 2. Consultar catálogo y verificar estado "en_uso"
    const list1 = await queryService.listar({});
    expect(list1.resumen.total).toBe(1);
    expect(list1.resumen.en_uso).toBe(1);
    expect(list1.resumen.sin_uso).toBe(0);
    expect(list1.items[0].usado_en[0].etiqueta).toContain('Lista Innovación');

    // 3. Reemplazar imagen: sube archivo nuevo, propaga nueva URL y borra archivo anterior
    const replaced = await updateService.replaceImage({
      mediaId: 'media-1',
      file: { originalname: 'logo-v2.png', mimetype: 'image/png', size: altPngBuffer.length, buffer: altPngBuffer },
      actor: adminActor,
      ip: '127.0.0.1',
    });

    expect(replaced.ruta_archivo).not.toBe(uploaded.ruta_archivo);
    expect(partidos[0].logo_url).toBe(replaced.url_publica);
    expect(storedObjects.size).toBe(1); // Solo queda la versión nueva

    // 4. Intentar eliminar sin forzar -> debe advertir conflicto (en uso)
    await expect(
      deleteService.deleteImage({ mediaId: 'media-1', forzar: false, actor: adminActor, ip: '127.0.0.1' }),
    ).rejects.toThrow(ConflictException);

    // 5. Eliminar con confirmación forzada -> limpia Storage, BD y desvincula partido
    const delRes = await deleteService.deleteImage({
      mediaId: 'media-1',
      forzar: true,
      actor: adminActor,
      ip: '127.0.0.1',
    });

    expect(delRes.success).toBe(true);
    expect(storedObjects.size).toBe(0);
    expect(mediaRows).toHaveLength(0);
    expect(partidos[0].logo_media_id).toBeNull();
    expect(partidos[0].logo_url).toBeNull();
  });

  it('genera URLs firmadas dinámicas para imágenes privadas de usuarios sin persistir URLs temporales en BD', async () => {
    const mockClient = createMockSupabaseClient();
    vi.spyOn(supabaseClientLib, 'getSupabaseAdminClient').mockReturnValue(mockClient as any);

    const docenteId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const uploaded = await uploadService.uploadImage({
      file: { originalname: 'docente.png', mimetype: 'image/png', size: pngBuffer.length, buffer: pngBuffer },
      dto: { categoria: 'usuarios', entidad_tipo: 'docente', entidad_id: docenteId },
      actor: { rol: 'DOCENTE', actorId: 'docente1', username: 'docente1', docenteId },
      ip: '127.0.0.1',
    });

    expect(uploaded.es_privado).toBe(true);
    expect(uploaded.url_publica).toBeNull(); // Nunca guarda URL permanente ni firmada temporal en BD
    expect(uploaded.url_visualizacion).toContain('/storage/v1/object/sign/elecciones-privado/');
  });
});
