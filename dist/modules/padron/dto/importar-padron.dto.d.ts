export declare class ElectorCsvRowDto {
    dni: string;
    nombres: string;
    apellidos: string;
    grado_seccion: string;
    aula_numero: number;
}
export declare class ConfirmarImportacionDto {
    electores: ElectorCsvRowDto[];
}
export declare class ParseCsvDto {
    csv_content: string;
}
