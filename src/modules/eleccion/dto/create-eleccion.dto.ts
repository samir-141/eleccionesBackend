import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateEleccionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'El nombre de la elección debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El nombre de la elección no puede exceder 150 caracteres' })
  nombre!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;
}

