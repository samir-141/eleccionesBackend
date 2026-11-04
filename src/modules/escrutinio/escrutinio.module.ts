import { Module } from '@nestjs/common';
import { EscrutinioService } from './escrutinio.service';
import { EscrutinioController } from './escrutinio.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [AuditoriaModule],
  controllers: [EscrutinioController],
  providers: [EscrutinioService],
  exports: [EscrutinioService],
})
export class EscrutinioModule {}

