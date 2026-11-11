"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaAuthGuard = exports.RequireMediaRoles = exports.MEDIA_ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const token_utils_1 = require("../../../lib/auth/token.utils");
exports.MEDIA_ROLES_KEY = 'media_roles';
const RequireMediaRoles = (...roles) => (0, common_1.SetMetadata)(exports.MEDIA_ROLES_KEY, roles);
exports.RequireMediaRoles = RequireMediaRoles;
let MediaAuthGuard = class MediaAuthGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const allowedRoles = this.reflector.getAllAndOverride(exports.MEDIA_ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]) || ['ADMIN'];
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization || request.headers?.Authorization;
        const actor = (0, token_utils_1.verifyBearerToken)(authHeader);
        if (!actor) {
            throw new common_1.UnauthorizedException('Se requiere autenticación válida de Administrador o Docente autorizado para gestionar medios.');
        }
        if (!allowedRoles.includes(actor.rol)) {
            throw new common_1.ForbiddenException(`El rol "${actor.rol}" no tiene permisos para ejecutar esta operación sobre imágenes.`);
        }
        request.actor = actor;
        return true;
    }
};
exports.MediaAuthGuard = MediaAuthGuard;
exports.MediaAuthGuard = MediaAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], MediaAuthGuard);
//# sourceMappingURL=media-auth.guard.js.map