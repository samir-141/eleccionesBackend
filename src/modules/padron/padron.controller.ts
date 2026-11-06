import { Controller, Get, Post, Body, Param, Query, Ip, Headers } from '@nestjs/common';
import { PadronService } from './padron.service';
import { ConfirmarImportacionDto, ParseCsvDto } from './dto/importar-padron.dto';

@Controller()
export class PadronController {
  constructor(private readonly padronService: PadronService) {}

  @Post('api/admin/elecciones/:eleccionId/padron/previsualizar')
  async previsualizar(
    @Param('eleccionId') eleccionId: string,
    @Body() dto: ParseCsvDto,
  ) {
    return this.padronService.previsualizarCsv(eleccionId, dto.csv_content);
  }

  @Post('api/admin/elecciones/:eleccionId/padron/confirmar')
  async confirmar(
    @Param('eleccionId') eleccionId: string,
    @Body() dto: ConfirmarImportacionDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.padronService.confirmarImportacion(eleccionId, dto.electores, actorId, ip);
  }

  @Get('api/admin/elecciones/:eleccionId/padron')
  async listar(
    @Param('eleccionId') eleccionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.padronService.listarElectores(
      eleccionId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      busqueda,
    );
  }

  /**
   * Ruta pública para la pantalla en la puerta del aula.
   * Invariante I1: Jamás revela el estado del elector ni si ya votó.
   */
  @Get('api/public/pantalla-puerta/:aulaId')
  async pantallaPuerta(@Param('aulaId') aulaId: string) {
    return this.padronService.obtenerParaPantallaPuerta(aulaId);
  }

  /**
   * Vista de Salón para el Docente de Aula:
   * Muestra sus alumnos, estado (VOTÓ / PENDIENTE) y avance de la mesa.
   */
  @Get('api/docente/aula/:aulaId/salon')
  async obtenerSalonDocente(@Param('aulaId') aulaId: string) {
    return this.padronService.obtenerSalonDocente(aulaId);
  }
}

