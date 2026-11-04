import { LoginAdminDto } from './dto/admin-auth.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EleccionService } from './eleccion.service';
export declare class AdminAuthController {
    private readonly auditoriaService;
    private readonly eleccionService;
    constructor(auditoriaService: AuditoriaService, eleccionService: EleccionService);
    login(dto: LoginAdminDto, ip: string): Promise<{
        status: string;
        token: string;
        user: {
            username: string;
            nombre: string;
            rol: string;
        };
    }>;
    verify(authHeader?: string): Promise<{
        valido: boolean;
        user: {
            username: string;
            nombre: string;
            rol: string;
        };
    }>;
}
