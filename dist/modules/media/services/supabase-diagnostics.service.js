"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseDiagnosticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("../../../lib/supabase/client");
const storage_config_1 = require("../../../lib/supabase/storage-config");
const storage_1 = require("../../../lib/supabase/storage");
let SupabaseDiagnosticsService = class SupabaseDiagnosticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async runDiagnostics() {
        const envStatus = (0, client_1.inspectSupabaseEnv)();
        const config = (0, storage_config_1.getStorageConfig)();
        const componentes = [];
        let bucketsDetectadosEnStorage = [];
        let bucketsLegacyDetectadosEnDb = [];
        let dbOk = false;
        try {
            await this.prisma.archivoMedia.count();
            await this.prisma.candidato.count();
            await this.prisma.configuracionInstitucional.count();
            dbOk = true;
            componentes.push({
                componente: 'Base de datos',
                estado: 'Correcto',
                detalle: 'Conexión a PostgreSQL verificada. Tablas archivo_media, candidato y configuracion_institucional operativas.',
            });
            try {
                const dbBuckets = await this.prisma.$queryRawUnsafe('SELECT id, name, public FROM storage.buckets');
                bucketsLegacyDetectadosEnDb = dbBuckets || [];
            }
            catch {
            }
        }
        catch (err) {
            componentes.push({
                componente: 'Base de datos',
                estado: 'Error',
                detalle: `Error al consultar las tablas de medios en PostgreSQL: ${err?.message || 'Error desconocido'}`,
                solucion: 'Ejecuta la migración backend/prisma/migrations/04_media_storage_and_candidatos.sql y verifica DATABASE_URL en backend/.env.',
            });
        }
        if (!envStatus.hasUrl || !envStatus.supabaseUrlValid || (!envStatus.hasAnonKey && !envStatus.hasServiceRoleKey)) {
            const faltantes = envStatus.missingVariables.map((v) => v.variable).join(', ');
            const projectHint = envStatus.inferredProjectRefFromDb
                ? ` Detectado proyecto Supabase en DATABASE_URL: https://${envStatus.inferredProjectRefFromDb}.supabase.co.`
                : '';
            componentes.push({
                componente: 'Supabase',
                estado: 'Error',
                detalle: `Faltan variables de configuración para conectar con la API de Supabase: ${faltantes}.${projectHint}`,
                solucion: 'Agrega SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY en backend/.env (o backend/.env.local) y VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en frontend/.env. Obtenlas en Supabase Dashboard -> Project Settings -> API.',
            });
            componentes.push({
                componente: 'Storage',
                estado: 'Error',
                detalle: 'No se puede inicializar el servicio de Storage porque faltan credenciales de Supabase.',
                solucion: 'Configura las variables faltantes y pulsa "Re-validar Conexión".',
            });
            componentes.push({
                componente: 'Buckets',
                estado: 'Error',
                detalle: `Buckets requeridos (${config.buckets.public}, ${config.buckets.private}) sin verificar vía API.${bucketsLegacyDetectadosEnDb.length
                    ? ` Nota: En la BD existen los buckets: ${bucketsLegacyDetectadosEnDb.map((b) => b.name).join(', ')}.`
                    : ''}`,
                solucion: 'Configura SUPABASE_SERVICE_ROLE_KEY y luego ejecuta la inicialización automática o el script backend/prisma/migrations/05_supabase_storage_rls.sql.',
            });
            componentes.push({
                componente: 'Permisos',
                estado: 'Error',
                detalle: 'Sin clave de servidor ni clave anónima válida para comprobar permisos de Storage.',
                solucion: 'Configura SUPABASE_SERVICE_ROLE_KEY únicamente en el backend.',
            });
            return {
                timestamp: new Date().toISOString(),
                listoParaOperar: false,
                componentes,
                envStatus,
                bucketsEsperados: [
                    {
                        name: config.buckets.public,
                        publico: true,
                        existe: bucketsLegacyDetectadosEnDb.some((b) => b.name === config.buckets.public),
                        detalle: 'No verificado por API',
                    },
                    {
                        name: config.buckets.private,
                        publico: false,
                        existe: bucketsLegacyDetectadosEnDb.some((b) => b.name === config.buckets.private),
                        detalle: 'No verificado por API',
                    },
                ],
                bucketsDetectadosEnStorage: [],
                bucketsLegacyDetectadosEnDb,
            };
        }
        const adminClient = (0, client_1.getSupabaseAdminClient)();
        const publicClient = (0, client_1.getSupabasePublicClient)();
        const activeClient = adminClient || publicClient;
        if (!activeClient) {
            componentes.push({
                componente: 'Supabase',
                estado: 'Error',
                detalle: 'No se pudo instanciar el cliente de Supabase debido a URL o claves con formato inválido.',
                solucion: 'Revisa que SUPABASE_URL inicie con https:// y corresponda a tu proyecto Supabase.',
            });
        }
        else {
            componentes.push({
                componente: 'Supabase',
                estado: envStatus.hasServiceRoleKey && envStatus.hasAnonKey ? 'Correcto' : 'Advertencia',
                detalle: envStatus.hasServiceRoleKey && envStatus.hasAnonKey
                    ? 'Cliente de Supabase inicializado con credenciales públicas y administrativas de servidor.'
                    : !envStatus.hasServiceRoleKey
                        ? 'Cliente público conectado, pero falta SUPABASE_SERVICE_ROLE_KEY en el servidor para operaciones administrativas.'
                        : 'Cliente administrativo conectado, pero falta SUPABASE_ANON_KEY.',
                solucion: !envStatus.hasServiceRoleKey || !envStatus.hasAnonKey
                    ? 'Completa todas las variables recomendadas en backend/.env y frontend/.env.'
                    : undefined,
            });
        }
        let storageOk = false;
        let storageError = null;
        if (activeClient) {
            const { buckets, error } = await (0, storage_1.listStorageBuckets)(activeClient);
            if (error) {
                storageError = error;
                componentes.push({
                    componente: 'Storage',
                    estado: 'Error',
                    detalle: `Error al conectar con Supabase Storage: ${error}`,
                    solucion: 'Verifica que las claves SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY sean válidas y correspondan al mismo proyecto que SUPABASE_URL.',
                });
            }
            else {
                storageOk = true;
                bucketsDetectadosEnStorage = buckets;
                componentes.push({
                    componente: 'Storage',
                    estado: 'Correcto',
                    detalle: `Servicio Supabase Storage accesible (${buckets.length} bucket(s) visible(s)).`,
                });
            }
        }
        const bucketsEsperados = [
            { name: config.buckets.public, publico: true },
            { name: config.buckets.private, publico: false },
        ].map((expected) => {
            const found = bucketsDetectadosEnStorage.find((b) => b.name === expected.name);
            if (!found) {
                return {
                    ...expected,
                    existe: false,
                    detalle: `Bucket "${expected.name}" no existe en Supabase Storage.`,
                };
            }
            if (found.public !== expected.publico) {
                return {
                    ...expected,
                    existe: true,
                    detalle: `Bucket "${expected.name}" existe pero su visibilidad actual es ${found.public ? 'pública' : 'privada'} (se esperaba ${expected.publico ? 'pública' : 'privada'}).`,
                };
            }
            return {
                ...expected,
                existe: true,
                detalle: `Bucket "${expected.name}" configurado correctamente (${expected.publico ? 'Público' : 'Privado'}).`,
            };
        });
        const missingBuckets = bucketsEsperados.filter((b) => !b.existe);
        const mismatchedBuckets = bucketsEsperados.filter((b) => b.existe && b.detalle.includes('se esperaba'));
        if (!storageOk) {
            componentes.push({
                componente: 'Buckets',
                estado: 'Error',
                detalle: `No se pudieron inspeccionar los buckets requeridos (${storageError || 'error de Storage'}).`,
                solucion: 'Corrige primero la conexión a Supabase Storage.',
            });
        }
        else if (missingBuckets.length > 0) {
            componentes.push({
                componente: 'Buckets',
                estado: 'Error',
                detalle: `Faltan buckets obligatorios: ${missingBuckets.map((b) => b.name).join(', ')}.`,
                solucion: 'Haz clic en "Inicializar Buckets Automáticamente" o ejecuta backend/prisma/migrations/05_supabase_storage_rls.sql en el SQL Editor de Supabase.',
            });
        }
        else if (mismatchedBuckets.length > 0) {
            componentes.push({
                componente: 'Buckets',
                estado: 'Advertencia',
                detalle: mismatchedBuckets.map((b) => b.detalle).join(' '),
                solucion: 'Ejecuta "Inicializar Buckets Automáticamente" para sincronizar la visibilidad pública/privada correcta.',
            });
        }
        else {
            componentes.push({
                componente: 'Buckets',
                estado: 'Correcto',
                detalle: `Buckets "${config.buckets.public}" (público) y "${config.buckets.private}" (privado) verificados y activos.`,
            });
        }
        let permissionsOk = false;
        if (!envStatus.hasServiceRoleKey || !adminClient) {
            componentes.push({
                componente: 'Permisos',
                estado: 'Error',
                detalle: 'Falta SUPABASE_SERVICE_ROLE_KEY en el backend; la carga segura, eliminación y generación de URLs firmadas administrativas están bloqueadas.',
                solucion: 'Agrega SUPABASE_SERVICE_ROLE_KEY en backend/.env (nunca en frontend) y reinicia o re-valida.',
            });
        }
        else if (!storageOk) {
            componentes.push({
                componente: 'Permisos',
                estado: 'Error',
                detalle: 'No se pudieron validar los permisos debido a fallo previo de conexión con Storage.',
            });
        }
        else {
            const publicProbe = bucketsEsperados[0].existe
                ? await (0, storage_1.probeBucketReadAccess)(adminClient, config.buckets.public)
                : { accessible: false, error: 'Bucket público no encontrado' };
            const privateProbe = bucketsEsperados[1].existe
                ? await (0, storage_1.probeBucketReadAccess)(adminClient, config.buckets.private)
                : { accessible: false, error: 'Bucket privado no encontrado' };
            if (publicProbe.accessible && privateProbe.accessible) {
                permissionsOk = true;
                componentes.push({
                    componente: 'Permisos',
                    estado: 'Correcto',
                    detalle: 'Acceso administrativo verificado sobre ambos buckets (lectura, carga, reemplazo, URLs firmadas y eliminación activos).',
                });
            }
            else {
                componentes.push({
                    componente: 'Permisos',
                    estado: 'Error',
                    detalle: `Error de acceso en buckets: ${publicProbe.error || privateProbe.error}`,
                    solucion: 'Inicializa los buckets faltantes y revisa las políticas RLS definidas en backend/prisma/migrations/05_supabase_storage_rls.sql.',
                });
            }
        }
        const listoParaOperar = dbOk &&
            storageOk &&
            missingBuckets.length === 0 &&
            permissionsOk;
        return {
            timestamp: new Date().toISOString(),
            listoParaOperar,
            componentes,
            envStatus,
            bucketsEsperados,
            bucketsDetectadosEnStorage,
            bucketsLegacyDetectadosEnDb,
        };
    }
    async initializeRequiredBuckets() {
        const adminClient = (0, client_1.getSupabaseAdminClient)();
        if (!adminClient) {
            throw new common_1.ServiceUnavailableException('No se puede inicializar buckets: falta configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env.');
        }
        const config = (0, storage_config_1.getStorageConfig)();
        const publicRes = await (0, storage_1.ensureStorageBucket)(adminClient, config.buckets.public, true, config.maxImageSizeBytes, config.allowedMimeTypes);
        const privateRes = await (0, storage_1.ensureStorageBucket)(adminClient, config.buckets.private, false, config.maxImageSizeBytes, config.allowedMimeTypes);
        if (publicRes.error || privateRes.error) {
            throw new common_1.ServiceUnavailableException(`No fue posible inicializar todos los buckets: ${publicRes.error || privateRes.error}`);
        }
        const diagnostico = await this.runDiagnostics();
        return {
            success: true,
            resultados: {
                [config.buckets.public]: publicRes,
                [config.buckets.private]: privateRes,
            },
            diagnostico,
        };
    }
};
exports.SupabaseDiagnosticsService = SupabaseDiagnosticsService;
exports.SupabaseDiagnosticsService = SupabaseDiagnosticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupabaseDiagnosticsService);
//# sourceMappingURL=supabase-diagnostics.service.js.map