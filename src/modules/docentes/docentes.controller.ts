import { Controller, Get, Post, Delete, Body, Param, Ip, Headers } from '@nestjs/common';
import { DocentesService } from './docentes.service';
import { CreateDocenteDto, LoginDocenteDto } from './dto/create-docente.dto';

@Controller()
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Post('api/admin/elecciones/:eleccionId/docentes')
  async crear(
    @Param('eleccionId') eleccionId: string,
    @Body() dto: CreateDocenteDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.docentesService.crearDocente(eleccionId, dto, actorId, ip);
  }

  @Get('api/admin/elecciones/:eleccionId/docentes')
  async listar(@Param('eleccionId') eleccionId: string) {
    return this.docentesService.listarPorEleccion(eleccionId);
  }

  @Delete('api/admin/docentes/:id')
  async eliminar(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.docentesService.eliminarDocente(id, actorId, ip);
  }

  @Post('api/admin/aulas/:aulaId/docentes/desvincular')
  async desvincularDocenteAula(
    @Param('aulaId') aulaId: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.docentesService.desvincularDocenteAula(aulaId, actorId, ip);
  }

  @Post('api/docente/auth/login')
  async login(@Body() dto: LoginDocenteDto, @Ip() ip: string) {
    return this.docentesService.login(dto, ip);
  }
}

