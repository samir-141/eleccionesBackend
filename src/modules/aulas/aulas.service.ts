import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateAulaDto } from './dto/create-aula.dto';

@Injectable()
export class AulasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async crearAula(eleccionId: string, dto: CreateAulaDto, actorId = 'admin', ip = '127.0.0.1') {
    const eleccion = await this.prisma.eleccion.findUnique({ where: { id: eleccionId } });
    if (!eleccion) {
      throw new NotFoundException(`Elección ${eleccionId} no encontrada`);
    }

    if (eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException('No se pueden agregar aulas a una elección que ya no está en estado BORRADOR.');
    }

    const existente = await this.prisma.aula.findFirst({
      where: { eleccion_id: eleccionId, numero: dto.numero },
    });
    if (existente) {
      throw new ConflictException(`Ya existe el Aula número ${dto.numero} en esta elección.`);
    }

    const aula = await this.prisma.aula.create({
      data: {
        eleccion_id: eleccionId,
        numero: dto.numero,
        nombre: dto.nombre,
        capacidad: dto.capacidad,
      },
    });

    await this.auditoria.registrar({
      eleccion_id: eleccionId,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'CREAR_AULA',
      entidad: 'aula',
      entidad_id: aula.id,
      datos_despues: aula,
      ip,
    });

    return aula;
  }

  async listarPorEleccion(eleccionId: string) {
    return this.prisma.aula.findMany({
      where: { eleccion_id: eleccionId },
      orderBy: { numero: 'asc' },
      include: {
        _count: {
          select: {
            electores: true,
            puestos: true,
            docentes: true,
          },
        },
      },
    });
  }

  async obtenerPorId(id: string) {
    const aula = await this.prisma.aula.findUnique({
      where: { id },
      include: {
        puestos: true,
        docentes: { select: { id: true, username: true, activo: true } },
        _count: { select: { electores: true } },
      },
    });
    if (!aula) {
      throw new NotFoundException(`Aula con ID ${id} no encontrada`);
    }
    return aula;
  }
}

