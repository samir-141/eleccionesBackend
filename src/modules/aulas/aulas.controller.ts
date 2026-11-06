import { Controller, Get, Post, Put, Delete, Body, Param, Ip, Headers } from '@nestjs/common';
import { AulasService } from './aulas.service';
import { CreateAulaDto } from './dto/create-aula.dto';

@Controller()
export class AulasController {
  constructor(private readonly aulasService: AulasService) {}

  @Post('api/admin/elecciones/:eleccionId/aulas')
  async crear(
    @Param('eleccionId') eleccionId: string,
    @Body() dto: CreateAulaDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.aulasService.crearAula(eleccionId, dto, actorId, ip);
  }

  @Get('api/admin/elecciones/:eleccionId/aulas')
  async listar(@Param('eleccionId') eleccionId: string) {
    return this.aulasService.listarPorEleccion(eleccionId);
  }

  @Get('api/admin/elecciones/:eleccionId/aulas/:id')
  async obtener(@Param('id') id: string) {
    return this.aulasService.obtenerPorId(id);
  }

  @Put('api/admin/aulas/:id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: { nombre?: string; capacidad?: number; numero?: number },
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.aulasService.actualizarAula(id, dto, actorId, ip);
  }

  @Delete('api/admin/aulas/:id')
  async eliminar(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.aulasService.eliminarAula(id, actorId, ip);
  }

  @Put('api/admin/electores/:electorId/mover-aula')
  async moverElector(
    @Param('electorId') electorId: string,
    @Body('nuevaAulaId') nuevaAulaId: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.aulasService.moverElectorAula(electorId, nuevaAulaId, actorId, ip);
  }

  @Post('api/admin/puestos/:puestoId/desvincular')
  async desvincularPuesto(
    @Param('puestoId') puestoId: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.aulasService.desvincularPuestoAdmin(puestoId, actorId, ip);
  }
}

