"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HabilitacionModule = void 0;
const common_1 = require("@nestjs/common");
const habilitacion_service_1 = require("./habilitacion.service");
const habilitacion_controller_1 = require("./habilitacion.controller");
const auditoria_module_1 = require("../auditoria/auditoria.module");
const puestos_module_1 = require("../puestos/puestos.module");
let HabilitacionModule = class HabilitacionModule {
};
exports.HabilitacionModule = HabilitacionModule;
exports.HabilitacionModule = HabilitacionModule = __decorate([
    (0, common_1.Module)({
        imports: [auditoria_module_1.AuditoriaModule, puestos_module_1.PuestosModule],
        controllers: [habilitacion_controller_1.HabilitacionController],
        providers: [habilitacion_service_1.HabilitacionService],
        exports: [habilitacion_service_1.HabilitacionService],
    })
], HabilitacionModule);
//# sourceMappingURL=habilitacion.module.js.map