import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateAulaDto } from './dto/create-aula.dto';
export declare class AulasService {
    private readonly prisma;
    private readonly auditoria;
    constructor(prisma: PrismaService, auditoria: AuditoriaService);
    crearAula(eleccionId: string, dto: CreateAulaDto, actorId?: string, ip?: string): Promise<{
        id: string;
        eleccion_id: string;
        nombre: string;
        numero: number;
        capacidad: number;
    }>;
    listarPorEleccion(eleccionId: string): Promise<({
        _count: {
            docentes: number;
            electores: number;
            puestos: number;
        };
    } & {
        id: string;
        eleccion_id: string;
        nombre: string;
        numero: number;
        capacidad: number;
    })[]>;
    obtenerPorId(id: string): Promise<{
        docentes: {
            id: string;
            username: string;
            activo: boolean;
        }[];
        _count: {
            electores: number;
        };
        puestos: {
            id: string;
            estado: import(".prisma/client").$Enums.PuestoEstado;
            aula_id: string;
            numero_puesto: number;
            token_sesion: string | null;
            ultimo_heartbeat: Date | null;
        }[];
    } & {
        id: string;
        eleccion_id: string;
        nombre: string;
        numero: number;
        capacidad: number;
    }>;
}
