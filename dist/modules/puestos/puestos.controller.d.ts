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
        token_voto: string | null | undefined;
    }>;
    sincronizarGet(puestoId: string, tokenHeader: string): Promise<{
        ok: boolean;
        puesto_id: string;
        numero_puesto: number;
        aula_nombre: string;
        estado: "LIBRE" | "RESERVADO";
        token_voto: string | null | undefined;
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
        token_sesion: `${string}-${string}-${string}-${string}-${string}`;
        estado: import(".prisma/client").$Enums.PuestoEstado;
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
