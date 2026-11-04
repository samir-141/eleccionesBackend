"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotoModule = void 0;
const common_1 = require("@nestjs/common");
const voto_service_1 = require("./voto.service");
const voto_controller_1 = require("./voto.controller");
const auditoria_module_1 = require("../auditoria/auditoria.module");
const partidos_module_1 = require("../partidos/partidos.module");
const puestos_module_1 = require("../puestos/puestos.module");
let VotoModule = class VotoModule {
};
exports.VotoModule = VotoModule;
exports.VotoModule = VotoModule = __decorate([
    (0, common_1.Module)({
        imports: [auditoria_module_1.AuditoriaModule, partidos_module_1.PartidosModule, puestos_module_1.PuestosModule],
        controllers: [voto_controller_1.VotoController],
        providers: [voto_service_1.VotoService],
        exports: [voto_service_1.VotoService],
    })
], VotoModule);
//# sourceMappingURL=voto.module.js.map