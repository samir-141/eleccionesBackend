import { Controller, Get, Post, Body, Param, Ip, Headers } from '@nestjs/common';
import { AulasService } from './aulas.service';
import { CreateAulaDto } from './dto/create-aula.dto';

@Controller('api/admin/elecciones/:eleccionId/aulas')
export class AulasController {
  constructor(private readonly aulasService: AulasService) {}

  @Post()
  async crear(
    @Param('eleccionId') eleccionId: string,
    @Body() dto: CreateAulaDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.aulasService.crearAula(eleccionId, dto, actorId, ip);
  }

  @Get()
  async listar(@Param('eleccionId') eleccionId: string) {
    return this.aulasService.listarPorEleccion(eleccionId);
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    return this.aulasService.obtenerPorId(id);
  }
}

