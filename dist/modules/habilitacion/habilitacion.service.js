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
exports.HabilitacionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const auditoria_service_1 = require("../auditoria/auditoria.service");
const puestos_service_1 = require("../puestos/puestos.service");
const crypto = require("crypto");
let HabilitacionService = class HabilitacionService {
    prisma;
    auditoria;
    puestosService;
    constructor(prisma, auditoria, puestosService) {
        this.prisma = prisma;
        this.auditoria = auditoria;
        this.puestosService = puestosService;
    }
    async resolverAulaId(aulaId) {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (aulaId && UUID_REGEX.test(aulaId)) {
            return aulaId;
        }
        const defaultAula = await this.prisma.aula.findFirst({ orderBy: { numero: 'asc' } });
        return defaultAula?.id || aulaId;
    }
    sanitizarUuid(id) {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return id && UUID_REGEX.test(id) ? id : null;
    }
    async consultarDni(rawDocenteAulaId, docenteId, dto, ip = '127.0.0.1') {
        const docenteAulaId = await this.resolverAulaId(rawDocenteAulaId);
        const validDocenteId = this.sanitizarUuid(docenteId);
        await this.limpiarHabilitacionesExpiradas();
        const aula = await this.prisma.aula.findUnique({
            where: { id: docenteAulaId },
            include: { eleccion: true },
        });
        if (!aula) {
            throw new common_1.NotFoundException('Aula de docente no encontrada.');
        }
        if (aula.eleccion.estado !== 'ABIERTA') {
            throw new common_1.BadRequestException(`La elección se encuentra en estado ${aula.eleccion.estado}. La votación solo opera en estado ABIERTA.`);
        }
        const elector = await this.prisma.elector.findFirst({
            where: {
                eleccion_id: aula.eleccion_id,
                dni: dto.dni.trim(),
            },
            include: {
                aula: true,
                habilitacion: { include: { puesto: true } },
            },
        });
        if (!elector) {
            throw new common_1.NotFoundException(`El DNI ${dto.dni} no figura en el padrón electoral de esta institución.`);
        }
        if (elector.aula_id !== docenteAulaId) {
            await this.prisma.incidente.create({
                data: {
                    eleccion_id: aula.eleccion_id,
                    aula_id: docenteAulaId,
                    docente_id: validDocenteId,
                    tipo: 'DNI_OTRA_AULA',
                    descripcion: `Intento de acceso: El estudiante ${elector.apellidos}, ${elector.nombres} (DNI ${elector.dni}) pertenece al ${elector.aula.nombre}, pero se presentó en el ${aula.nombre}.`,
                },
            });
            throw new common_1.BadRequestException(`El estudiante pertenece al ${elector.aula.nombre}. Debe dirigirse a su aula asignada para votar.`);
        }
        if (elector.estado === 'VOTO') {
            await this.prisma.incidente.create({
                data: {
                    eleccion_id: aula.eleccion_id,
                    aula_id: docenteAulaId,
                    docente_id: validDocenteId,
                    tipo: 'INTENTO_DOBLE_VOTO',
                    descripcion: `ALERTA DE SEGURIDAD: El estudiante ${elector.apellidos}, ${elector.nombres} (DNI ${elector.dni}) ya emitió su voto previamente e intentó habilitarse nuevamente.`,
                },
            });
            throw new common_1.ConflictException('El estudiante ya emitió su voto. Por integridad electoral, no es posible votar dos veces.');
        }
        if (elector.estado === 'HABILITADO' && elector.habilitacion) {
            if (elector.habilitacion.expires_at > new Date()) {
                throw new common_1.ConflictException(`El estudiante ya tiene un puesto asignado (Puesto #${elector.habilitacion.puesto.numero_puesto}). Si se retiró, cancele la reserva anterior.`);
            }
        }
        await this.auditoria.registrar({
            eleccion_id: aula.eleccion_id,
            actor_tipo: 'DOCENTE',
            actor_id: docenteId,
            accion: dto.origen_lectura === 'MANUAL' ? 'CONSULTAR_DNI_MANUAL' : 'CONSULTAR_DNI_CAMARA',
            entidad: 'elector',
            entidad_id: elector.id,
            ip,
        });
        return {
            elector_id: elector.id,
            dni: elector.dni,
            nombres: elector.nombres,
            apellidos: elector.apellidos,
            grado_seccion: elector.grado_seccion,
            aula_nombre: aula.nombre,
        };
    }
    async confirmarHabilitacion(rawDocenteAulaId, docenteId, electorId, ip = '127.0.0.1') {
        const docenteAulaId = await this.resolverAulaId(rawDocenteAulaId);
        await this.limpiarHabilitacionesExpiradas();
        return this.prisma.$transaction(async (tx) => {
            const puestosLibres = await tx.$queryRaw `
        SELECT id, numero_puesto 
        FROM puesto 
        WHERE aula_id = ${docenteAulaId}::uuid AND estado = 'LIBRE'
        ORDER BY numero_puesto ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
      `;
            if (!puestosLibres || puestosLibres.length === 0) {
                throw new common_1.ConflictException('Todos los puestos de votación de esta aula están ocupados o reservados en este momento. Por favor espere a que se libere un puesto.');
            }
            const puestoAsignado = puestosLibres[0];
            const electores = await tx.$queryRaw `
        SELECT id, estado, eleccion_id
        FROM elector
        WHERE id = ${electorId}::uuid
        FOR UPDATE;
      `;
            if (!electores || electores.length === 0) {
                throw new common_1.NotFoundException('Elector no encontrado.');
            }
            const elector = electores[0];
            if (elector.estado !== 'PENDIENTE') {
                throw new common_1.ConflictException(`El elector ya no se encuentra en estado Pendiente (Estado actual: ${elector.estado}).`);
            }
            const token_voto = crypto.randomBytes(32).toString('hex');
            const token_voto_hash = crypto.createHash('sha256').update(token_voto).digest('hex');
            const eleccion = await tx.eleccion.findUnique({ where: { id: elector.eleccion_id } });
            const reglas = eleccion?.reglas || {};
            const segundosReserva = reglas.duracion_reserva_segundos || 180;
            const expires_at = new Date(Date.now() + segundosReserva * 1000);
            await tx.$executeRaw `
        UPDATE puesto 
        SET estado = 'RESERVADO'
        WHERE id = ${puestoAsignado.id}::uuid;
      `;
            await tx.$executeRaw `
        UPDATE elector 
        SET estado = 'HABILITADO'
        WHERE id = ${elector.id}::uuid;
      `;
            await tx.$executeRaw `
        DELETE FROM habilitacion 
        WHERE puesto_id = ${puestoAsignado.id}::uuid OR elector_id = ${elector.id}::uuid;
      `;
            await tx.$executeRaw `
        INSERT INTO habilitacion (id, eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
        VALUES (gen_random_uuid(), ${elector.eleccion_id}::uuid, ${elector.id}::uuid, ${puestoAsignado.id}::uuid, ${token_voto_hash}, ${expires_at});
      `;
            await this.auditoria.registrar({
                eleccion_id: elector.eleccion_id,
                actor_tipo: 'DOCENTE',
                actor_id: docenteId,
                accion: 'CONFIRMAR_HABILITACION',
                entidad: 'puesto',
                entidad_id: puestoAsignado.id,
                datos_despues: {
                    numero_puesto: puestoAsignado.numero_puesto,
                    duracion_segundos: segundosReserva,
                },
                ip,
            });
            this.puestosService.setTokenVotoPuesto(puestoAsignado.id, token_voto);
            return {
                status: 'HABILITADO',
                puesto_id: puestoAsignado.id,
                puesto_numero: puestoAsignado.numero_puesto,
                mensaje: `Dirija al elector al Puesto ${puestoAsignado.numero_puesto}`,
                tiempo_reserva_segundos: segundosReserva,
                token_voto,
            };
        });
    }
    async cancelarHabilitacion(rawDocenteAulaId, docenteId, electorId, motivo, ip = '127.0.0.1') {
        const docenteAulaId = await this.resolverAulaId(rawDocenteAulaId);
        const habilitacion = await this.prisma.habilitacion.findFirst({
            where: { elector_id: electorId },
            include: { puesto: true, eleccion: true },
        });
        if (!habilitacion) {
            await this.prisma.elector.updateMany({
                where: { id: electorId, estado: 'HABILITADO' },
                data: { estado: 'PENDIENTE' },
            });
            return {
                mensaje: 'La reserva ya no se encontraba activa o ya fue procesada.',
                puesto_liberado: 0,
            };
        }
        if (habilitacion.puesto.aula_id !== docenteAulaId) {
            throw new common_1.BadRequestException('No puedes cancelar una habilitación de otra aula.');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.puesto.update({
                where: { id: habilitacion.puesto_id },
                data: { estado: 'LIBRE' },
            });
            this.puestosService.limpiarTokenVotoPuesto(habilitacion.puesto_id);
            await tx.elector.update({
                where: { id: habilitacion.elector_id },
                data: { estado: 'PENDIENTE' },
            });
            await tx.habilitacion.deleteMany({
                where: { id: habilitacion.id },
            });
            await tx.incidente.create({
                data: {
                    eleccion_id: habilitacion.eleccion_id,
                    aula_id: docenteAulaId,
                    docente_id: this.sanitizarUuid(docenteId),
                    tipo: 'RESERVA_CANCELADA',
                    descripcion: `Cancelación manual de reserva de Puesto #${habilitacion.puesto.numero_puesto}. Motivo: ${motivo}`,
                },
            });
            await this.auditoria.registrar({
                eleccion_id: habilitacion.eleccion_id,
                actor_tipo: 'DOCENTE',
                actor_id: docenteId,
                accion: 'CANCELAR_HABILITACION',
                entidad: 'habilitacion',
                entidad_id: habilitacion.id,
                datos_despues: { motivo },
                ip,
            });
            return {
                mensaje: 'Habilitación cancelada y puesto liberado correctamente.',
                puesto_liberado: habilitacion.puesto.numero_puesto,
            };
        });
    }
    async limpiarHabilitacionesExpiradas() {
        const ahora = new Date();
        const expiradas = await this.prisma.habilitacion.findMany({
            where: { expires_at: { lt: ahora } },
            include: { puesto: true },
        });
        for (const h of expiradas) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    await tx.puesto.update({
                        where: { id: h.puesto_id },
                        data: { estado: 'LIBRE' },
                    });
                    this.puestosService.limpiarTokenVotoPuesto(h.puesto_id);
                    await tx.elector.update({
                        where: { id: h.elector_id },
                        data: { estado: 'PENDIENTE' },
                    });
                    await tx.habilitacion.deleteMany({
                        where: { id: h.id },
                    });
                    await tx.incidente.create({
                        data: {
                            eleccion_id: h.eleccion_id,
                            aula_id: h.puesto.aula_id,
                            tipo: 'RESERVA_EXPIRADA',
                            descripcion: `Reserva del Puesto #${h.puesto.numero_puesto} expiró por inactividad. El elector regresó a Pendiente.`,
                        },
                    });
                });
            }
            catch {
            }
        }
    }
};
exports.HabilitacionService = HabilitacionService;
exports.HabilitacionService = HabilitacionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auditoria_service_1.AuditoriaService,
        puestos_service_1.PuestosService])
], HabilitacionService);
//# sourceMappingURL=habilitacion.service.js.map