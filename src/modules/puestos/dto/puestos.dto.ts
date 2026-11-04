import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class SolicitarEmparejamientoDto {
  @IsUUID()
  aula_id!: string;

  @IsInt()
  @Min(1)
  numero_puesto!: number;
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

