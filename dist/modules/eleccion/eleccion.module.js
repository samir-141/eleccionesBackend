"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EleccionModule = void 0;
const common_1 = require("@nestjs/common");
const eleccion_service_1 = require("./eleccion.service");
const eleccion_controller_1 = require("./eleccion.controller");
const admin_auth_controller_1 = require("./admin-auth.controller");
const auditoria_module_1 = require("../auditoria/auditoria.module");
let EleccionModule = class EleccionModule {
};
exports.EleccionModule = EleccionModule;
exports.EleccionModule = EleccionModule = __decorate([
    (0, common_1.Module)({
        imports: [auditoria_module_1.AuditoriaModule],
        controllers: [eleccion_controller_1.EleccionController, admin_auth_controller_1.AdminAuthController],
        providers: [eleccion_service_1.EleccionService],
        exports: [eleccion_service_1.EleccionService],
    })
], EleccionModule);
//# sourceMappingURL=eleccion.module.js.map