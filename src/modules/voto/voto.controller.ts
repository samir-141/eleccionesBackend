import { Controller, Post, Body, Header, HttpCode, HttpStatus } from '@nestjs/common';
import { VotoService } from './voto.service';
import { ObtenerCedulaDto, EmitirVotoDto } from './dto/voto.dto';

@Controller('api/voto')
export class VotoController {
  constructor(private readonly votoService: VotoService) {}

  @Post('cedula')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async obtenerCedula(@Body() dto: ObtenerCedulaDto) {
    return this.votoService.obtenerCedula(dto.token_voto);
  }

  @Post('emitir')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async emitirVoto(@Body() dto: EmitirVotoDto) {
    return this.votoService.emitirVoto(dto);
  }
}

