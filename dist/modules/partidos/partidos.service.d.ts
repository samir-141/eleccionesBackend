import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreatePartidoDto } from './dto/create-partido.dto';
export declare class PartidosService {
    private readonly prisma;
    private readonly auditoria;
    constructor(prisma: PrismaService, auditoria: AuditoriaService);
    crearPartido(eleccionId: string, dto: CreatePartidoDto, actorId?: string, ip?: string): Promise<{
        id: string;
        eleccion_id: string;
        nombre: string;
        numero_lista: number;
        lema: string | null;
        logo_url: string | null;
    }>;
    listarPorEleccion(eleccionId: string): Promise<{
        id: string;
        eleccion_id: string;
        nombre: string;
        numero_lista: number;
        lema: string | null;
        logo_url: string | null;
    }[]>;
    obtenerParaCedula(eleccionId: string): Promise<{
        schema_version: string;
        opciones: {
            id: string;
            nombre: string;
            numero_lista: number;
            lema: string | null;
            logo_url: string | null;
        }[];
    }>;
}
