import { Module } from '@nestjs/common';
import { VotoService } from './voto.service';
import { VotoController } from './voto.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PartidosModule } from '../partidos/partidos.module';
import { PuestosModule } from '../puestos/puestos.module';

@Module({
  imports: [AuditoriaModule, PartidosModule, PuestosModule],
  controllers: [VotoController],
  providers: [VotoService],
  exports: [VotoService],
})
export class VotoModule {}

