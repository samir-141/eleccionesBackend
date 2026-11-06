import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateEleccionDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la elección no puede estar vacío' })
  @MinLength(3, { message: 'El nombre de la elección debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El nombre de la elección no puede exceder 150 caracteres' })
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;
}

