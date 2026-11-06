import { DocentesService } from './docentes.service';
import { CreateDocenteDto, LoginDocenteDto } from './dto/create-docente.dto';
export declare class DocentesController {
    private readonly docentesService;
    constructor(docentesService: DocentesService);
    crear(eleccionId: string, dto: CreateDocenteDto, ip: string, actorId?: string): Promise<{
        id: string;
        username: string;
        aula: {
            nombre: string;
            numero: number;
        };
        totp_secret: string;
        qr_setup_data_url?: undefined;
    } | {
        id: string;
        username: string;
        aula: {
            nombre: string;
            numero: number;
        };
        totp_secret: string;
        qr_setup_data_url: string;
    }>;
    listar(eleccionId: string): Promise<{
        aula: {
            id: string;
            nombre: string;
            numero: number;
        };
        id: string;
        created_at: Date;
        username: string;
        activo: boolean;
    }[]>;
    eliminar(id: string, ip: string, actorId?: string): Promise<{
        mensaje: string;
    }>;
    desvincularDocenteAula(aulaId: string, ip: string, actorId?: string): Promise<{
        mensaje: string;
        count?: undefined;
    } | {
        mensaje: string;
        count: number;
    }>;
    login(dto: LoginDocenteDto, ip: string): Promise<{
        docente_id: string;
        username: string;
        aula: {
            id: string;
            nombre: string;
            numero: number;
        };
        eleccion: {
            id: string;
            nombre: string;
            estado: import(".prisma/client").$Enums.EleccionEstado;
        };
        token: string;
    }>;
}
