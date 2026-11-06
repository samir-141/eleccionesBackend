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
        docentes: {
            id: string;
            username: string;
            activo: boolean;
        }[];
        electores: {
            id: string;
            estado: import(".prisma/client").$Enums.ElectorEstado;
            dni: string;
            nombres: string;
            apellidos: string;
            grado_seccion: string;
        }[];
        puestos: {
            id: string;
            estado: import(".prisma/client").$Enums.PuestoEstado;
            aula_id: string;
            numero_puesto: number;
            token_sesion: string | null;
            ultimo_heartbeat: Date | null;
        }[];
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
        puestos: {
            id: string;
            estado: import(".prisma/client").$Enums.PuestoEstado;
            aula_id: string;
            numero_puesto: number;
            token_sesion: string | null;
            ultimo_heartbeat: Date | null;
        }[];
        _count: {
            electores: number;
        };
    } & {
        id: string;
        eleccion_id: string;
        nombre: string;
        numero: number;
        capacidad: number;
    }>;
    moverElectorAula(electorId: string, nuevaAulaId: string, actorId?: string, ip?: string): Promise<{
        id: string;
        eleccion_id: string;
        estado: import(".prisma/client").$Enums.ElectorEstado;
        aula_id: string;
        dni: string;
        nombres: string;
        apellidos: string;
        grado_seccion: string;
    }>;
    desvincularPuestoAdmin(puestoId: string, actorId?: string, ip?: string): Promise<{
        id: string;
        estado: import(".prisma/client").$Enums.PuestoEstado;
        aula_id: string;
        numero_puesto: number;
        token_sesion: string | null;
        ultimo_heartbeat: Date | null;
    }>;
    actualizarAula(id: string, dto: {
        nombre?: string;
        capacidad?: number;
        numero?: number;
    }, actorId?: string, ip?: string): Promise<{
        id: string;
        eleccion_id: string;
        nombre: string;
        numero: number;
        capacidad: number;
    }>;
    eliminarAula(id: string, actorId?: string, ip?: string): Promise<{
        mensaje: string;
    }>;
}
