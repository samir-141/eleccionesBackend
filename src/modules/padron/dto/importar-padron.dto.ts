import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ElectorCsvRowDto {
  @IsString()
  @IsNotEmpty()
  dni!: string;

  @IsString()
  @IsNotEmpty()
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  apellidos!: string;

  @IsString()
  @IsNotEmpty()
  grado_seccion!: string;

  @IsNotEmpty()
  aula_numero!: number;
}

export class ConfirmarImportacionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ElectorCsvRowDto)
  electores!: ElectorCsvRowDto[];
}

export class ParseCsvDto {
  @IsString()
  @IsNotEmpty()
  csv_content!: string;
}

