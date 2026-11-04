import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { EleccionModule } from './modules/eleccion/eleccion.module';
import { AulasModule } from './modules/aulas/aulas.module';
import { PartidosModule } from './modules/partidos/partidos.module';
import { PadronModule } from './modules/padron/padron.module';
import { DocentesModule } from './modules/docentes/docentes.module';
import { PuestosModule } from './modules/puestos/puestos.module';
import { HabilitacionModule } from './modules/habilitacion/habilitacion.module';
import { VotoModule } from './modules/voto/voto.module';
import { EscrutinioModule } from './modules/escrutinio/escrutinio.module';

@Module({
  imports: [
    DatabaseModule,
    AuditoriaModule,
    EleccionModule,
    AulasModule,
    PartidosModule,
    PadronModule,
    DocentesModule,
    PuestosModule,
    HabilitacionModule,
    VotoModule,
    EscrutinioModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

