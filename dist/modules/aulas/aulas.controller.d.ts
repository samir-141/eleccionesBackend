import { AulasService } from './aulas.service';
import { CreateAulaDto } from './dto/create-aula.dto';
export declare class AulasController {
    private readonly aulasService;
    constructor(aulasService: AulasService);
    crear(eleccionId: string, dto: CreateAulaDto, ip: string, actorId?: string): Promise<{
        id: string;
        eleccion_id: string;
        nombre: string;
        numero: number;
        capacidad: number;
    }>;
    listar(eleccionId: string): Promise<({
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
    obtener(id: string): Promise<{
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
    actualizar(id: string, dto: {
        nombre?: string;
        capacidad?: number;
        numero?: number;
    }, ip: string, actorId?: string): Promise<{
        id: string;
        eleccion_id: string;
        nombre: string;
        numero: number;
        capacidad: number;
    }>;
    eliminar(id: string, ip: string, actorId?: string): Promise<{
        mensaje: string;
    }>;
    moverElector(electorId: string, nuevaAulaId: string, ip: string, actorId?: string): Promise<{
        id: string;
        eleccion_id: string;
        estado: import(".prisma/client").$Enums.ElectorEstado;
        aula_id: string;
        dni: string;
        nombres: string;
        apellidos: string;
        grado_seccion: string;
    }>;
    desvincularPuesto(puestoId: string, ip: string, actorId?: string): Promise<{
        id: string;
        estado: import(".prisma/client").$Enums.PuestoEstado;
        aula_id: string;
        numero_puesto: number;
        token_sesion: string | null;
        ultimo_heartbeat: Date | null;
    }>;
}
