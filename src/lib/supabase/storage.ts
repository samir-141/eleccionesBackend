import { SupabaseClient } from '@supabase/supabase-js';

export interface StorageBucketInfo {
  id: string;
  name: string;
  public: boolean;
  created_at?: string;
}

export interface StorageUploadResult {
  bucket: string;
  path: string;
  fullPath?: string;
  publicUrl: string | null;
}

/**
 * Lista los buckets accesibles con el cliente proporcionado.
 */
export async function listStorageBuckets(client: SupabaseClient): Promise<{
  buckets: StorageBucketInfo[];
  error: string | null;
}> {
  try {
    const { data, error } = await client.storage.listBuckets();
    if (error) {
      return { buckets: [], error: error.message };
    }
    return {
      buckets: (data || []).map((b) => ({
        id: b.id,
        name: b.name,
        public: Boolean(b.public),
        created_at: b.created_at,
      })),
      error: null,
    };
  } catch (err: any) {
    return { buckets: [], error: err?.message || 'Error de conectividad con Supabase Storage' };
  }
}

/**
 * Crea un bucket en Supabase Storage si no existe (requiere Service Role Key).
 */
export async function ensureStorageBucket(
  adminClient: SupabaseClient,
  bucketName: string,
  isPublic: boolean,
  maxSizeBytes: number,
  allowedMimeTypes: string[],
): Promise<{ created: boolean; alreadyExists: boolean; error: string | null }> {
  const { buckets, error: listErr } = await listStorageBuckets(adminClient);
  if (listErr) {
    return { created: false, alreadyExists: false, error: listErr };
  }

  const existing = buckets.find((b) => b.name === bucketName);
  if (existing) {
    // Asegurar visibilidad esperada si difiere
    if (existing.public !== isPublic) {
      const { error: updErr } = await adminClient.storage.updateBucket(bucketName, {
        public: isPublic,
        fileSizeLimit: maxSizeBytes,
        allowedMimeTypes,
      });
      if (updErr) {
        return { created: false, alreadyExists: true, error: updErr.message };
      }
    }
    return { created: false, alreadyExists: true, error: null };
  }

  const { error: createErr } = await adminClient.storage.createBucket(bucketName, {
    public: isPublic,
    fileSizeLimit: maxSizeBytes,
    allowedMimeTypes,
  });

  if (createErr) {
    return { created: false, alreadyExists: false, error: createErr.message };
  }

  return { created: true, alreadyExists: false, error: null };
}

/**
 * Sube un buffer de archivo a Supabase Storage.
 */
export async function uploadBufferToStorage(
  client: SupabaseClient,
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string,
  upsert = false,
): Promise<StorageUploadResult> {
  const { data, error } = await client.storage.from(bucket).upload(filePath, buffer, {
    contentType,
    cacheControl: '3600',
    upsert,
  });

  if (error) {
    throw new Error(`Error al subir imagen a Supabase Storage [${bucket}/${filePath}]: ${error.message}`);
  }

  return {
    bucket,
    path: data.path,
    fullPath: data.fullPath,
    publicUrl: null,
  };
}

/**
 * Obtiene la URL pública permanente para buckets públicos.
 */
export function getPublicFileUrl(client: SupabaseClient, bucket: string, filePath: string): string {
  const { data } = client.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Genera una URL firmada temporal para archivos en buckets privados.
 */
export async function createSignedFileUrl(
  client: SupabaseClient,
  bucket: string,
  filePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

/**
 * Elimina uno o varios archivos de Supabase Storage.
 */
export async function deleteFilesFromStorage(
  client: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<{ removed: boolean; error: string | null }> {
  if (!paths.length) return { removed: true, error: null };

  const { error } = await client.storage.from(bucket).remove(paths);
  if (error) {
    return { removed: false, error: error.message };
  }
  return { removed: true, error: null };
}

/**
 * Prueba de listado sobre una carpeta de bucket para validar permisos RLS/Storage.
 */
export async function probeBucketReadAccess(
  client: SupabaseClient,
  bucket: string,
): Promise<{ accessible: boolean; error: string | null }> {
  try {
    const { error } = await client.storage.from(bucket).list('', { limit: 1 });
    if (error) {
      return { accessible: false, error: error.message };
    }
    return { accessible: true, error: null };
  } catch (err: any) {
    return { accessible: false, error: err?.message || 'Error verificando permisos de lectura en bucket' };
  }
}

