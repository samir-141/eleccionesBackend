import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength, IsBoolean, IsUUID } from 'class-validator';

export class CreateEleccionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'El nombre de la elección debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El nombre de la elección no puede exceder 150 caracteres' })
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  clonarConfiguracion?: boolean;

  @IsBoolean()
  @IsOptional()
  clonarPadron?: boolean;

  @IsUUID('4', { message: 'El ID de la elección origen debe ser un UUID válido' })
  @IsOptional()
  eleccionOrigenId?: string;
}


