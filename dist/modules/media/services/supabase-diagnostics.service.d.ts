import { PrismaService } from '../../../database/prisma.service';
import { SupabaseEnvStatus } from '../../../lib/supabase/client';
export type DiagnosticStatus = 'Correcto' | 'Advertencia' | 'Error';
export interface DiagnosticItem {
    componente: 'Supabase' | 'Storage' | 'Buckets' | 'Permisos' | 'Base de datos';
    estado: DiagnosticStatus;
    detalle: string;
    solucion?: string;
}
export interface SupabaseDiagnosticReport {
    timestamp: string;
    listoParaOperar: boolean;
    componentes: DiagnosticItem[];
    envStatus: SupabaseEnvStatus;
    bucketsEsperados: Array<{
        name: string;
        publico: boolean;
        existe: boolean;
        detalle: string;
    }>;
    bucketsDetectadosEnStorage: Array<{
        id: string;
        name: string;
        public: boolean;
    }>;
    bucketsLegacyDetectadosEnDb: Array<{
        id: string;
        name: string;
        public: boolean;
    }>;
}
export declare class SupabaseDiagnosticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    runDiagnostics(): Promise<SupabaseDiagnosticReport>;
    initializeRequiredBuckets(): Promise<{
        success: boolean;
        resultados: {
            [x: string]: {
                created: boolean;
                alreadyExists: boolean;
                error: string | null;
            };
        };
        diagnostico: SupabaseDiagnosticReport;
    }>;
}
