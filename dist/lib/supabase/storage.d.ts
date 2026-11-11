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
export declare function listStorageBuckets(client: SupabaseClient): Promise<{
    buckets: StorageBucketInfo[];
    error: string | null;
}>;
export declare function ensureStorageBucket(adminClient: SupabaseClient, bucketName: string, isPublic: boolean, maxSizeBytes: number, allowedMimeTypes: string[]): Promise<{
    created: boolean;
    alreadyExists: boolean;
    error: string | null;
}>;
export declare function uploadBufferToStorage(client: SupabaseClient, bucket: string, filePath: string, buffer: Buffer, contentType: string, upsert?: boolean): Promise<StorageUploadResult>;
export declare function getPublicFileUrl(client: SupabaseClient, bucket: string, filePath: string): string;
export declare function createSignedFileUrl(client: SupabaseClient, bucket: string, filePath: string, expiresInSeconds?: number): Promise<string | null>;
export declare function deleteFilesFromStorage(client: SupabaseClient, bucket: string, paths: string[]): Promise<{
    removed: boolean;
    error: string | null;
}>;
export declare function probeBucketReadAccess(client: SupabaseClient, bucket: string): Promise<{
    accessible: boolean;
    error: string | null;
}>;
