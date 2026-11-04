import { PartidosService } from './partidos.service';
import { CreatePartidoDto } from './dto/create-partido.dto';
export declare class PartidosController {
    private readonly partidosService;
    constructor(partidosService: PartidosService);
    crear(eleccionId: string, dto: CreatePartidoDto, ip: string, actorId?: string): Promise<{
        id: string;
        eleccion_id: string;
        nombre: string;
        numero_lista: number;
        lema: string | null;
        logo_url: string | null;
    }>;
    listar(eleccionId: string): Promise<{
        id: string;
        eleccion_id: string;
        nombre: string;
        numero_lista: number;
        lema: string | null;
        logo_url: string | null;
    }[]>;
    previewCedula(eleccionId: string): Promise<{
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
