"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSupabaseCredentials = resolveSupabaseCredentials;
exports.inspectSupabaseEnv = inspectSupabaseEnv;
exports.getSupabaseAdminClient = getSupabaseAdminClient;
exports.getSupabasePublicClient = getSupabasePublicClient;
const supabase_js_1 = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const env_config_1 = require("../../config/env.config");
function isPlaceholderValue(value) {
    if (!value)
        return true;
    const trimmed = value.trim();
    if (!trimmed)
        return true;
    return (trimmed.includes('TU_PROJECT_REF') ||
        trimmed.includes('tu_anon_') ||
        trimmed.includes('tu_service_role_') ||
        trimmed === 'changeme');
}
function inferProjectRefFromDatabaseUrl(dbUrl) {
    if (!dbUrl)
        return null;
    const poolerMatch = dbUrl.match(/postgres\.([a-z0-9]{15,30})/i);
    if (poolerMatch?.[1])
        return poolerMatch[1];
    const directMatch = dbUrl.match(/db\.([a-z0-9]{15,30})\.supabase\.co/i);
    if (directMatch?.[1])
        return directMatch[1];
    return null;
}
function resolveSupabaseCredentials() {
    const url = (env_config_1.env.SUPABASE_URL || env_config_1.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anonKey = (env_config_1.env.SUPABASE_ANON_KEY || env_config_1.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    const serviceRoleKey = (env_config_1.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    return {
        url: isPlaceholderValue(url) ? '' : url,
        anonKey: isPlaceholderValue(anonKey) ? '' : anonKey,
        serviceRoleKey: isPlaceholderValue(serviceRoleKey) ? '' : serviceRoleKey,
    };
}
function inspectSupabaseEnv() {
    const { url, anonKey, serviceRoleKey } = resolveSupabaseCredentials();
    const inferredRef = inferProjectRefFromDatabaseUrl(env_config_1.env.DATABASE_URL);
    const suggestedUrl = inferredRef
        ? `https://${inferredRef}.supabase.co`
        : 'https://TU_PROJECT_REF.supabase.co';
    let supabaseUrlValid = false;
    if (url) {
        try {
            const parsed = new URL(url);
            supabaseUrlValid = parsed.protocol === 'https:' || parsed.protocol === 'http:';
        }
        catch {
            supabaseUrlValid = false;
        }
    }
    const missingVariables = [];
    if (!url || !supabaseUrlValid) {
        missingVariables.push({
            variable: 'SUPABASE_URL (y VITE_SUPABASE_URL en frontend)',
            scope: 'server',
            required: true,
            reason: !url
                ? 'Falta la URL del proyecto de Supabase necesaria para conectarse a Supabase Storage.'
                : 'La URL de Supabase configurada no tiene un formato HTTP/HTTPS válido.',
            whereToGet: 'Supabase Dashboard -> Project Settings -> Data API / API -> Project URL',
            exampleValue: suggestedUrl,
        });
    }
    if (!anonKey) {
        missingVariables.push({
            variable: 'SUPABASE_ANON_KEY (y VITE_SUPABASE_ANON_KEY en frontend)',
            scope: 'server',
            required: true,
            reason: 'Falta la clave pública (anon key) de Supabase para consultas públicas y validación de cliente.',
            whereToGet: 'Supabase Dashboard -> Project Settings -> API -> Project API keys -> anon public',
            exampleValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        });
    }
    if (!serviceRoleKey) {
        missingVariables.push({
            variable: 'SUPABASE_SERVICE_ROLE_KEY (solo backend/.env o backend/.env.local)',
            scope: 'server',
            required: true,
            reason: 'Falta la clave administrativa de servidor (service_role) para subir, reemplazar, eliminar archivos privados y verificar/crear buckets de Storage con seguridad garantizada.',
            whereToGet: 'Supabase Dashboard -> Project Settings -> API -> Project API keys -> service_role (NUNCA exponer en frontend)',
            exampleValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (secret)',
        });
    }
    const candidatePaths = [
        path.resolve(__dirname, '../../../.env'),
        path.resolve(__dirname, '../../../.env.local'),
        path.resolve(__dirname, '../../../../frontend/.env'),
        path.resolve(__dirname, '../../../../frontend/.env.local'),
    ];
    const checkedFiles = candidatePaths.map((p) => ({
        path: path.relative(path.resolve(__dirname, '../../../../'), p).replace(/\\/g, '/'),
        exists: fs.existsSync(p),
    }));
    return {
        configured: Boolean(url && supabaseUrlValid && (serviceRoleKey || anonKey)),
        hasUrl: Boolean(url),
        hasAnonKey: Boolean(anonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        supabaseUrlValid,
        inferredProjectRefFromDb: inferredRef,
        missingVariables,
        checkedFiles,
    };
}
let cachedAdminClient = null;
let cachedAdminKeyFingerprint = '';
let cachedPublicClient = null;
let cachedPublicKeyFingerprint = '';
function getSupabaseAdminClient() {
    const { url, serviceRoleKey } = resolveSupabaseCredentials();
    if (!url || !serviceRoleKey)
        return null;
    try {
        new URL(url);
    }
    catch {
        return null;
    }
    const fingerprint = `${url}|${serviceRoleKey.slice(-6)}`;
    if (!cachedAdminClient || cachedAdminKeyFingerprint !== fingerprint) {
        cachedAdminClient = (0, supabase_js_1.createClient)(url, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
        cachedAdminKeyFingerprint = fingerprint;
    }
    return cachedAdminClient;
}
function getSupabasePublicClient() {
    const { url, anonKey } = resolveSupabaseCredentials();
    if (!url || !anonKey)
        return null;
    try {
        new URL(url);
    }
    catch {
        return null;
    }
    const fingerprint = `${url}|${anonKey.slice(-6)}`;
    if (!cachedPublicClient || cachedPublicKeyFingerprint !== fingerprint) {
        cachedPublicClient = (0, supabase_js_1.createClient)(url, anonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
        cachedPublicKeyFingerprint = fingerprint;
    }
    return cachedPublicClient;
}
//# sourceMappingURL=client.js.map