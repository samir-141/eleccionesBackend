import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { CreateCandidatoDto, UpdateCandidatoDto } from './dto/candidato.dto';
export declare class PartidosService {
    private readonly prisma;
    private readonly auditoria;
    constructor(prisma: PrismaService, auditoria: AuditoriaService);
    private resolvePublicMediaRef;
    crearPartido(eleccionId: string, dto: CreatePartidoDto, actorId?: string, ip?: string): Promise<{
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
    actualizarPartido(id: string, dto: UpdatePartidoDto, actorId?: string, ip?: string): Promise<{
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
    eliminarPartido(id: string, actorId?: string, ip?: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    agregarCandidato(partidoId: string, dto: CreateCandidatoDto, actorId?: string, ip?: string): Promise<{
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
    actualizarCandidato(id: string, dto: UpdateCandidatoDto, actorId?: string, ip?: string): Promise<{
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
    eliminarCandidato(id: string, actorId?: string, ip?: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    listarPorEleccion(eleccionId: string): Promise<({
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
    listarActivos(): Promise<({
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
    obtenerParaCedula(eleccionId: string): Promise<{
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
}
