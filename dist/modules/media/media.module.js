"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaModule = void 0;
const common_1 = require("@nestjs/common");
const auditoria_module_1 = require("../auditoria/auditoria.module");
const media_controller_1 = require("./media.controller");
const media_auth_guard_1 = require("./guards/media-auth.guard");
const image_validation_service_1 = require("./services/image-validation.service");
const supabase_diagnostics_service_1 = require("./services/supabase-diagnostics.service");
const image_upload_service_1 = require("./services/image-upload.service");
const image_update_service_1 = require("./services/image-update.service");
const image_delete_service_1 = require("./services/image-delete.service");
const media_query_service_1 = require("./services/media-query.service");
const media_entity_linker_helper_1 = require("./services/media-entity-linker.helper");
let MediaModule = class MediaModule {
};
exports.MediaModule = MediaModule;
exports.MediaModule = MediaModule = __decorate([
    (0, common_1.Module)({
        imports: [auditoria_module_1.AuditoriaModule],
        controllers: [media_controller_1.MediaController],
        providers: [
            media_auth_guard_1.MediaAuthGuard,
            image_validation_service_1.ImageValidationService,
            supabase_diagnostics_service_1.SupabaseDiagnosticsService,
            media_entity_linker_helper_1.MediaEntityLinkerHelper,
            image_upload_service_1.ImageUploadService,
            image_update_service_1.ImageUpdateService,
            image_delete_service_1.ImageDeleteService,
            media_query_service_1.MediaQueryService,
        ],
        exports: [
            image_validation_service_1.ImageValidationService,
            supabase_diagnostics_service_1.SupabaseDiagnosticsService,
            media_entity_linker_helper_1.MediaEntityLinkerHelper,
            media_query_service_1.MediaQueryService,
        ],
    })
], MediaModule);
//# sourceMappingURL=media.module.js.map