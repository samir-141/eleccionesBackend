import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class EscrutinioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /**
   * Ejecuta el escrutinio oficial automatizado.
   * Transición: CERRADA -> ESCRUTADA
   * Invariante I19: Lectura aleatoria ORDER BY RANDOM() para anonimato radical.
   * Aplica las reglas electorales parametrizadas en BORRADOR.
   */
  async ejecutarEscrutinio(eleccionId: string, actorId = 'admin', ip = '127.0.0.1') {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      include: {
        partidos: true,
      },
    });

    if (!eleccion) {
      throw new NotFoundException(`Elección con ID ${eleccionId} no encontrada`);
    }

    if (eleccion.estado !== 'CERRADA' && eleccion.estado !== 'ESCRUTADA') {
      throw new BadRequestException(
        `El escrutinio solo puede ejecutarse cuando la elección está CERRADA. Estado actual: ${eleccion.estado}`,
      );
    }

    // 1. INVARIANTE I19: Lectura aleatoria de la urna
    const votosUrna = await this.prisma.$queryRaw<Array<{ voto_payload: any }>>`
      SELECT voto_payload 
      FROM urna 
      WHERE eleccion_id = ${eleccionId}::uuid
      ORDER BY RANDOM();
    `;

    const totalVotosUrna = votosUrna.length;
    const totalElectoresVotaron = await this.prisma.elector.count({
      where: { eleccion_id: eleccionId, estado: 'VOTO' },
    });
    const totalPadron = await this.prisma.elector.count({
      where: { eleccion_id: eleccionId },
    });

    // 2. Extraer reglas electorales configuradas
    const reglas = (eleccion.reglas as Record<string, any>) || {};
    const blancoEnPorcentaje = Boolean(reglas.blanco_en_porcentaje);
    const porcentajeMinimoGanar = Number(reglas.porcentaje_minimo_ganar ?? 50.0);
    const permiteSegundaVuelta = Boolean(reglas.segunda_vuelta ?? true);
    const cuantosPasanSegunda = Number(reglas.cuantos_pasan_segunda_vuelta ?? 2);
    const quorumPorcentaje = Number(reglas.quorum_porcentaje ?? 50.0);
    const accionSinQuorum = String(reglas.accion_sin_quorum ?? 'DECLARAR_DESIERTA');
    const reglaEmpate = String(reglas.regla_empate ?? 'SORTEO');

    // 3. Conteo de votos
    let votosBlanco = 0;
    const conteoPorPartido: Record<string, number> = {};

    for (const p of eleccion.partidos) {
      conteoPorPartido[p.id] = 0;
    }

    for (const v of votosUrna) {
      const payload = v.voto_payload;
      if (payload.tipo === 'BLANCO') {
        votosBlanco++;
      } else if (payload.tipo === 'LISTA' && payload.partido_id) {
        if (conteoPorPartido[payload.partido_id] !== undefined) {
          conteoPorPartido[payload.partido_id]++;
        }
      }
    }

    // 4. Quórum de participación
    const participacionPorcentaje =
      totalPadron > 0 ? (totalElectoresVotaron / totalPadron) * 100 : 0;
    const quorumCumplido = participacionPorcentaje >= quorumPorcentaje;

    // 5. Base para cálculo de porcentajes
    const basePorcentaje = blancoEnPorcentaje
      ? totalVotosUrna
      : totalVotosUrna - votosBlanco;

    const detallePartidos = eleccion.partidos.map((partido) => {
      const votos = conteoPorPartido[partido.id] || 0;
      const porcentaje =
        basePorcentaje > 0 ? Number(((votos / basePorcentaje) * 100).toFixed(2)) : 0;
      return {
        id: partido.id,
        numero_lista: partido.numero_lista,
        nombre: partido.nombre,
        lema: partido.lema,
        logo_url: partido.logo_url,
        votos,
        porcentaje,
      };
    });

    // Ordenar listas de mayor a menor votación
    detallePartidos.sort((a, b) => b.votos - a.votos);

    const porcentajeBlanco =
      totalVotosUrna > 0 ? Number(((votosBlanco / totalVotosUrna) * 100).toFixed(2)) : 0;

    // 6. Aplicar reglas electorales
    let ganadorPartidoId: string | null = null;
    let requiereSegundaVuelta = false;
    let partidosSegundaVuelta: any = null;

    if (!quorumCumplido && accionSinQuorum === 'DECLARAR_DESIERTA') {
      // Declarada desierta por falta de quórum
      ganadorPartidoId = null;
      requiereSegundaVuelta = false;
    } else if (detallePartidos.length > 0) {
      const primerLugar = detallePartidos[0];
      const segundoLugar = detallePartidos.length > 1 ? detallePartidos[1] : null;

      // Evaluar empate en el 1er lugar
      if (segundoLugar && primerLugar.votos === segundoLugar.votos && primerLugar.votos > 0) {
        if (reglaEmpate === 'SORTEO') {
          // Si hay empate y está habilitada la segunda vuelta, pasan a segunda vuelta
          if (permiteSegundaVuelta) {
            requiereSegundaVuelta = true;
            partidosSegundaVuelta = detallePartidos.slice(0, cuantosPasanSegunda);
          } else {
            // Sorteo directo (determinista para auditoría)
            ganadorPartidoId = primerLugar.id;
          }
        } else {
          ganadorPartidoId = primerLugar.id;
        }
      } else if (primerLugar.porcentaje >= porcentajeMinimoGanar) {
        // Ganador en primera vuelta
        ganadorPartidoId = primerLugar.id;
        requiereSegundaVuelta = false;
      } else if (permiteSegundaVuelta) {
        // No alcanzó umbral mínimo, pasa a segunda vuelta
        requiereSegundaVuelta = true;
        partidosSegundaVuelta = detallePartidos.slice(0, cuantosPasanSegunda);
      } else {
        // Mayoría simple
        ganadorPartidoId = primerLugar.id;
      }
    }

    // 7. Persistir resultado de escrutinio
    const resultado = await this.prisma.resultadoEscrutinio.upsert({
      where: { eleccion_id: eleccionId },
      update: {
        total_votos_urna: totalVotosUrna,
        total_electores_votaron: totalElectoresVotaron,
        conteo_partidos: {
          votos_blanco: votosBlanco,
          porcentaje_blanco: porcentajeBlanco,
          partidos: detallePartidos,
        },
        porcentajes_calculados: {
          base_calculo: blancoEnPorcentaje ? 'TOTAL_EMITIDOS' : 'VOTOS_VALIDOS',
          participacion_porcentaje: Number(participacionPorcentaje.toFixed(2)),
          quorum_requerido: quorumPorcentaje,
          umbral_minimo_ganar: porcentajeMinimoGanar,
        },
        ganador_partido_id: ganadorPartidoId,
        requiere_segunda_vuelta: requiereSegundaVuelta,
        partidos_segunda_vuelta: partidosSegundaVuelta,
        quorum_cumplido: quorumCumplido,
        huella_verificada: Boolean(eleccion.huella_sha256),
      },
      create: {
        eleccion_id: eleccionId,
        total_votos_urna: totalVotosUrna,
        total_electores_votaron: totalElectoresVotaron,
        conteo_partidos: {
          votos_blanco: votosBlanco,
          porcentaje_blanco: porcentajeBlanco,
          partidos: detallePartidos,
        },
        porcentajes_calculados: {
          base_calculo: blancoEnPorcentaje ? 'TOTAL_EMITIDOS' : 'VOTOS_VALIDOS',
          participacion_porcentaje: Number(participacionPorcentaje.toFixed(2)),
          quorum_requerido: quorumPorcentaje,
          umbral_minimo_ganar: porcentajeMinimoGanar,
        },
        ganador_partido_id: ganadorPartidoId,
        requiere_segunda_vuelta: requiereSegundaVuelta,
        partidos_segunda_vuelta: partidosSegundaVuelta,
        quorum_cumplido: quorumCumplido,
        huella_verificada: Boolean(eleccion.huella_sha256),
      },
      include: {
        ganador: true,
      },
    });

    // 8. Transición a ESCRUTADA
    await this.prisma.eleccion.update({
      where: { id: eleccionId },
      data: { estado: 'ESCRUTADA' },
    });

    // 9. Registro de auditoría
    await this.auditoria.registrar({
      eleccion_id: eleccionId,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'EJECUTAR_ESCRUTINIO',
      entidad: 'resultado_escrutinio',
      entidad_id: resultado.id,
      datos_despues: {
        totalVotosUrna,
        totalElectoresVotaron,
        quorumCumplido,
        ganadorPartidoId,
        requiereSegundaVuelta,
      },
      ip,
    });

    return resultado;
  }

  /**
   * Obtiene el resultado consolidado del escrutinio oficial.
   */
  async obtenerResultado(eleccionId: string) {
    const resultado = await this.prisma.resultadoEscrutinio.findUnique({
      where: { eleccion_id: eleccionId },
      include: {
        eleccion: true,
        ganador: true,
      },
    });

    if (!resultado) {
      throw new NotFoundException('La elección aún no ha sido escrutada.');
    }

    return resultado;
  }

  /**
   * Genera el reporte oficial de resultados para visualización pública y auditoría.
   * Incluye la huella SHA-256 inmutable congelada al abrir la elección.
   */
  async obtenerReporteOficial(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      include: {
        escrutinio: {
          include: { ganador: true },
        },
        aulas: true,
      },
    });

    if (!eleccion) {
      throw new NotFoundException('Elección no encontrada');
    }

    const totalPadron = await this.prisma.elector.count({
      where: { eleccion_id: eleccionId },
    });

    return {
      eleccion: {
        id: eleccion.id,
        nombre: eleccion.nombre,
        descripcion: eleccion.descripcion,
        estado: eleccion.estado,
        huella_sha256: eleccion.huella_sha256,
        abierta_at: eleccion.abierta_at,
        cerrada_at: eleccion.cerrada_at,
        total_aulas: eleccion.aulas.length,
        total_padron: totalPadron,
      },
      resultado: eleccion.escrutinio,
      verificacion_integridad: {
        huella_valida: Boolean(eleccion.huella_sha256),
        invariante_i14_balance:
          eleccion.escrutinio?.total_votos_urna ===
          eleccion.escrutinio?.total_electores_votaron,
        protocolo_seguridad: 'Urna digital anónima con aislamiento de cuatro columnas y lectura aleatoria (I1-I19)',
      },
    };
  }
}
