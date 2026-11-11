import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare const MEDIA_ROLES_KEY = "media_roles";
export declare const RequireMediaRoles: (...roles: Array<"ADMIN" | "DOCENTE">) => import("@nestjs/common").CustomDecorator<string>;
export declare class MediaAuthGuard implements CanActivate {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
