"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrutinioModule = void 0;
const common_1 = require("@nestjs/common");
const escrutinio_service_1 = require("./escrutinio.service");
const escrutinio_controller_1 = require("./escrutinio.controller");
const auditoria_module_1 = require("../auditoria/auditoria.module");
let EscrutinioModule = class EscrutinioModule {
};
exports.EscrutinioModule = EscrutinioModule;
exports.EscrutinioModule = EscrutinioModule = __decorate([
    (0, common_1.Module)({
        imports: [auditoria_module_1.AuditoriaModule],
        controllers: [escrutinio_controller_1.EscrutinioController],
        providers: [escrutinio_service_1.EscrutinioService],
        exports: [escrutinio_service_1.EscrutinioService],
    })
], EscrutinioModule);
//# sourceMappingURL=escrutinio.module.js.map