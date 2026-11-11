import { PadronService } from './padron.service';
import { ConfirmarImportacionDto, ParseCsvDto } from './dto/importar-padron.dto';
export declare class PadronController {
    private readonly padronService;
    constructor(padronService: PadronService);
    previsualizar(eleccionId: string, dto: ParseCsvDto): Promise<{
        total_lineas: number;
        total_validos: number;
        total_errores: number;
        validos: (import("./dto/importar-padron.dto").ElectorCsvRowDto & {
            aula_id: string;
        })[];
        errores: {
            fila: number;
            dni?: string;
            motivo: string;
        }[];
        puede_importar: boolean;
    }>;
    confirmar(eleccionId: string, dto: ConfirmarImportacionDto, ip: string, actorId?: string): Promise<{
        total_registrados: number;
    }>;
    listar(eleccionId: string, page?: string, limit?: string, busqueda?: string): Promise<{
        total: number;
        pagina: number;
        total_paginas: number;
        electores: ({
            aula: {
                nombre: string;
                numero: number;
            };
        } & {
            id: string;
            eleccion_id: string;
            estado: import(".prisma/client").$Enums.ElectorEstado;
            aula_id: string;
            nombres: string;
            apellidos: string;
            dni: string;
            grado_seccion: string;
        })[];
    }>;
    pantallaPuerta(aulaId: string): Promise<{
        eleccion: string;
        estado_eleccion: import(".prisma/client").$Enums.EleccionEstado;
        aula: {
            id: string;
            numero: number;
            nombre: string;
        };
        total_asignados: number;
        electores: {
            id: string;
            nombres: string;
            apellidos: string;
            grado_seccion: string;
        }[];
    }>;
    obtenerSalonDocente(aulaId: string): Promise<{
        aula: {
            id: string;
            numero: number;
            nombre: string;
        };
        total_asignados: number;
        total_votaron: number;
        total_pendientes: number;
        porcentaje_avance: number;
        electores: {
            id: string;
            estado: import(".prisma/client").$Enums.ElectorEstado;
            nombres: string;
            apellidos: string;
            dni: string;
            grado_seccion: string;
        }[];
    }>;
}
