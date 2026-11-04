import { Module } from '@nestjs/common';
import { EleccionService } from './eleccion.service';
import { EleccionController } from './eleccion.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [AuditoriaModule],
  controllers: [EleccionController, AdminAuthController],
  providers: [EleccionService],
  exports: [EleccionService],
})
export class EleccionModule {}

