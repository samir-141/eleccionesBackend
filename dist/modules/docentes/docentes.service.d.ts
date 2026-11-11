import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateDocenteDto, LoginDocenteDto } from './dto/create-docente.dto';
export declare class DocentesService {
    private readonly prisma;
    private readonly auditoria;
    constructor(prisma: PrismaService, auditoria: AuditoriaService);
    crearDocente(eleccionId: string, dto: CreateDocenteDto, actorId?: string, ip?: string): Promise<{
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
    login(dto: LoginDocenteDto, ip?: string): Promise<{
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
        avatar_media_id: string | null;
        token: string;
    }>;
    listarPorEleccion(eleccionId: string): Promise<{
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
    eliminarDocente(id: string, actorId?: string, ip?: string): Promise<{
        mensaje: string;
    }>;
    desvincularDocenteAula(aulaId: string, actorId?: string, ip?: string): Promise<{
        mensaje: string;
        count?: undefined;
    } | {
        mensaje: string;
        count: number;
    }>;
}
