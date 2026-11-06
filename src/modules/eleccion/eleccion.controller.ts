import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Ip,
  Headers,
} from '@nestjs/common';
import { EleccionService } from './eleccion.service';
import { CreateEleccionDto } from './dto/create-eleccion.dto';
import { UpdateEleccionDto } from './dto/update-eleccion.dto';
import { UpdateReglasDto } from './dto/update-reglas.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Controller('api/admin/elecciones')
export class EleccionController {
  constructor(
    private readonly eleccionService: EleccionService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateEleccionDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.eleccionService.create(dto, actorId, ip);
  }

  @Get()
  async findAll() {
    return this.eleccionService.findAll();
  }

  @Get('activa')
  async findActiva() {
    return this.eleccionService.findActiva();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eleccionService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEleccionDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.eleccionService.update(id, dto, actorId, ip);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.eleccionService.remove(id, actorId, ip);
  }

  @Get(':id/precondiciones')
  async validarPrecondiciones(@Param('id') id: string) {
    return this.eleccionService.validarPrecondicionesApertura(id);
  }

  @Post(':id/inicializar-mesas')
  async inicializarMesas(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.eleccionService.inicializarMesasInstitucionales(id, actorId, ip);
  }

  @Put(':id/reglas')
  async updateReglas(
    @Param('id') id: string,
    @Body() dto: UpdateReglasDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.eleccionService.updateReglas(id, dto, actorId, ip);
  }

  @Post(':id/abrir')
  async abrir(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.eleccionService.abrirEleccion(id, actorId, ip);
  }

  @Post(':id/cerrar')
  async cerrar(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.eleccionService.cerrarEleccion(id, actorId, ip);
  }

  @Post(':id/reaperturar')
  async reaperturar(
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.eleccionService.reaperturarEleccion(id, actorId, ip);
  }

  @Post('nueva')
  async crearNueva(
    @Body() dto: CreateEleccionDto,
    @Ip() ip: string,
    @Headers('x-actor-id') actorId = 'admin',
  ) {
    return this.eleccionService.create(dto, actorId, ip);
  }

  @Get(':id/auditoria')
  async getAuditoria(@Param('id') id: string) {
    return this.auditoriaService.obtenerPorEleccion(id);
  }
}

