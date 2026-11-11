"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStorageBuckets = listStorageBuckets;
exports.ensureStorageBucket = ensureStorageBucket;
exports.uploadBufferToStorage = uploadBufferToStorage;
exports.getPublicFileUrl = getPublicFileUrl;
exports.createSignedFileUrl = createSignedFileUrl;
exports.deleteFilesFromStorage = deleteFilesFromStorage;
exports.probeBucketReadAccess = probeBucketReadAccess;
async function listStorageBuckets(client) {
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
    }
    catch (err) {
        return { buckets: [], error: err?.message || 'Error de conectividad con Supabase Storage' };
    }
}
async function ensureStorageBucket(adminClient, bucketName, isPublic, maxSizeBytes, allowedMimeTypes) {
    const { buckets, error: listErr } = await listStorageBuckets(adminClient);
    if (listErr) {
        return { created: false, alreadyExists: false, error: listErr };
    }
    const existing = buckets.find((b) => b.name === bucketName);
    if (existing) {
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
async function uploadBufferToStorage(client, bucket, filePath, buffer, contentType, upsert = false) {
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
function getPublicFileUrl(client, bucket, filePath) {
    const { data } = client.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
}
async function createSignedFileUrl(client, bucket, filePath, expiresInSeconds = 300) {
    const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresInSeconds);
    if (error || !data?.signedUrl) {
        return null;
    }
    return data.signedUrl;
}
async function deleteFilesFromStorage(client, bucket, paths) {
    if (!paths.length)
        return { removed: true, error: null };
    const { error } = await client.storage.from(bucket).remove(paths);
    if (error) {
        return { removed: false, error: error.message };
    }
    return { removed: true, error: null };
}
async function probeBucketReadAccess(client, bucket) {
    try {
        const { error } = await client.storage.from(bucket).list('', { limit: 1 });
        if (error) {
            return { accessible: false, error: error.message };
        }
        return { accessible: true, error: null };
    }
    catch (err) {
        return { accessible: false, error: err?.message || 'Error verificando permisos de lectura en bucket' };
    }
}
//# sourceMappingURL=storage.js.map