import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MEDIA_CATEGORIAS, MediaCategoria } from '../../../lib/supabase/storage-config';

export class UploadMediaMetadataDto {
  @IsString()
  @IsIn([...MEDIA_CATEGORIAS], {
    message: `La categoría debe ser una de: ${MEDIA_CATEGORIAS.join(', ')}`,
  })
  categoria!: MediaCategoria;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  entidad_tipo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  entidad_id?: string;

  @IsUUID('4', { message: 'eleccion_id debe ser un UUID v4 válido' })
  @IsOptional()
  eleccion_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  alt_text?: string;
}

export class UpdateMediaDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  alt_text?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  entidad_tipo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  entidad_id?: string;

  @IsUUID('4')
  @IsOptional()
  eleccion_id?: string;
}

export class UpdateInstitucionMediaDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  nombre_institucion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  subtitulo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  titulo_portada?: string;

  @IsUUID('4')
  @IsOptional()
  logo_media_id?: string | null;

  @IsUUID('4')
  @IsOptional()
  banner_media_id?: string | null;
}

