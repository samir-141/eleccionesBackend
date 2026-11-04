import { Controller, Get, Post, Param, Headers, Ip } from '@nestjs/common';
import { EscrutinioService } from './escrutinio.service';

@Controller()
export class EscrutinioController {
  constructor(private readonly escrutinioService: EscrutinioService) {}

  @Post('api/admin/elecciones/:eleccionId/escrutinio/ejecutar')
  async ejecutar(
    @Param('eleccionId') eleccionId: string,
    @Headers('x-actor-id') actorId = 'admin',
    @Ip() ip: string,
  ) {
    return this.escrutinioService.ejecutarEscrutinio(eleccionId, actorId, ip);
  }

  @Get('api/admin/elecciones/:eleccionId/escrutinio/resultado')
  async obtenerResultado(@Param('eleccionId') eleccionId: string) {
    return this.escrutinioService.obtenerResultado(eleccionId);
  }

  @Get('api/public/elecciones/:eleccionId/reporte')
  async obtenerReportePublico(@Param('eleccionId') eleccionId: string) {
    return this.escrutinioService.obtenerReporteOficial(eleccionId);
  }
}

