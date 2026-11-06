export declare class ConsultarDniDto {
    dni: string;
    origen_lectura: 'CAMARA' | 'MANUAL';
}
export declare class ConfirmarHabilitacionDto {
    elector_id: string;
    puesto_id?: string;
}
export declare class CancelarHabilitacionDto {
    elector_id: string;
    motivo: string;
}
