import { PrismaService } from '../../../database/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { VerifiedActor } from '../../../lib/auth/token.utils';
import { MediaEntityLinkerHelper } from './media-entity-linker.helper';
export declare class ImageDeleteService {
    private readonly prisma;
    private readonly auditoria;
    private readonly linker;
    constructor(prisma: PrismaService, auditoria: AuditoriaService, linker: MediaEntityLinkerHelper);
    deleteImage(params: {
        mediaId: string;
        forzar?: boolean;
        actor: VerifiedActor;
        ip: string;
    }): Promise<{
        success: boolean;
        id: string;
        message: string;
    }>;
}
