import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateAulaDto } from './dto/create-aula.dto';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';

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

    // Auto-crear cuenta de Docente de Mesa para este aula si no existe
    const usernameDocente = `docente${dto.numero}`;
    const existeDocente = await this.prisma.docente.findFirst({
      where: { eleccion_id: eleccionId, username: usernameDocente },
    });
    if (!existeDocente) {
      const password_hash = await argon2.hash('docente123', {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
      });
      const totp_secret = authenticator.generateSecret();
      await this.prisma.docente.create({
        data: {
          eleccion_id: eleccionId,
          aula_id: aula.id,
          username: usernameDocente,
          password_hash,
          totp_secret,
          activo: true,
        },
      });
    }

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
        puestos: {
          orderBy: { numero_puesto: 'asc' },
        },
        docentes: {
          select: { id: true, username: true, activo: true },
        },
        electores: {
          select: {
            id: true,
            dni: true,
            nombres: true,
            apellidos: true,
            grado_seccion: true,
            estado: true,
          },
          orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
        },
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

  /**
   * Reasignar un estudiante de una mesa a otra.
   */
  async moverElectorAula(electorId: string, nuevaAulaId: string, actorId = 'admin', ip = '127.0.0.1') {
    const elector = await this.prisma.elector.findUnique({
      where: { id: electorId },
    });
    if (!elector) {
      throw new NotFoundException(`Elector ${electorId} no encontrado`);
    }

    if (elector.estado === 'VOTO') {
      throw new BadRequestException('No se puede mover un estudiante que ya emitió su voto.');
    }

    const aulaDestino = await this.prisma.aula.findUnique({
      where: { id: nuevaAulaId },
    });
    if (!aulaDestino) {
      throw new NotFoundException(`Aula de destino ${nuevaAulaId} no encontrada`);
    }

    const actualizado = await this.prisma.elector.update({
      where: { id: electorId },
      data: { aula_id: nuevaAulaId },
    });

    await this.auditoria.registrar({
      eleccion_id: elector.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'REASIGNAR_AULA_ELECTOR',
      entidad: 'elector',
      entidad_id: elector.id,
      datos_antes: { aula_id: elector.aula_id },
      datos_despues: { aula_id: nuevaAulaId },
      ip,
    });

    return actualizado;
  }

  /**
   * Desvinculación forzada de un puesto por el Administrador.
   */
  async desvincularPuestoAdmin(puestoId: string, actorId = 'admin', ip = '127.0.0.1') {
    const puesto = await this.prisma.puesto.findUnique({
      where: { id: puestoId },
      include: { aula: true },
    });
    if (!puesto) {
      throw new NotFoundException(`Puesto ${puestoId} no encontrado`);
    }

    // Cancelar cualquier habilitación activa en este puesto
    await this.prisma.habilitacion.deleteMany({
      where: { puesto_id: puestoId },
    });

    const desvinculado = await this.prisma.puesto.update({
      where: { id: puestoId },
      data: {
        token_sesion: null,
        estado: 'LIBRE',
        ultimo_heartbeat: null,
      },
    });

    await this.auditoria.registrar({
      eleccion_id: puesto.aula.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'DESVINCULAR_PUESTO_ADMIN',
      entidad: 'puesto',
      entidad_id: puestoId,
      datos_despues: { puestoId, estado: 'LIBRE' },
      ip,
    });

    return desvinculado;
  }

  async actualizarAula(
    id: string,
    dto: { nombre?: string; capacidad?: number; numero?: number },
    actorId = 'admin',
    ip = '127.0.0.1',
  ) {
    const aula = await this.prisma.aula.findUnique({
      where: { id },
      include: { eleccion: true },
    });
    if (!aula) {
      throw new NotFoundException(`Aula con ID ${id} no encontrada`);
    }

    if (aula.eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden modificar aulas cuando la elección está en BORRADOR.');
    }

    const actualizada = await this.prisma.aula.update({
      where: { id },
      data: {
        ...(dto.nombre ? { nombre: dto.nombre } : {}),
        ...(dto.capacidad ? { capacidad: dto.capacidad } : {}),
        ...(dto.numero ? { numero: dto.numero } : {}),
      },
    });

    await this.auditoria.registrar({
      eleccion_id: aula.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'ACTUALIZAR_AULA',
      entidad: 'aula',
      entidad_id: id,
      datos_antes: aula,
      datos_despues: actualizada,
      ip,
    });

    return actualizada;
  }

  async eliminarAula(id: string, actorId = 'admin', ip = '127.0.0.1') {
    const aula = await this.prisma.aula.findUnique({
      where: { id },
      include: { eleccion: true, _count: { select: { electores: true, puestos: true } } },
    });
    if (!aula) {
      throw new NotFoundException(`Aula con ID ${id} no encontrada`);
    }

    if (aula.eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException('No se pueden eliminar aulas cuando la elección no está en BORRADOR.');
    }

    if (aula._count.electores > 0) {
      throw new BadRequestException(
        `No se puede eliminar la mesa porque tiene ${aula._count.electores} elector(es) asignados. Reasigna los electores primero.`,
      );
    }

    // Cancelar cualquier habilitación en puestos de esta aula
    const puestos = await this.prisma.puesto.findMany({ where: { aula_id: id }, select: { id: true } });
    if (puestos.length > 0) {
      await this.prisma.habilitacion.deleteMany({
        where: { puesto_id: { in: puestos.map((p) => p.id) } },
      });
    }

    // Eliminar docentes asociados
    await this.prisma.docente.deleteMany({ where: { aula_id: id } });
    // Eliminar puestos asociados
    await this.prisma.puesto.deleteMany({ where: { aula_id: id } });

    await this.prisma.aula.delete({ where: { id } });

    await this.auditoria.registrar({
      eleccion_id: aula.eleccion_id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'ELIMINAR_AULA',
      entidad: 'aula',
      entidad_id: id,
      datos_antes: aula,
      ip,
    });

    return { mensaje: 'Aula eliminada exitosamente' };
  }
}

