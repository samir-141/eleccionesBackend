import {
  Controller,
  Post,
  Body,
  Headers,
  Ip,
  BadRequestException,
} from '@nestjs/common';
import { HabilitacionService } from './habilitacion.service';
import {
  ConsultarDniDto,
  ConfirmarHabilitacionDto,
  CancelarHabilitacionDto,
} from './dto/habilitacion.dto';

@Controller('api/docente/habilitacion')
export class HabilitacionController {
  constructor(private readonly habilitacionService: HabilitacionService) {}

  @Post('consultar-dni')
  async consultarDni(
    @Body() dto: ConsultarDniDto,
    @Headers('x-docente-aula-id') docenteAulaId: string,
    @Headers('x-actor-id') actorId = 'docente',
    @Ip() ip: string,
  ) {
    if (!docenteAulaId) {
      throw new BadRequestException('Cabecera x-docente-aula-id requerida para operar en el aula.');
    }
    return this.habilitacionService.consultarDni(docenteAulaId, actorId, dto, ip);
  }

  @Post('confirmar')
  async confirmar(
    @Body() dto: ConfirmarHabilitacionDto,
    @Headers('x-docente-aula-id') docenteAulaId: string,
    @Headers('x-actor-id') actorId = 'docente',
    @Ip() ip: string,
  ) {
    if (!docenteAulaId) {
      throw new BadRequestException('Cabecera x-docente-aula-id requerida para operar en el aula.');
    }
    return this.habilitacionService.confirmarHabilitacion(docenteAulaId, actorId, dto.elector_id, dto.puesto_id, ip);
  }

  @Post('cancelar')
  async cancelar(
    @Body() dto: CancelarHabilitacionDto,
    @Headers('x-docente-aula-id') docenteAulaId: string,
    @Headers('x-actor-id') actorId = 'docente',
    @Ip() ip: string,
  ) {
    if (!docenteAulaId) {
      throw new BadRequestException('Cabecera x-docente-aula-id requerida para operar en el aula.');
    }
    return this.habilitacionService.cancelarHabilitacion(
      docenteAulaId,
      actorId,
      dto.elector_id,
      dto.motivo,
      ip,
    );
  }
}

