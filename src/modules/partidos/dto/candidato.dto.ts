import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCandidatoDto {
  @IsString()
  @IsNotEmpty({ message: 'Los nombres del candidato son obligatorios' })
  @MinLength(2)
  @MaxLength(100)
  nombres!: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos del candidato son obligatorios' })
  @MinLength(2)
  @MaxLength(100)
  apellidos!: string;

  @IsString()
  @IsNotEmpty({ message: 'El cargo postulante es obligatorio' })
  @MaxLength(100)
  cargo!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  orden?: number;

  @IsString()
  @IsOptional()
  foto_url?: string | null;

  @IsUUID('4')
  @IsOptional()
  foto_media_id?: string | null;
}

export class UpdateCandidatoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  nombres?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  apellidos?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  cargo?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  orden?: number;

  @IsString()
  @IsOptional()
  foto_url?: string | null;

  @IsUUID('4')
  @IsOptional()
  foto_media_id?: string | null;
}
