import { EscrutinioService } from './escrutinio.service';
export declare class EscrutinioController {
    private readonly escrutinioService;
    constructor(escrutinioService: EscrutinioService);
    ejecutar(eleccionId: string, actorId: string | undefined, ip: string): Promise<{
        ganador: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero_lista: number;
            lema: string | null;
            logo_url: string | null;
        } | null;
    } & {
        id: string;
        created_at: Date;
        eleccion_id: string;
        total_votos_urna: number;
        total_electores_votaron: number;
        conteo_partidos: import("@prisma/client/runtime/library").JsonValue;
        porcentajes_calculados: import("@prisma/client/runtime/library").JsonValue;
        ganador_partido_id: string | null;
        requiere_segunda_vuelta: boolean;
        partidos_segunda_vuelta: import("@prisma/client/runtime/library").JsonValue | null;
        quorum_cumplido: boolean;
        huella_verificada: boolean;
    }>;
    obtenerResultado(eleccionId: string): Promise<{
        eleccion: {
            id: string;
            created_at: Date;
            nombre: string;
            descripcion: string | null;
            estado: import(".prisma/client").$Enums.EleccionEstado;
            reglas: import("@prisma/client/runtime/library").JsonValue;
            huella_sha256: string | null;
            abierta_at: Date | null;
            cerrada_at: Date | null;
        };
        ganador: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero_lista: number;
            lema: string | null;
            logo_url: string | null;
        } | null;
    } & {
        id: string;
        created_at: Date;
        eleccion_id: string;
        total_votos_urna: number;
        total_electores_votaron: number;
        conteo_partidos: import("@prisma/client/runtime/library").JsonValue;
        porcentajes_calculados: import("@prisma/client/runtime/library").JsonValue;
        ganador_partido_id: string | null;
        requiere_segunda_vuelta: boolean;
        partidos_segunda_vuelta: import("@prisma/client/runtime/library").JsonValue | null;
        quorum_cumplido: boolean;
        huella_verificada: boolean;
    }>;
    obtenerReportePublico(eleccionId: string): Promise<{
        eleccion: {
            id: string;
            nombre: string;
            descripcion: string | null;
            estado: import(".prisma/client").$Enums.EleccionEstado;
            huella_sha256: string | null;
            abierta_at: Date | null;
            cerrada_at: Date | null;
            total_aulas: number;
            total_padron: number;
        };
        resultado: ({
            ganador: {
                id: string;
                eleccion_id: string;
                nombre: string;
                numero_lista: number;
                lema: string | null;
                logo_url: string | null;
            } | null;
        } & {
            id: string;
            created_at: Date;
            eleccion_id: string;
            total_votos_urna: number;
            total_electores_votaron: number;
            conteo_partidos: import("@prisma/client/runtime/library").JsonValue;
            porcentajes_calculados: import("@prisma/client/runtime/library").JsonValue;
            ganador_partido_id: string | null;
            requiere_segunda_vuelta: boolean;
            partidos_segunda_vuelta: import("@prisma/client/runtime/library").JsonValue | null;
            quorum_cumplido: boolean;
            huella_verificada: boolean;
        }) | null;
        verificacion_integridad: {
            huella_valida: boolean;
            invariante_i14_balance: boolean;
            protocolo_seguridad: string;
        };
    }>;
}
