import { PartidosService } from './partidos.service';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { CreateCandidatoDto, UpdateCandidatoDto } from './dto/candidato.dto';
export declare class PartidosController {
    private readonly partidosService;
    constructor(partidosService: PartidosService);
    crear(eleccionId: string, dto: CreatePartidoDto, ip: string, actorId?: string): Promise<{
        candidatos: {
            id: string;
            created_at: Date;
            eleccion_id: string;
            partido_id: string;
            nombres: string;
            apellidos: string;
            cargo: string;
            orden: number;
            foto_url: string | null;
            foto_media_id: string | null;
        }[];
    } & {
        id: string;
        eleccion_id: string;
        nombre: string;
        numero_lista: number;
        lema: string | null;
        logo_url: string | null;
        logo_media_id: string | null;
    }>;
    actualizar(id: string, dto: UpdatePartidoDto, ip: string, actorId?: string): Promise<{
        candidatos: {
            id: string;
            created_at: Date;
            eleccion_id: string;
            partido_id: string;
            nombres: string;
            apellidos: string;
            cargo: string;
            orden: number;
            foto_url: string | null;
            foto_media_id: string | null;
        }[];
    } & {
        id: string;
        eleccion_id: string;
        nombre: string;
        numero_lista: number;
        lema: string | null;
        logo_url: string | null;
        logo_media_id: string | null;
    }>;
    eliminar(id: string, ip: string, actorId?: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    listar(eleccionId: string): Promise<({
        candidatos: {
            id: string;
            created_at: Date;
            eleccion_id: string;
            partido_id: string;
            nombres: string;
            apellidos: string;
            cargo: string;
            orden: number;
            foto_url: string | null;
            foto_media_id: string | null;
        }[];
    } & {
        id: string;
        eleccion_id: string;
        nombre: string;
        numero_lista: number;
        lema: string | null;
        logo_url: string | null;
        logo_media_id: string | null;
    })[]>;
    previewCedula(eleccionId: string): Promise<{
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
    listarDocente(): Promise<({
        candidatos: {
            id: string;
            created_at: Date;
            eleccion_id: string;
            partido_id: string;
            nombres: string;
            apellidos: string;
            cargo: string;
            orden: number;
            foto_url: string | null;
            foto_media_id: string | null;
        }[];
    } & {
        id: string;
        eleccion_id: string;
        nombre: string;
        numero_lista: number;
        lema: string | null;
        logo_url: string | null;
        logo_media_id: string | null;
    })[]>;
    agregarCandidato(partidoId: string, dto: CreateCandidatoDto, ip: string, actorId?: string): Promise<{
        id: string;
        created_at: Date;
        eleccion_id: string;
        partido_id: string;
        nombres: string;
        apellidos: string;
        cargo: string;
        orden: number;
        foto_url: string | null;
        foto_media_id: string | null;
    }>;
    actualizarCandidato(id: string, dto: UpdateCandidatoDto, ip: string, actorId?: string): Promise<{
        id: string;
        created_at: Date;
        eleccion_id: string;
        partido_id: string;
        nombres: string;
        apellidos: string;
        cargo: string;
        orden: number;
        foto_url: string | null;
        foto_media_id: string | null;
    }>;
    eliminarCandidato(id: string, ip: string, actorId?: string): Promise<{
        ok: boolean;
        id: string;
    }>;
}
