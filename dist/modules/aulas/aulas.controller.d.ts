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
