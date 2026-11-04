"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrutinioService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const auditoria_service_1 = require("../auditoria/auditoria.service");
let EscrutinioService = class EscrutinioService {
    prisma;
    auditoria;
    constructor(prisma, auditoria) {
        this.prisma = prisma;
        this.auditoria = auditoria;
    }
    async ejecutarEscrutinio(eleccionId, actorId = 'admin', ip = '127.0.0.1') {
        const eleccion = await this.prisma.eleccion.findUnique({
            where: { id: eleccionId },
            include: {
                partidos: true,
            },
        });
        if (!eleccion) {
            throw new common_1.NotFoundException(`Elección con ID ${eleccionId} no encontrada`);
        }
        if (eleccion.estado !== 'CERRADA' && eleccion.estado !== 'ESCRUTADA') {
            throw new common_1.BadRequestException(`El escrutinio solo puede ejecutarse cuando la elección está CERRADA. Estado actual: ${eleccion.estado}`);
        }
        const votosUrna = await this.prisma.$queryRaw `
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
        const reglas = eleccion.reglas || {};
        const blancoEnPorcentaje = Boolean(reglas.blanco_en_porcentaje);
        const porcentajeMinimoGanar = Number(reglas.porcentaje_minimo_ganar ?? 50.0);
        const permiteSegundaVuelta = Boolean(reglas.segunda_vuelta ?? true);
        const cuantosPasanSegunda = Number(reglas.cuantos_pasan_segunda_vuelta ?? 2);
        const quorumPorcentaje = Number(reglas.quorum_porcentaje ?? 50.0);
        const accionSinQuorum = String(reglas.accion_sin_quorum ?? 'DECLARAR_DESIERTA');
        const reglaEmpate = String(reglas.regla_empate ?? 'SORTEO');
        let votosBlanco = 0;
        const conteoPorPartido = {};
        for (const p of eleccion.partidos) {
            conteoPorPartido[p.id] = 0;
        }
        for (const v of votosUrna) {
            const payload = v.voto_payload;
            if (payload.tipo === 'BLANCO') {
                votosBlanco++;
            }
            else if (payload.tipo === 'LISTA' && payload.partido_id) {
                if (conteoPorPartido[payload.partido_id] !== undefined) {
                    conteoPorPartido[payload.partido_id]++;
                }
            }
        }
        const participacionPorcentaje = totalPadron > 0 ? (totalElectoresVotaron / totalPadron) * 100 : 0;
        const quorumCumplido = participacionPorcentaje >= quorumPorcentaje;
        const basePorcentaje = blancoEnPorcentaje
            ? totalVotosUrna
            : totalVotosUrna - votosBlanco;
        const detallePartidos = eleccion.partidos.map((partido) => {
            const votos = conteoPorPartido[partido.id] || 0;
            const porcentaje = basePorcentaje > 0 ? Number(((votos / basePorcentaje) * 100).toFixed(2)) : 0;
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
        detallePartidos.sort((a, b) => b.votos - a.votos);
        const porcentajeBlanco = totalVotosUrna > 0 ? Number(((votosBlanco / totalVotosUrna) * 100).toFixed(2)) : 0;
        let ganadorPartidoId = null;
        let requiereSegundaVuelta = false;
        let partidosSegundaVuelta = null;
        if (!quorumCumplido && accionSinQuorum === 'DECLARAR_DESIERTA') {
            ganadorPartidoId = null;
            requiereSegundaVuelta = false;
        }
        else if (detallePartidos.length > 0) {
            const primerLugar = detallePartidos[0];
            const segundoLugar = detallePartidos.length > 1 ? detallePartidos[1] : null;
            if (segundoLugar && primerLugar.votos === segundoLugar.votos && primerLugar.votos > 0) {
                if (reglaEmpate === 'SORTEO') {
                    if (permiteSegundaVuelta) {
                        requiereSegundaVuelta = true;
                        partidosSegundaVuelta = detallePartidos.slice(0, cuantosPasanSegunda);
                    }
                    else {
                        ganadorPartidoId = primerLugar.id;
                    }
                }
                else {
                    ganadorPartidoId = primerLugar.id;
                }
            }
            else if (primerLugar.porcentaje >= porcentajeMinimoGanar) {
                ganadorPartidoId = primerLugar.id;
                requiereSegundaVuelta = false;
            }
            else if (permiteSegundaVuelta) {
                requiereSegundaVuelta = true;
                partidosSegundaVuelta = detallePartidos.slice(0, cuantosPasanSegunda);
            }
            else {
                ganadorPartidoId = primerLugar.id;
            }
        }
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
        await this.prisma.eleccion.update({
            where: { id: eleccionId },
            data: { estado: 'ESCRUTADA' },
        });
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
    async obtenerResultado(eleccionId) {
        const resultado = await this.prisma.resultadoEscrutinio.findUnique({
            where: { eleccion_id: eleccionId },
            include: {
                eleccion: true,
                ganador: true,
            },
        });
        if (!resultado) {
            throw new common_1.NotFoundException('La elección aún no ha sido escrutada.');
        }
        return resultado;
    }
    async obtenerReporteOficial(eleccionId) {
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
            throw new common_1.NotFoundException('Elección no encontrada');
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
                invariante_i14_balance: eleccion.escrutinio?.total_votos_urna ===
                    eleccion.escrutinio?.total_electores_votaron,
                protocolo_seguridad: 'Urna digital anónima con aislamiento de cuatro columnas y lectura aleatoria (I1-I19)',
            },
        };
    }
};
exports.EscrutinioService = EscrutinioService;
exports.EscrutinioService = EscrutinioService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService])
], EscrutinioService);
//# sourceMappingURL=escrutinio.service.js.map