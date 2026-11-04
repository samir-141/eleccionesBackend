import { HabilitacionService } from './habilitacion.service';
import { ConsultarDniDto, ConfirmarHabilitacionDto, CancelarHabilitacionDto } from './dto/habilitacion.dto';
export declare class HabilitacionController {
    private readonly habilitacionService;
    constructor(habilitacionService: HabilitacionService);
    consultarDni(dto: ConsultarDniDto, docenteAulaId: string, actorId: string | undefined, ip: string): Promise<{
        elector_id: string;
        dni: string;
        nombres: string;
        apellidos: string;
        grado_seccion: string;
        aula_nombre: string;
    }>;
    confirmar(dto: ConfirmarHabilitacionDto, docenteAulaId: string, actorId: string | undefined, ip: string): Promise<{
        status: string;
        puesto_id: string;
        puesto_numero: number;
        mensaje: string;
        tiempo_reserva_segundos: any;
        token_voto: string;
    }>;
    cancelar(dto: CancelarHabilitacionDto, docenteAulaId: string, actorId: string | undefined, ip: string): Promise<{
        mensaje: string;
        puesto_liberado: number;
    }>;
}
