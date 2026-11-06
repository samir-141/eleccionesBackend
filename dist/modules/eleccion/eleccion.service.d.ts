import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateEleccionDto } from './dto/create-eleccion.dto';
import { UpdateEleccionDto } from './dto/update-eleccion.dto';
import { UpdateReglasDto } from './dto/update-reglas.dto';
export declare class EleccionService {
    private readonly prisma;
    private readonly auditoria;
    constructor(prisma: PrismaService, auditoria: AuditoriaService);
    create(dto: CreateEleccionDto, actorId?: string, ip?: string): Promise<{
        aulas: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero: number;
            capacidad: number;
        }[];
        partidos: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero_lista: number;
            lema: string | null;
            logo_url: string | null;
        }[];
        _count: {
            docentes: number;
            electores: number;
            urnas: number;
        };
    } & {
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
    }>;
    update(id: string, dto: UpdateEleccionDto, actorId?: string, ip?: string): Promise<{
        aulas: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero: number;
            capacidad: number;
        }[];
        partidos: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero_lista: number;
            lema: string | null;
            logo_url: string | null;
        }[];
        _count: {
            docentes: number;
            electores: number;
            urnas: number;
        };
    } & {
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
    }>;
    remove(id: string, actorId?: string, ip?: string): Promise<{
        success: boolean;
        message: string;
        id: string;
    }>;
    findAll(): Promise<({
        _count: {
            aulas: number;
            docentes: number;
            partidos: number;
            electores: number;
        };
    } & {
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
    })[]>;
    private readonly UUID_REGEX;
    findActiva(): Promise<{
        aulas: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero: number;
            capacidad: number;
        }[];
        partidos: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero_lista: number;
            lema: string | null;
            logo_url: string | null;
        }[];
        _count: {
            docentes: number;
            electores: number;
            urnas: number;
        };
    } & {
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
    }>;
    findOne(id: string): Promise<{
        aulas: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero: number;
            capacidad: number;
        }[];
        partidos: {
            id: string;
            eleccion_id: string;
            nombre: string;
            numero_lista: number;
            lema: string | null;
            logo_url: string | null;
        }[];
        _count: {
            docentes: number;
            electores: number;
            urnas: number;
        };
    } & {
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
    }>;
    updateReglas(id: string, dto: UpdateReglasDto, actorId?: string, ip?: string): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
    }>;
    validarPrecondicionesApertura(id: string): Promise<{
        eleccion_id: string;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        listo_para_abrir: boolean;
        requisitos: {
            aulas: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
            puestos: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
            docentes: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
            partidos: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
            padron: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
        };
    }>;
    inicializarMesasInstitucionales(id: string, actorId?: string, ip?: string): Promise<{
        eleccion_id: string;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        listo_para_abrir: boolean;
        requisitos: {
            aulas: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
            puestos: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
            docentes: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
            partidos: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
            padron: {
                total: number;
                ok: boolean;
                titulo: string;
                mensaje: string;
            };
        };
    }>;
    abrirEleccion(id: string, actorId?: string, ip?: string): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
    }>;
    cerrarEleccion(id: string, actorId?: string, ip?: string): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
    }>;
    reaperturarEleccion(id: string, actorId?: string, ip?: string): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
    }>;
}
