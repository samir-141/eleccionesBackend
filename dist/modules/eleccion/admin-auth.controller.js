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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthController = void 0;
const common_1 = require("@nestjs/common");
const admin_auth_dto_1 = require("./dto/admin-auth.dto");
const auditoria_service_1 = require("../auditoria/auditoria.service");
const eleccion_service_1 = require("./eleccion.service");
const crypto = require("crypto");
let AdminAuthController = class AdminAuthController {
    auditoriaService;
    eleccionService;
    constructor(auditoriaService, eleccionService) {
        this.auditoriaService = auditoriaService;
        this.eleccionService = eleccionService;
    }
    async login(dto, ip) {
        const adminUser = process.env.ADMIN_USER || 'admin';
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        let eleccionId = undefined;
        try {
            const activa = await this.eleccionService.findActiva();
            eleccionId = activa?.id;
        }
        catch {
        }
        if (dto.username.trim().toLowerCase() !== adminUser.toLowerCase() ||
            dto.password !== adminPass) {
            await this.auditoriaService.registrar({
                eleccion_id: eleccionId,
                actor_tipo: 'ADMIN',
                actor_id: dto.username,
                accion: 'LOGIN_ADMIN_FALLIDO',
                entidad: 'admin_auth',
                ip,
            });
            throw new common_1.UnauthorizedException('Usuario o contraseña de administrador incorrectos.');
        }
        const token = `admin_sec_${crypto.randomBytes(24).toString('hex')}`;
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
    async verify(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer admin_sec_')) {
            throw new common_1.UnauthorizedException('Token de administrador no válido o expirado.');
        }
        return {
            valido: true,
            user: {
                username: 'admin',
                nombre: 'Administrador Electoral Institucional',
                rol: 'ADMIN',
            },
        };
    }
};
exports.AdminAuthController = AdminAuthController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_auth_dto_1.LoginAdminDto, String]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('verify'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "verify", null);
exports.AdminAuthController = AdminAuthController = __decorate([
    (0, common_1.Controller)('api/admin/auth'),
    __metadata("design:paramtypes", [auditoria_service_1.AuditoriaService,
        eleccion_service_1.EleccionService])
], AdminAuthController);
//# sourceMappingURL=admin-auth.controller.js.map