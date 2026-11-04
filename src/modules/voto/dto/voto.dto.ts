import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class ObtenerCedulaDto {
  @IsString()
  @IsNotEmpty()
  @Length(32, 128)
  token_voto!: string;
}

export class EmitirVotoDto {
  @IsString()
  @IsNotEmpty()
  @Length(32, 128)
  token_voto!: string;

  @IsString()
  @IsOptional()
  partido_id?: string | null;

  @IsBoolean()
  es_blanco!: boolean;
}

