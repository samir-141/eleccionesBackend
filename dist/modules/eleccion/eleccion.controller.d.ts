import { EleccionService } from './eleccion.service';
import { CreateEleccionDto } from './dto/create-eleccion.dto';
import { UpdateEleccionDto } from './dto/update-eleccion.dto';
import { UpdateReglasDto } from './dto/update-reglas.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
export declare class EleccionController {
    private readonly eleccionService;
    private readonly auditoriaService;
    constructor(eleccionService: EleccionService, auditoriaService: AuditoriaService);
    create(dto: CreateEleccionDto, ip: string, actorId?: string): Promise<{
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
            logo_media_id: string | null;
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
        banner_url: string | null;
        banner_media_id: string | null;
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
        banner_url: string | null;
        banner_media_id: string | null;
    })[]>;
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
            logo_media_id: string | null;
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
        banner_url: string | null;
        banner_media_id: string | null;
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
            logo_media_id: string | null;
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
        banner_url: string | null;
        banner_media_id: string | null;
    }>;
    update(id: string, dto: UpdateEleccionDto, ip: string, actorId?: string): Promise<{
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
            logo_media_id: string | null;
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
        banner_url: string | null;
        banner_media_id: string | null;
    }>;
    remove(id: string, ip: string, actorId?: string): Promise<{
        success: boolean;
        message: string;
        id: string;
    }>;
    validarPrecondiciones(id: string): Promise<{
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
    inicializarMesas(id: string, ip: string, actorId?: string): Promise<{
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
    updateReglas(id: string, dto: UpdateReglasDto, ip: string, actorId?: string): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
        banner_url: string | null;
        banner_media_id: string | null;
    }>;
    abrir(id: string, ip: string, actorId?: string): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
        banner_url: string | null;
        banner_media_id: string | null;
    }>;
    cerrar(id: string, ip: string, actorId?: string): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
        banner_url: string | null;
        banner_media_id: string | null;
    }>;
    reaperturar(id: string, ip: string, actorId?: string): Promise<{
        id: string;
        created_at: Date;
        nombre: string;
        descripcion: string | null;
        estado: import(".prisma/client").$Enums.EleccionEstado;
        reglas: import("@prisma/client/runtime/library").JsonValue;
        huella_sha256: string | null;
        abierta_at: Date | null;
        cerrada_at: Date | null;
        banner_url: string | null;
        banner_media_id: string | null;
    }>;
    crearNueva(dto: CreateEleccionDto, ip: string, actorId?: string): Promise<{
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
            logo_media_id: string | null;
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
        banner_url: string | null;
        banner_media_id: string | null;
    }>;
    getAuditoria(id: string): Promise<{
        id: number;
        actor_tipo: string;
        actor_id: string;
        accion: string;
        entidad: string;
        entidad_id: string | null;
        datos_antes: import("@prisma/client/runtime/library").JsonValue | null;
        datos_despues: import("@prisma/client/runtime/library").JsonValue | null;
        ip: string | null;
        created_at: Date;
        eleccion_id: string | null;
    }[]>;
}
