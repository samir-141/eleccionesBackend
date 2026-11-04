import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginAdminDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password!: string;
}

