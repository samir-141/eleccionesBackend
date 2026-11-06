import { Controller, Get, Post, Put, Delete, Body, Param, Ip, Headers } from '@nestjs/common';
import { PartidosService } from './partidos.service';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';

@Controller()
export class PartidosController {
  constructor(private readonly partidosService: PartidosService) {}

  @Post('api/admin/elecciones/:eleccionId/partidos')
  async crear(
    @Param('eleccionId') eleccionId: string,
    @Body() dto: CreatePartidoDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.partidosService.crearPartido(eleccionId, dto, actorId, ip);
  }

  @Put('api/admin/partidos/:id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdatePartidoDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.partidosService.actualizarPartido(id, dto, actorId, ip);
  }

  @Delete('api/admin/partidos/:id')
  async eliminar(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.partidosService.eliminarPartido(id, actorId, ip);
  }

  @Get('api/admin/elecciones/:eleccionId/partidos')
  async listar(@Param('eleccionId') eleccionId: string) {
    return this.partidosService.listarPorEleccion(eleccionId);
  }

  @Get('api/admin/elecciones/:eleccionId/partidos/cedula-preview')
  async previewCedula(@Param('eleccionId') eleccionId: string) {
    return this.partidosService.obtenerParaCedula(eleccionId);
  }

  @Get('api/docente/partidos')
  async listarDocente() {
    return this.partidosService.listarActivos();
  }
}

