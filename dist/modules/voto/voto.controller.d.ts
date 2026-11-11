import { VotoService } from './voto.service';
import { ObtenerCedulaDto, EmitirVotoDto } from './dto/voto.dto';
export declare class VotoController {
    private readonly votoService;
    constructor(votoService: VotoService);
    obtenerCedula(dto: ObtenerCedulaDto): Promise<{
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
