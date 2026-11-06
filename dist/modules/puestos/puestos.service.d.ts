import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
export declare class PuestosService {
    private readonly prisma;
    private readonly auditoria;
    private tokensVotoPorPuesto;
    private maquinasPendientes;
    constructor(prisma: PrismaService, auditoria: AuditoriaService);
    setTokenVotoPuesto(puestoId: string, tokenVoto: string): void;
    limpiarTokenVotoPuesto(puestoId: string): void;
    obtenerTokenVotoPuesto(puestoId: string): string | undefined;
    solicitarEmparejamiento(aulaId?: string, numeroPuesto?: number): Promise<{
        puesto_id: string;
        numero_puesto: number;
        aula: string;
        qr_token: string;
        codigo_corto: string;
        qr_data_url: string;
        expires_at: Date;
    }>;
    emparejarConQr(docenteAulaId: string, tokenQr: string, actorId?: string, ip?: string): Promise<{
        puesto_id: string;
        numero_puesto: number;
        aula_id: string;
        aula_nombre: string;
        token_sesion: `${string}-${string}-${string}-${string}-${string}`;
        estado: import(".prisma/client").$Enums.PuestoEstado;
    } | {
        puesto_id: string;
        numero_puesto: number;
        aula_id: string;
        token_sesion: `${string}-${string}-${string}-${string}-${string}`;
        estado: import(".prisma/client").$Enums.PuestoEstado;
        aula_nombre?: undefined;
    }>;
    emparejarPuestoAdmin(aulaId: string, tokenQr: string, numeroPuesto?: number, actorId?: string, ip?: string): Promise<{
        puesto_id: string;
        numero_puesto: number;
        aula_id: string;
        aula_nombre: string;
        token_sesion: `${string}-${string}-${string}-${string}-${string}`;
        estado: import(".prisma/client").$Enums.PuestoEstado;
    }>;
    agregarPuestoAula(aulaId: string, actorId?: string, ip?: string): Promise<{
        id: string;
        estado: import(".prisma/client").$Enums.PuestoEstado;
        aula_id: string;
        numero_puesto: number;
        token_sesion: string | null;
        ultimo_heartbeat: Date | null;
    }>;
    registrarHeartbeat(tokenSesion: string): Promise<{
        ok: boolean;
        puesto_id: string;
        numero_puesto: number;
        estado: import(".prisma/client").$Enums.PuestoEstado;
    }>;
    verificarInactivosPorAula(aulaId: string): Promise<{
        id: string;
        estado: import(".prisma/client").$Enums.PuestoEstado;
        aula_id: string;
        numero_puesto: number;
        token_sesion: string | null;
        ultimo_heartbeat: Date | null;
    }[]>;
    verificarEstadoQr(tokenQr: string): Promise<{
        status: string;
        message: string;
        expires_at?: undefined;
        puesto_id?: undefined;
        numero_puesto?: undefined;
        aula_id?: undefined;
        aula_nombre?: undefined;
        token_sesion?: undefined;
        estado?: undefined;
    } | {
        status: string;
        message: string;
        expires_at: Date;
        puesto_id?: undefined;
        numero_puesto?: undefined;
        aula_id?: undefined;
        aula_nombre?: undefined;
        token_sesion?: undefined;
        estado?: undefined;
    } | {
        status: string;
        puesto_id: string | undefined;
        numero_puesto: number | undefined;
        aula_id: string | undefined;
        aula_nombre: string | undefined;
        token_sesion: string | undefined;
        estado: string;
        message?: undefined;
        expires_at?: undefined;
    } | {
        status: string;
        puesto_id: string;
        numero_puesto: number;
        aula_id: string;
        aula_nombre: string;
        token_sesion: string | null;
        estado: import(".prisma/client").$Enums.PuestoEstado;
        message?: undefined;
        expires_at?: undefined;
    }>;
    sincronizarPuesto(puestoId: string, tokenSesion: string): Promise<{
        ok: boolean;
        puesto_id: string;
        numero_puesto: number;
        aula_nombre: string;
        estado: "LIBRE" | "RESERVADO";
        token_voto: string | null;
    }>;
    desvincularPuesto(puestoId: string, tokenSesion: string): Promise<{
        ok: boolean;
        mensaje?: undefined;
    } | {
        ok: boolean;
        mensaje: string;
    }>;
}
