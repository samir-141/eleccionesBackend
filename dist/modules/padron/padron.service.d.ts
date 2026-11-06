import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ElectorCsvRowDto } from './dto/importar-padron.dto';
export declare class PadronService {
    private readonly prisma;
    private readonly auditoria;
    constructor(prisma: PrismaService, auditoria: AuditoriaService);
    previsualizarCsv(eleccionId: string, csvContent: string): Promise<{
        total_lineas: number;
        total_validos: number;
        total_errores: number;
        validos: (ElectorCsvRowDto & {
            aula_id: string;
        })[];
        errores: {
            fila: number;
            dni?: string;
            motivo: string;
        }[];
        puede_importar: boolean;
    }>;
    confirmarImportacion(eleccionId: string, electores: ElectorCsvRowDto[], actorId?: string, ip?: string): Promise<{
        total_registrados: number;
    }>;
    listarElectores(eleccionId: string, page?: number, limit?: number, busqueda?: string): Promise<{
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
            dni: string;
            nombres: string;
            apellidos: string;
            grado_seccion: string;
        })[];
    }>;
    obtenerParaPantallaPuerta(aulaId: string): Promise<{
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
            dni: string;
            nombres: string;
            apellidos: string;
            grado_seccion: string;
        }[];
    }>;
}
