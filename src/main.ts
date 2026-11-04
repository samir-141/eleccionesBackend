import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { env } from './config/env.config';

// Polyfill global para serialización de BigInt en respuestas JSON de Express (Invariante I12 AuditoriaLog)
(BigInt.prototype as any).toJSON = function () {
  const intVal = Number(this);
  return Number.isSafeInteger(intVal) ? intVal : this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(env.PORT, '0.0.0.0');
  console.log(`Backend de Elecciones Escolares corriendo en http://0.0.0.0:${env.PORT} [Entorno: ${env.NODE_ENV}]`);
}
bootstrap();

