import { SupabaseClient } from '@supabase/supabase-js';
export interface EnvVariableMissing {
    variable: string;
    scope: 'server' | 'client';
    required: boolean;
    reason: string;
    whereToGet: string;
    exampleValue: string;
}
export interface SupabaseEnvStatus {
    configured: boolean;
    hasUrl: boolean;
    hasAnonKey: boolean;
    hasServiceRoleKey: boolean;
    supabaseUrlValid: boolean;
    inferredProjectRefFromDb: string | null;
    missingVariables: EnvVariableMissing[];
    checkedFiles: {
        path: string;
        exists: boolean;
    }[];
}
export declare function resolveSupabaseCredentials(): {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
};
export declare function inspectSupabaseEnv(): SupabaseEnvStatus;
export declare function getSupabaseAdminClient(): SupabaseClient | null;
export declare function getSupabasePublicClient(): SupabaseClient | null;
