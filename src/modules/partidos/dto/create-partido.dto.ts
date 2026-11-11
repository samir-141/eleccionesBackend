import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePartidoDto {
  @IsInt()
  @Min(1, { message: 'El número de lista debe ser mayor o igual a 1' })
  numero_lista!: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'El nombre del partido debe tener al menos 2 caracteres' })
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  lema?: string;

  @IsString()
  @IsOptional()
  logo_url?: string | null;

  @IsUUID('4')
  @IsOptional()
  logo_media_id?: string | null;
}

