import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PuestosService } from '../puestos/puestos.service';
import { ConsultarDniDto } from './dto/habilitacion.dto';
export declare class HabilitacionService {
    private readonly prisma;
    private readonly auditoria;
    private readonly puestosService;
    constructor(prisma: PrismaService, auditoria: AuditoriaService, puestosService: PuestosService);
    private resolverAulaId;
    private sanitizarUuid;
    consultarDni(rawDocenteAulaId: string, docenteId: string, dto: ConsultarDniDto, ip?: string): Promise<{
        elector_id: string;
        dni: string;
        nombres: string;
        apellidos: string;
        grado_seccion: string;
        aula_nombre: string;
    }>;
    confirmarHabilitacion(rawDocenteAulaId: string, docenteId: string, electorId: string, puestoIdDeseado?: string, ip?: string): Promise<{
        status: string;
        puesto_id: string;
        puesto_numero: number;
        mensaje: string;
        tiempo_reserva_segundos: any;
        token_voto: string;
    }>;
    cancelarHabilitacion(rawDocenteAulaId: string, docenteId: string, electorId: string, motivo: string, ip?: string): Promise<{
        mensaje: string;
        puesto_liberado: number;
    }>;
    limpiarHabilitacionesExpiradas(): Promise<void>;
}
