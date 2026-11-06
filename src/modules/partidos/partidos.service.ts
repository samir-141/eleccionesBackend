import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';

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

  async actualizarPartido(
    id: string,
    dto: UpdatePartidoDto,
    actorId = 'admin',
    ip = '127.0.0.1',
  ) {
    const partido = await this.prisma.partido.findUnique({
      where: { id },
      include: { eleccion: true },
    });
    if (!partido) {
      throw new NotFoundException(`Partido con ID ${id} no encontrado`);
    }

    if (partido.eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException(
        `No se pueden editar partidos en una elección que está en estado ${partido.eleccion.estado}.`,
      );
    }

    if (dto.numero_lista && dto.numero_lista !== partido.numero_lista) {
      const duplicado = await this.prisma.partido.findFirst({
        where: {
          eleccion_id: partido.eleccion_id,
          numero_lista: dto.numero_lista,
          id: { not: id },
        },
      });
      if (duplicado) {
        throw new ConflictException(`Ya existe otra lista con el número ${dto.numero_lista}.`);
      }
    }

    const actualizado = await this.prisma.partido.update({
      where: { id },
      data: {
        ...(dto.numero_lista !== undefined ? { numero_lista: dto.numero_lista } : {}),
        ...(dto.nombre ? { nombre: dto.nombre } : {}),
        ...(dto.lema !== undefined ? { lema: dto.lema } : {}),
        ...(dto.logo_url !== undefined ? { logo_url: dto.logo_url } : {}),
      },
    });

    await this.auditoria.registrar({
      eleccion_id: partido.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'ACTUALIZAR_PARTIDO',
      entidad: 'partido',
      entidad_id: id,
      datos_antes: partido,
      datos_despues: actualizado,
      ip,
    });

    return actualizado;
  }

  async eliminarPartido(id: string, actorId = 'admin', ip = '127.0.0.1') {
    const partido = await this.prisma.partido.findUnique({
      where: { id },
      include: { eleccion: true },
    });
    if (!partido) {
      throw new NotFoundException(`Partido con ID ${id} no encontrado`);
    }

    if (partido.eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden eliminar partidos si la elección está en estado BORRADOR.');
    }

    await this.prisma.partido.delete({ where: { id } });

    await this.auditoria.registrar({
      eleccion_id: partido.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'ELIMINAR_PARTIDO',
      entidad: 'partido',
      entidad_id: id,
      datos_antes: partido,
      ip,
    });

    return { ok: true, id };
  }

  async listarPorEleccion(eleccionId: string) {
    return this.prisma.partido.findMany({
      where: { eleccion_id: eleccionId },
      orderBy: { numero_lista: 'asc' },
    });
  }

  async listarActivos() {
    const activa = await this.prisma.eleccion.findFirst({
      where: { estado: 'ABIERTA' },
      orderBy: { created_at: 'desc' },
    });
    const eleccion = activa || (await this.prisma.eleccion.findFirst({ orderBy: { created_at: 'desc' } }));
    if (!eleccion) return [];
    return this.listarPorEleccion(eleccion.id);
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

