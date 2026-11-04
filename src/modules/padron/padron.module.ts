import { Module } from '@nestjs/common';
import { PadronService } from './padron.service';
import { PadronController } from './padron.controller';

@Module({
  controllers: [PadronController],
  providers: [PadronService],
  exports: [PadronService],
})
export class PadronModule {}

