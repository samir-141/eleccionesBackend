import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDocenteDto {
  @IsUUID()
  aula_id!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La contraseña temporal debe tener al menos 8 caracteres' })
  password!: string;
}

export class LoginDocenteDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  totp_code!: string;
}

