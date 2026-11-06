import { PuestosService } from './puestos.service';
import { SolicitarEmparejamientoDto, EmparejarPuestoDto, HeartbeatDto } from './dto/puestos.dto';
export declare class PuestosController {
    private readonly puestosService;
    constructor(puestosService: PuestosService);
    solicitar(dto: SolicitarEmparejamientoDto): Promise<{
        puesto_id: string;
        numero_puesto: number;
        aula: string;
        qr_token: string;
        codigo_corto: string;
        qr_data_url: string;
        expires_at: Date;
    }>;
    verificarQr(token: string): Promise<{
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
    sincronizar(body: {
        puesto_id: string;
        token_sesion: string;
    }, tokenHeader?: string): Promise<{
        ok: boolean;
        puesto_id: string;
        numero_puesto: number;
        aula_nombre: string;
        estado: "LIBRE" | "RESERVADO";
        token_voto: string | null;
    }>;
    sincronizarGet(puestoId: string, tokenHeader: string): Promise<{
        ok: boolean;
        puesto_id: string;
        numero_puesto: number;
        aula_nombre: string;
        estado: "LIBRE" | "RESERVADO";
        token_voto: string | null;
    }>;
    desvincular(body: {
        puesto_id: string;
        token_sesion: string;
    }, tokenHeader?: string): Promise<{
        ok: boolean;
        mensaje?: undefined;
    } | {
        ok: boolean;
        mensaje: string;
    }>;
    emparejar(dto: EmparejarPuestoDto, docenteAulaId: string, actorId: string | undefined, ip: string): Promise<{
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
    autorizarMaquinaAdmin(aulaId: string, body: {
        token_qr: string;
        numero_puesto?: number;
    }, actorId: string | undefined, ip: string): Promise<{
        puesto_id: string;
        numero_puesto: number;
        aula_id: string;
        aula_nombre: string;
        token_sesion: `${string}-${string}-${string}-${string}-${string}`;
        estado: import(".prisma/client").$Enums.PuestoEstado;
    }>;
    agregarPuestoAdmin(aulaId: string, actorId: string | undefined, ip: string): Promise<{
        id: string;
        estado: import(".prisma/client").$Enums.PuestoEstado;
        aula_id: string;
        numero_puesto: number;
        token_sesion: string | null;
        ultimo_heartbeat: Date | null;
    }>;
    heartbeat(dto: HeartbeatDto): Promise<{
        ok: boolean;
        puesto_id: string;
        numero_puesto: number;
        estado: import(".prisma/client").$Enums.PuestoEstado;
    }>;
    listarPuestosDocente(docenteAulaId: string): Promise<{
        id: string;
        estado: import(".prisma/client").$Enums.PuestoEstado;
        aula_id: string;
        numero_puesto: number;
        token_sesion: string | null;
        ultimo_heartbeat: Date | null;
    }[]>;
}
