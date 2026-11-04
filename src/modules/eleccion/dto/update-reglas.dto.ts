import { IsBoolean, IsNumber, IsOptional, IsString, IsIn, Min, Max } from 'class-validator';

export class UpdateReglasDto {
  @IsBoolean()
  @IsOptional()
  blanco_en_porcentaje?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentaje_minimo_ganar?: number;

  @IsBoolean()
  @IsOptional()
  segunda_vuelta?: boolean;

  @IsNumber()
  @Min(2)
  @Max(5)
  @IsOptional()
  cuantos_pasan_segunda_vuelta?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  quorum_porcentaje?: number;

  @IsString()
  @IsIn(['DECLARAR_DESIERTA', 'PRORROGAR'])
  @IsOptional()
  accion_sin_quorum?: 'DECLARAR_DESIERTA' | 'PRORROGAR';

  @IsString()
  @IsIn(['SORTEO', 'ANTIGUEDAD'])
  @IsOptional()
  regla_empate?: 'SORTEO' | 'ANTIGUEDAD';

  @IsNumber()
  @Min(60, { message: 'La duración mínima de reserva es 60 segundos' })
  @Max(600, { message: 'La duración máxima de reserva es 600 segundos (10 min)' })
  @IsOptional()
  duracion_reserva_segundos?: number;

  @IsString()
  @IsOptional()
  ip_restringida?: string | null;
}

