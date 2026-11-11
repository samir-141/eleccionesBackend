import { PrismaService } from '../../../database/prisma.service';
export interface MediaUsageRef {
    tipo: 'partido' | 'candidato' | 'docente' | 'eleccion' | 'institucion';
    id: string;
    etiqueta: string;
}
export declare class MediaEntityLinkerHelper {
    private readonly prisma;
    constructor(prisma: PrismaService);
    resolveDisplayUrl(media: {
        bucket: string;
        ruta_archivo: string;
        url_publica: string | null;
        es_privado: boolean;
    }): Promise<string | null>;
    linkMediaToEntity(params: {
        mediaId: string;
        urlPublica: string | null;
        esPrivado: boolean;
        entidadTipo?: string;
        entidadId?: string;
    }): Promise<void>;
    propagateUpdatedUrl(mediaId: string, nuevaUrlPublica: string | null): Promise<void>;
    clearEntityReferences(mediaId: string): Promise<void>;
    getUsageMap(mediaIds: string[]): Promise<Map<string, MediaUsageRef[]>>;
}
