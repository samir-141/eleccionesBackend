import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreatePartidoDto } from './dto/create-partido.dto';

@Injectable()
export class PartidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async crearPartido(eleccionId: string, dto: CreatePartidoDto, actorId = 'admin', ip = '127.0.0.1') {
    const eleccion = await this.prisma.eleccion.findUnique({ where: { id: eleccionId } });
    if (!eleccion) {
      throw new NotFoundException(`Elección ${eleccionId} no encontrada`);
    }

    if (eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException('No se pueden inscribir partidos en una elección que ya no está en estado BORRADOR.');
    }

    const existente = await this.prisma.partido.findFirst({
      where: { eleccion_id: eleccionId, numero_lista: dto.numero_lista },
    });
    if (existente) {
      throw new ConflictException(`Ya existe una lista con el número ${dto.numero_lista} en esta elección.`);
    }

    const partido = await this.prisma.partido.create({
      data: {
        eleccion_id: eleccionId,
        numero_lista: dto.numero_lista,
        nombre: dto.nombre,
        lema: dto.lema,
        logo_url: dto.logo_url,
      },
    });

    await this.auditoria.registrar({
      eleccion_id: eleccionId,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'CREAR_PARTIDO',
      entidad: 'partido',
      entidad_id: partido.id,
      datos_despues: partido,
      ip,
    });

    return partido;
  }

  async listarPorEleccion(eleccionId: string) {
    return this.prisma.partido.findMany({
      where: { eleccion_id: eleccionId },
      orderBy: { numero_lista: 'asc' },
    });
  }

  /**
   * Invariante I18: Opciones de la cédula digital.
   * Orden aleatorizado por sesión para garantizar neutralidad absoluta.
   * La opción 'BLANCO' se incluye obligatoriamente con el mismo tamaño y prominencia.
   */
  async obtenerParaCedula(eleccionId: string) {
    const partidos = await this.prisma.partido.findMany({
      where: { eleccion_id: eleccionId },
      select: {
        id: true,
        numero_lista: true,
        nombre: true,
        lema: true,
        logo_url: true,
      },
    });

    // Barajar aleatoriamente los partidos (Fisher-Yates)
    const shuffledPartidos = [...partidos];
    for (let i = shuffledPartidos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPartidos[i], shuffledPartidos[j]] = [shuffledPartidos[j], shuffledPartidos[i]];
    }

    // Agregar la opción automática obligatoria de Voto en Blanco
    return {
      schema_version: 'v1',
      opciones: [
        ...shuffledPartidos,
        {
          id: 'BLANCO',
          numero_lista: 0,
          nombre: 'VOTO EN BLANCO',
          lema: 'No respaldar a ninguna lista candidata',
          logo_url: null,
        },
      ],
    };
  }
}

