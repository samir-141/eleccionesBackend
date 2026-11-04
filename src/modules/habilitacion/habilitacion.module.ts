import { Module } from '@nestjs/common';
import { HabilitacionService } from './habilitacion.service';
import { HabilitacionController } from './habilitacion.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PuestosModule } from '../puestos/puestos.module';

@Module({
  imports: [AuditoriaModule, PuestosModule],
  controllers: [HabilitacionController],
  providers: [HabilitacionService],
  exports: [HabilitacionService],
})
export class HabilitacionModule {}

