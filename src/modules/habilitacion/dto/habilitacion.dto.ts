import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class ConsultarDniDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 15, { message: 'El DNI debe tener entre 6 y 15 caracteres' })
  dni!: string;

  @IsString()
  @IsIn(['CAMARA', 'MANUAL'])
  @IsOptional()
  origen_lectura: 'CAMARA' | 'MANUAL' = 'CAMARA';
}

export class ConfirmarHabilitacionDto {
  @IsString()
  @IsNotEmpty()
  elector_id!: string;
}

export class CancelarHabilitacionDto {
  @IsString()
  @IsNotEmpty()
  elector_id!: string;

  @IsString()
  @IsNotEmpty()
  motivo!: string;
}

