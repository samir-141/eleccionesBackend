import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SolicitarEmparejamientoDto {
  @IsUUID()
  @IsOptional()
  aula_id?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  numero_puesto?: number;
}

export class EmparejarPuestoDto {
  @IsString()
  @IsNotEmpty()
  token_qr!: string;
}

export class HeartbeatDto {
  @IsString()
  @IsNotEmpty()
  token_sesion!: string;
}

