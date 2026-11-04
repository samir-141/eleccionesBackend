"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("./database/database.module");
const auditoria_module_1 = require("./modules/auditoria/auditoria.module");
const eleccion_module_1 = require("./modules/eleccion/eleccion.module");
const aulas_module_1 = require("./modules/aulas/aulas.module");
const partidos_module_1 = require("./modules/partidos/partidos.module");
const padron_module_1 = require("./modules/padron/padron.module");
const docentes_module_1 = require("./modules/docentes/docentes.module");
const puestos_module_1 = require("./modules/puestos/puestos.module");
const habilitacion_module_1 = require("./modules/habilitacion/habilitacion.module");
const voto_module_1 = require("./modules/voto/voto.module");
const escrutinio_module_1 = require("./modules/escrutinio/escrutinio.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            auditoria_module_1.AuditoriaModule,
            eleccion_module_1.EleccionModule,
            aulas_module_1.AulasModule,
            partidos_module_1.PartidosModule,
            padron_module_1.PadronModule,
            docentes_module_1.DocentesModule,
            puestos_module_1.PuestosModule,
            habilitacion_module_1.HabilitacionModule,
            voto_module_1.VotoModule,
            escrutinio_module_1.EscrutinioModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map