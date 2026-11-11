import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PartidosService } from '../partidos/partidos.service';
import { PuestosService } from '../puestos/puestos.service';
import { EmitirVotoDto } from './dto/voto.dto';
export declare class VotoService {
    private readonly prisma;
    private readonly auditoria;
    private readonly partidosService;
    private readonly puestosService;
    constructor(prisma: PrismaService, auditoria: AuditoriaService, partidosService: PartidosService, puestosService: PuestosService);
    obtenerCedula(tokenVoto: string): Promise<{
        schema_version: string;
        opciones: {
            id: string;
            nombre: string;
            candidatos: {
                id: string;
                nombres: string;
                apellidos: string;
                cargo: string;
                foto_url: string | null;
            }[];
            numero_lista: number;
            lema: string | null;
            logo_url: string | null;
        }[];
    }>;
    emitirVoto(dto: EmitirVotoDto): Promise<{
        status: string;
        mensaje: string;
    }>;
}
