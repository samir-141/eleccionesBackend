export declare class UpdateReglasDto {
    blanco_en_porcentaje?: boolean;
    porcentaje_minimo_ganar?: number;
    segunda_vuelta?: boolean;
    cuantos_pasan_segunda_vuelta?: number;
    quorum_porcentaje?: number;
    accion_sin_quorum?: 'DECLARAR_DESIERTA' | 'PRORROGAR';
    regla_empate?: 'SORTEO' | 'ANTIGUEDAD';
    duracion_reserva_segundos?: number;
    ip_restringida?: string | null;
}
