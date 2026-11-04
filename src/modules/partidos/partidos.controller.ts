import { Controller, Get, Post, Body, Param, Ip, Headers } from '@nestjs/common';
import { PartidosService } from './partidos.service';
import { CreatePartidoDto } from './dto/create-partido.dto';

@Controller('api/admin/elecciones/:eleccionId/partidos')
export class PartidosController {
  constructor(private readonly partidosService: PartidosService) {}

  @Post()
  async crear(
    @Param('eleccionId') eleccionId: string,
    @Body() dto: CreatePartidoDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.partidosService.crearPartido(eleccionId, dto, actorId, ip);
  }

  @Get()
  async listar(@Param('eleccionId') eleccionId: string) {
    return this.partidosService.listarPorEleccion(eleccionId);
  }

  @Get('cedula-preview')
  async previewCedula(@Param('eleccionId') eleccionId: string) {
    return this.partidosService.obtenerParaCedula(eleccionId);
  }
}

