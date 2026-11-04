import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAulaDto {
  @IsInt()
  @Min(1, { message: 'El número de aula debe ser mayor o igual a 1' })
  numero!: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'El nombre del aula debe tener al menos 2 caracteres' })
  @MaxLength(100)
  nombre!: string;

  @IsInt()
  @Min(10, { message: 'El aforo mínimo sugerido es de 10 estudiantes' })
  @Max(100, { message: 'El aforo máximo sugerido es de 100 estudiantes' })
  capacidad = 50;
}

