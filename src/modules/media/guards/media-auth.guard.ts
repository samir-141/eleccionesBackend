import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyBearerToken, VerifiedActor } from '../../../lib/auth/token.utils';

export const MEDIA_ROLES_KEY = 'media_roles';
export const RequireMediaRoles = (...roles: Array<'ADMIN' | 'DOCENTE'>) =>
  SetMetadata(MEDIA_ROLES_KEY, roles);

@Injectable()
export class MediaAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles =
      this.reflector.getAllAndOverride<Array<'ADMIN' | 'DOCENTE'>>(MEDIA_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || ['ADMIN'];

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined =
      request.headers?.authorization || request.headers?.Authorization;

    const actor: VerifiedActor | null = verifyBearerToken(authHeader);

    if (!actor) {
      throw new UnauthorizedException(
        'Se requiere autenticación válida de Administrador o Docente autorizado para gestionar medios.',
      );
    }

    if (!allowedRoles.includes(actor.rol)) {
      throw new ForbiddenException(
        `El rol "${actor.rol}" no tiene permisos para ejecutar esta operación sobre imágenes.`,
      );
    }

    request.actor = actor;
    return true;
  }
}
