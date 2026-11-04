import { PrismaService } from '../../database/prisma.service';
export interface RegistrarAuditoriaParams {
    eleccion_id?: string;
    actor_tipo: 'ADMIN' | 'DOCENTE' | 'SISTEMA';
    actor_id: string;
    accion: string;
    entidad: string;
    entidad_id?: string;
    datos_antes?: any;
    datos_despues?: any;
    ip?: string;
}
export declare class AuditoriaService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    registrar(params: RegistrarAuditoriaParams): Promise<{
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
    }>;
    obtenerPorEleccion(eleccion_id: string): Promise<{
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
