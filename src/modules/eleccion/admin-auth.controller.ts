import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Ip,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginAdminDto } from './dto/admin-auth.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EleccionService } from './eleccion.service';
import { issueAdminToken, verifyBearerToken } from '../../lib/auth/token.utils';

@Controller('api/admin/auth')
export class AdminAuthController {
  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly eleccionService: EleccionService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginAdminDto, @Ip() ip: string) {
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    // Obtener id de elección activa si existe (opcional)
    let eleccionId: string | undefined = undefined;
    try {
      const activa = await this.eleccionService.findActiva();
      eleccionId = activa?.id;
    } catch {
      // Si no existe elección, eleccionId queda como undefined (NULL en base de datos)
    }

    if (
      dto.username.trim().toLowerCase() !== adminUser.toLowerCase() ||
      dto.password !== adminPass
    ) {
      await this.auditoriaService.registrar({
        eleccion_id: eleccionId,
        actor_tipo: 'ADMIN',
        actor_id: dto.username,
        accion: 'LOGIN_ADMIN_FALLIDO',
        entidad: 'admin_auth',
        ip,
      });

      throw new UnauthorizedException('Usuario o contraseña de administrador incorrectos.');
    }

    const token = issueAdminToken(adminUser);

    await this.auditoriaService.registrar({
      eleccion_id: eleccionId,
      actor_tipo: 'ADMIN',
      actor_id: 'admin',
      accion: 'LOGIN_ADMIN_EXITOSO',
      entidad: 'admin_auth',
      ip,
    });

    return {
      status: 'AUTORIZADO',
      token,
      user: {
        username: 'admin',
        nombre: 'Administrador Electoral Institucional',
        rol: 'ADMIN',
      },
    };
  }

  @Get('verify')
  async verify(@Headers('authorization') authHeader?: string) {
    const actor = verifyBearerToken(authHeader);
    if (!actor || actor.rol !== 'ADMIN') {
      throw new UnauthorizedException('Token de administrador no válido o expirado.');
    }

    return {
      valido: true,
      user: {
        username: actor.username,
        nombre: 'Administrador Electoral Institucional',
        rol: 'ADMIN',
      },
    };
  }
}

