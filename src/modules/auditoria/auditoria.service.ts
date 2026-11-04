import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface RegistrarAuditoriaParams {
  eleccion_id?: string;
  actor_tipo: 'ADMIN' | 'DOCENTE' | 'SISTEMA';
  actor_id: string;
  accion: string;
  entidad: string;
  entidad_id?: string;
  datos_antes?: any;
  datos_despues?: any;
  ip?: string;
}

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Invariante I12: Auditoría administrativa inmutable (append-only).
   * Jamás registra votos ni tokens de voto ni relación elector-voto.
   */
  async registrar(params: RegistrarAuditoriaParams) {
    const log = await this.prisma.auditoriaLog.create({
      data: {
        eleccion_id: params.eleccion_id,
        actor_tipo: params.actor_tipo,
        actor_id: params.actor_id,
        accion: params.accion,
        entidad: params.entidad,
        entidad_id: params.entidad_id,
        datos_antes: params.datos_antes ? JSON.parse(JSON.stringify(params.datos_antes)) : undefined,
        datos_despues: params.datos_despues ? JSON.parse(JSON.stringify(params.datos_despues)) : undefined,
        ip: params.ip,
      },
    });

    return {
      ...log,
      id: Number(log.id),
    };
  }

  async obtenerPorEleccion(eleccion_id: string) {
    const logs = await this.prisma.auditoriaLog.findMany({
      where: { eleccion_id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return logs.map((log) => ({
      ...log,
      id: Number(log.id),
    }));
  }
}

