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
exports.EleccionController = void 0;
const common_1 = require("@nestjs/common");
const eleccion_service_1 = require("./eleccion.service");
const create_eleccion_dto_1 = require("./dto/create-eleccion.dto");
const update_reglas_dto_1 = require("./dto/update-reglas.dto");
const auditoria_service_1 = require("../auditoria/auditoria.service");
let EleccionController = class EleccionController {
    eleccionService;
    auditoriaService;
    constructor(eleccionService, auditoriaService) {
        this.eleccionService = eleccionService;
        this.auditoriaService = auditoriaService;
    }
    async create(dto, ip, actorId = 'admin') {
        return this.eleccionService.create(dto, actorId, ip);
    }
    async findAll() {
        return this.eleccionService.findAll();
    }
    async findActiva() {
        return this.eleccionService.findActiva();
    }
    async findOne(id) {
        return this.eleccionService.findOne(id);
    }
    async validarPrecondiciones(id) {
        return this.eleccionService.validarPrecondicionesApertura(id);
    }
    async inicializarMesas(id, ip, actorId = 'admin') {
        return this.eleccionService.inicializarMesasInstitucionales(id, actorId, ip);
    }
    async updateReglas(id, dto, ip, actorId = 'admin') {
        return this.eleccionService.updateReglas(id, dto, actorId, ip);
    }
    async abrir(id, ip, actorId = 'admin') {
        return this.eleccionService.abrirEleccion(id, actorId, ip);
    }
    async cerrar(id, ip, actorId = 'admin') {
        return this.eleccionService.cerrarEleccion(id, actorId, ip);
    }
    async reaperturar(id, ip, actorId = 'admin') {
        return this.eleccionService.reaperturarEleccion(id, actorId, ip);
    }
    async crearNueva(dto, ip, actorId = 'admin') {
        return this.eleccionService.create(dto, actorId, ip);
    }
    async getAuditoria(id) {
        return this.auditoriaService.obtenerPorEleccion(id);
    }
};
exports.EleccionController = EleccionController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_eleccion_dto_1.CreateEleccionDto, String, Object]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('activa'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "findActiva", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/precondiciones'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "validarPrecondiciones", null);
__decorate([
    (0, common_1.Post)(':id/inicializar-mesas'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "inicializarMesas", null);
__decorate([
    (0, common_1.Put)(':id/reglas'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_reglas_dto_1.UpdateReglasDto, String, Object]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "updateReglas", null);
__decorate([
    (0, common_1.Post)(':id/abrir'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "abrir", null);
__decorate([
    (0, common_1.Post)(':id/cerrar'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "cerrar", null);
__decorate([
    (0, common_1.Post)(':id/reaperturar'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "reaperturar", null);
__decorate([
    (0, common_1.Post)('nueva'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('x-actor-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_eleccion_dto_1.CreateEleccionDto, String, Object]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "crearNueva", null);
__decorate([
    (0, common_1.Get)(':id/auditoria'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EleccionController.prototype, "getAuditoria", null);
exports.EleccionController = EleccionController = __decorate([
    (0, common_1.Controller)('api/admin/elecciones'),
    __metadata("design:paramtypes", [eleccion_service_1.EleccionService,
        auditoria_service_1.AuditoriaService])
], EleccionController);
//# sourceMappingURL=eleccion.controller.js.map