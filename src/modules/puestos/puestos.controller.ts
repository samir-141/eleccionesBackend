import { Controller, Get, Post, Body, Param, Headers, Ip } from '@nestjs/common';
import { PuestosService } from './puestos.service';
import { SolicitarEmparejamientoDto, EmparejarPuestoDto, HeartbeatDto } from './dto/puestos.dto';

@Controller()
export class PuestosController {
  constructor(private readonly puestosService: PuestosService) {}

  @Post('api/puesto/solicitar-emparejamiento')
  async solicitar(@Body() dto: SolicitarEmparejamientoDto) {
    return this.puestosService.solicitarEmparejamiento(dto.aula_id, dto.numero_puesto);
  }

  @Get('api/puesto/verificar-qr/:token')
  async verificarQr(@Param('token') token: string) {
    return this.puestosService.verificarEstadoQr(token);
  }

  @Post('api/puesto/sincronizar')
  async sincronizar(
    @Body() body: { puesto_id: string; token_sesion: string },
    @Headers('x-puesto-token') tokenHeader?: string,
  ) {
    const token = body.token_sesion || tokenHeader || '';
    return this.puestosService.sincronizarPuesto(body.puesto_id, token);
  }

  @Get('api/puesto/:id/sincronizar')
  async sincronizarGet(
    @Param('id') puestoId: string,
    @Headers('x-puesto-token') tokenHeader: string,
  ) {
    return this.puestosService.sincronizarPuesto(puestoId, tokenHeader);
  }

  @Post('api/puesto/desvincular')
  async desvincular(
    @Body() body: { puesto_id: string; token_sesion: string },
    @Headers('x-puesto-token') tokenHeader?: string,
  ) {
    const token = body.token_sesion || tokenHeader || '';
    return this.puestosService.desvincularPuesto(body.puesto_id, token);
  }

  @Post('api/docente/puestos/emparejar')
  async emparejar(
    @Body() dto: EmparejarPuestoDto,
    @Headers('x-docente-aula-id') docenteAulaId: string,
    @Headers('x-actor-id') actorId = 'docente',
    @Ip() ip: string,
  ) {
    return this.puestosService.emparejarConQr(docenteAulaId, dto.token_qr, actorId, ip);
  }

  @Post('api/puesto/heartbeat')
  async heartbeat(@Body() dto: HeartbeatDto) {
    return this.puestosService.registrarHeartbeat(dto.token_sesion);
  }

  @Get('api/docente/puestos')
  async listarPuestosDocente(@Headers('x-docente-aula-id') docenteAulaId: string) {
    return this.puestosService.verificarInactivosPorAula(docenteAulaId);
  }
}

