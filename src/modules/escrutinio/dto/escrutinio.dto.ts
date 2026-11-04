import { IsOptional, IsString } from 'class-validator';

export class EjecutarEscrutinioDto {
  @IsString()
  @IsOptional()
  observaciones?: string;
}

