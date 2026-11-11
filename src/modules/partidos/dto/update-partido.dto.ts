import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class UpdatePartidoDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  numero_lista?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @IsOptional()
  nombre?: string;

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

