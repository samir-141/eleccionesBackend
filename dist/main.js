"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const env_config_1 = require("./config/env.config");
BigInt.prototype.toJSON = function () {
    const intVal = Number(this);
    return Number.isSafeInteger(intVal) ? intVal : this.toString();
};
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    await app.listen(env_config_1.env.PORT, '0.0.0.0');
    console.log(`Backend de Elecciones Escolares corriendo en http://0.0.0.0:${env_config_1.env.PORT} [Entorno: ${env_config_1.env.NODE_ENV}]`);
}
bootstrap();
//# sourceMappingURL=main.js.map