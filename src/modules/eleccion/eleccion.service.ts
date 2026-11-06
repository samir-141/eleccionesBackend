import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateEleccionDto } from './dto/create-eleccion.dto';
import { UpdateReglasDto } from './dto/update-reglas.dto';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';

@Injectable()
export class EleccionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async create(dto: CreateEleccionDto, actorId = 'admin', ip = '127.0.0.1') {
    let reglasIniciales = undefined;
    if (dto.clonarConfiguracion && dto.eleccionOrigenId) {
      const origen = await this.prisma.eleccion.findUnique({
        where: { id: dto.eleccionOrigenId },
      });
      if (origen?.reglas) {
        reglasIniciales = origen.reglas;
      }
    }

    const eleccion = await this.prisma.eleccion.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        estado: 'BORRADOR',
        ...(reglasIniciales ? { reglas: reglasIniciales } : {}),
      },
    });

    // Clonación de aulas, puestos, docentes y partidos si se solicita
    if (dto.clonarConfiguracion && dto.eleccionOrigenId) {
      const aulasOrigen = await this.prisma.aula.findMany({
        where: { eleccion_id: dto.eleccionOrigenId },
        include: { puestos: true, docentes: true },
      });

      const mapaAulas = new Map<string, string>();

      for (const a of aulasOrigen) {
        const nuevaAula = await this.prisma.aula.create({
          data: {
            eleccion_id: eleccion.id,
            numero: a.numero,
            nombre: a.nombre,
            capacidad: a.capacidad,
          },
        });
        mapaAulas.set(a.id, nuevaAula.id);

        // Clonar puestos
        if (a.puestos && a.puestos.length > 0) {
          await this.prisma.puesto.createMany({
            data: a.puestos.map((p) => ({
              aula_id: nuevaAula.id,
              numero_puesto: p.numero_puesto,
              estado: 'LIBRE',
            })),
          });
        }

        // Clonar docentes
        if (a.docentes && a.docentes.length > 0) {
          for (const d of a.docentes) {
            await this.prisma.docente.create({
              data: {
                eleccion_id: eleccion.id,
                aula_id: nuevaAula.id,
                username: d.username,
                password_hash: d.password_hash,
                totp_secret: d.totp_secret,
                activo: true,
              },
            });
          }
        }
      }

      // Clonar partidos
      const partidosOrigen = await this.prisma.partido.findMany({
        where: { eleccion_id: dto.eleccionOrigenId },
      });
      if (partidosOrigen.length > 0) {
        await this.prisma.partido.createMany({
          data: partidosOrigen.map((p) => ({
            eleccion_id: eleccion.id,
            numero_lista: p.numero_lista,
            nombre: p.nombre,
            lema: p.lema,
            logo_url: p.logo_url,
          })),
        });
      }

      // Clonar padrón de electores si se solicita
      if (dto.clonarPadron) {
        const electoresOrigen = await this.prisma.elector.findMany({
          where: { eleccion_id: dto.eleccionOrigenId },
        });

        for (const e of electoresOrigen) {
          const nuevaAulaId = mapaAulas.get(e.aula_id);
          if (nuevaAulaId) {
            await this.prisma.elector.create({
              data: {
                eleccion_id: eleccion.id,
                aula_id: nuevaAulaId,
                dni: e.dni,
                nombres: e.nombres,
                apellidos: e.apellidos,
                grado_seccion: e.grado_seccion,
                estado: 'PENDIENTE',
              },
            });
          }
        }
      }
    }

    await this.auditoria.registrar({
      eleccion_id: eleccion.id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'CREAR_ELECCION',
      entidad: 'eleccion',
      entidad_id: eleccion.id,
      datos_despues: {
        id: eleccion.id,
        nombre: eleccion.nombre,
        clonada: Boolean(dto.clonarConfiguracion),
      },
      ip,
    });

    return this.findOne(eleccion.id);
  }

  async findAll() {
    return this.prisma.eleccion.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            aulas: true,
            partidos: true,
            electores: true,
            docentes: true,
          },
        },
      },
    });
  }

  private readonly UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  /**
   * Obtiene la elección activa institucional (o la más reciente).
   * Si la base de datos está vacía, inicializa automáticamente la elección por defecto.
   */
  async findActiva() {
    let eleccion = await this.prisma.eleccion.findFirst({
      where: { estado: 'ABIERTA' },
      include: {
        aulas: true,
        partidos: { orderBy: { numero_lista: 'asc' } },
        _count: {
          select: {
            electores: true,
            docentes: true,
            urnas: true,
          },
        },
      },
    });

    if (!eleccion) {
      eleccion = await this.prisma.eleccion.findFirst({
        orderBy: { created_at: 'desc' },
        include: {
          aulas: true,
          partidos: { orderBy: { numero_lista: 'asc' } },
          _count: {
            select: {
              electores: true,
              docentes: true,
              urnas: true,
            },
          },
        },
      });
    }

    if (!eleccion) {
      eleccion = await this.prisma.eleccion.create({
        data: {
          nombre: 'Elección Municipio Escolar 2026',
          descripcion: 'Proceso electoral institucional para el municipio escolar',
          estado: 'BORRADOR',
          reglas: {
            blanco_en_porcentaje: false,
            porcentaje_minimo_ganar: 50.0,
            segunda_vuelta: true,
            cuantos_pasan_segunda_vuelta: 2,
            quorum_porcentaje: 50.0,
            accion_sin_quorum: 'DECLARAR_DESIERTA',
            regla_empate: 'SORTEO',
            duracion_reserva_segundos: 180,
            ip_restringida: null,
          },
        },
        include: {
          aulas: true,
          partidos: { orderBy: { numero_lista: 'asc' } },
          _count: {
            select: {
              electores: true,
              docentes: true,
              urnas: true,
            },
          },
        },
      });
    }

    return eleccion;
  }

  async findOne(id: string) {
    if (id === 'default' || id === 'activa') {
      return this.findActiva();
    }

    if (!this.UUID_REGEX.test(id)) {
      throw new BadRequestException(`El identificador '${id}' no es un UUID válido.`);
    }

    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id },
      include: {
        aulas: true,
        partidos: {
          orderBy: { numero_lista: 'asc' },
        },
        _count: {
          select: {
            electores: true,
            docentes: true,
            urnas: true,
          },
        },
      },
    });

    if (!eleccion) {
      throw new NotFoundException(`Elección con ID ${id} no encontrada`);
    }

    return eleccion;
  }

  async updateReglas(
    id: string,
    dto: UpdateReglasDto,
    actorId = 'admin',
    ip = '127.0.0.1',
  ) {
    const eleccion = await this.findOne(id);

    // REGLA FUNDAMENTAL: Las reglas SOLO son editables en BORRADOR
    if (eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException(
        `Las reglas no pueden modificarse. La elección ya se encuentra en estado ${eleccion.estado} y está congelada.`,
      );
    }

    const reglasActuales = (eleccion.reglas as Record<string, any>) || {};
    const nuevasReglas = {
      ...reglasActuales,
      ...dto,
    };

    const updated = await this.prisma.eleccion.update({
      where: { id },
      data: {
        reglas: nuevasReglas,
      },
    });

    await this.auditoria.registrar({
      eleccion_id: id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'ACTUALIZAR_REGLAS',
      entidad: 'eleccion',
      entidad_id: id,
      datos_antes: reglasActuales,
      datos_despues: nuevasReglas,
      ip,
    });

    return updated;
  }

  /**
   * Valida en detalle las mesas y requisitos electorales antes de la apertura.
   */
  async validarPrecondicionesApertura(id: string) {
    const eleccion = await this.findOne(id);
    const aulasCount = await this.prisma.aula.count({ where: { eleccion_id: eleccion.id } });
    const puestosCount = await this.prisma.puesto.count({
      where: { aula: { eleccion_id: eleccion.id } },
    });
    const docentesCount = await this.prisma.docente.count({ where: { eleccion_id: eleccion.id } });
    const partidosCount = await this.prisma.partido.count({ where: { eleccion_id: eleccion.id } });
    const electoresCount = await this.prisma.elector.count({ where: { eleccion_id: eleccion.id } });

    const aulasOk = aulasCount >= 1;
    const puestosOk = puestosCount >= 1;
    const docentesOk = docentesCount >= 1;
    const partidosOk = partidosCount >= 2;
    const padronOk = electoresCount >= 1;

    const listoParaAbrir = aulasOk && docentesOk && partidosOk && padronOk;

    return {
      eleccion_id: eleccion.id,
      estado: eleccion.estado,
      listo_para_abrir: listoParaAbrir,
      requisitos: {
        aulas: {
          total: aulasCount,
          ok: aulasOk,
          titulo: 'Mesas / Aulas de Votación',
          mensaje: aulasOk ? `${aulasCount} aula(s) configurada(s)` : 'Debe registrar al menos 1 aula',
        },
        puestos: {
          total: puestosCount,
          ok: true,
          titulo: 'Puestos de Votación',
          mensaje: puestosCount > 0 ? `${puestosCount} puesto(s) vinculado(s)` : 'Vinculación dinámica al escanear QR en sala',
        },
        docentes: {
          total: docentesCount,
          ok: docentesOk,
          titulo: 'Docentes de Mesa',
          mensaje: docentesOk ? `${docentesCount} docente(s) asignado(s)` : 'Debe asignar al menos 1 docente',
        },
        partidos: {
          total: partidosCount,
          ok: partidosOk,
          titulo: 'Listas Electorales',
          mensaje: partidosOk ? `${partidosCount} lista(s) inscrita(s)` : 'Se requieren al menos 2 listas',
        },
        padron: {
          total: electoresCount,
          ok: padronOk,
          titulo: 'Padrón Electoral',
          mensaje: padronOk ? `${electoresCount} estudiante(s) en padrón` : 'Importe el padrón de alumnos',
        },
      },
    };
  }

  /**
   * Inicializa automáticamente mesas y datos institucionales si están vacíos.
   * Permite aperturar la elección de inmediato y verificar el comportamiento entre dispositivos.
   */
  async inicializarMesasInstitucionales(id: string, actorId = 'admin', ip = '127.0.0.1') {
    const eleccion = await this.findOne(id);

    if (eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden inicializar mesas cuando la elección está en BORRADOR.');
    }

    // 1. Aulas si no existen (Las mesas/puestos NO vienen predeterminadas, toman lugar al escanear)
    let aula1 = await this.prisma.aula.findFirst({ where: { eleccion_id: eleccion.id, numero: 1 } });
    if (!aula1) {
      aula1 = await this.prisma.aula.create({
        data: {
          eleccion_id: eleccion.id,
          numero: 1,
          nombre: 'Mesa 1 (Pabellón A)',
          capacidad: 45,
        },
      });
    }

    let aula2 = await this.prisma.aula.findFirst({ where: { eleccion_id: eleccion.id, numero: 2 } });
    if (!aula2) {
      aula2 = await this.prisma.aula.create({
        data: {
          eleccion_id: eleccion.id,
          numero: 2,
          nombre: 'Mesa 2 (Pabellón B)',
          capacidad: 45,
        },
      });
    }

    // 2. Docentes de mesa si no existen
    const docentesCount = await this.prisma.docente.count({ where: { eleccion_id: eleccion.id } });
    if (docentesCount === 0) {
      const passHash1 = await argon2.hash('docente123', { type: argon2.argon2id });
      await this.prisma.docente.create({
        data: {
          eleccion_id: eleccion.id,
          aula_id: aula1.id,
          username: 'docente1',
          password_hash: passHash1,
          totp_secret: authenticator.generateSecret(),
          activo: true,
        },
      });

      const passHash2 = await argon2.hash('docente123', { type: argon2.argon2id });
      await this.prisma.docente.create({
        data: {
          eleccion_id: eleccion.id,
          aula_id: aula2.id,
          username: 'docente2',
          password_hash: passHash2,
          totp_secret: authenticator.generateSecret(),
          activo: true,
        },
      });
    }

    // 3. Partidos si no existen al menos 2
    const partidosCount = await this.prisma.partido.count({ where: { eleccion_id: eleccion.id } });
    if (partidosCount < 2) {
      await this.prisma.partido.createMany({
        data: [
          {
            eleccion_id: eleccion.id,
            numero_lista: 1,
            nombre: 'Lista 1 - Innovación y Futuro',
            lema: 'Tecnología, liderazgo y cultura institucional',
          },
          {
            eleccion_id: eleccion.id,
            numero_lista: 2,
            nombre: 'Lista 2 - Fuerza Escolar Unida',
            lema: 'Transparencia, deporte y bienestar escolar',
          },
        ],
      });
    }

    // 4. Padrón si está vacío
    const electoresCount = await this.prisma.elector.count({ where: { eleccion_id: eleccion.id } });
    if (electoresCount === 0) {
      const electoresData = [
        { dni: '71000001', nombres: 'Carlos Andrés', apellidos: 'Mendoza Ruiz', grado_seccion: '5to A', aula_id: aula1.id },
        { dni: '71000002', nombres: 'Valeria Sofía', apellidos: 'Torres Quispe', grado_seccion: '5to A', aula_id: aula1.id },
        { dni: '71000003', nombres: 'Diego Alonso', apellidos: 'Flores Morales', grado_seccion: '5to B', aula_id: aula1.id },
        { dni: '71000004', nombres: 'Camila Lucía', apellidos: 'Ramos Salazar', grado_seccion: '5to B', aula_id: aula1.id },
        { dni: '71000005', nombres: 'Mateo Alejandro', apellidos: 'Gutiérrez Chávez', grado_seccion: '5to B', aula_id: aula1.id },
        { dni: '72000001', nombres: 'Luciana Belén', apellidos: 'Pérez Vargas', grado_seccion: '4to A', aula_id: aula2.id },
        { dni: '72000002', nombres: 'Joaquín Ignacio', apellidos: 'Castillo Vega', grado_seccion: '4to A', aula_id: aula2.id },
        { dni: '72000003', nombres: 'Mariana Nicole', apellidos: 'Huamán Silva', grado_seccion: '4to B', aula_id: aula2.id },
        { dni: '72000004', nombres: 'Sebastián David', apellidos: 'Ríos Espinoza', grado_seccion: '4to B', aula_id: aula2.id },
        { dni: '72000005', nombres: 'Jimena Paola', apellidos: 'Castro Benítez', grado_seccion: '4to B', aula_id: aula2.id },
      ];

      for (const e of electoresData) {
        await this.prisma.elector.create({
          data: {
            eleccion_id: eleccion.id,
            aula_id: e.aula_id,
            dni: e.dni,
            nombres: e.nombres,
            apellidos: e.apellidos,
            grado_seccion: e.grado_seccion,
            estado: 'PENDIENTE',
          },
        });
      }
    }

    await this.auditoria.registrar({
      eleccion_id: eleccion.id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'INICIALIZAR_MESAS_INSTITUCIONALES',
      entidad: 'eleccion',
      entidad_id: eleccion.id,
      ip,
    });

    return this.validarPrecondicionesApertura(eleccion.id);
  }

  /**
   * Transición: BORRADOR -> ABIERTA
   * Congela datos, calcula huella criptográfica SHA-256 e inicia la votación.
   */
  async abrirEleccion(id: string, actorId = 'admin', ip = '127.0.0.1') {
    const eleccion = await this.findOne(id);

    if (eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException(
        `Solo una elección en BORRADOR puede ser ABIERTA. Estado actual: ${eleccion.estado}`,
      );
    }

    // Precondiciones mínimas requeridas
    const aulasCount = await this.prisma.aula.count({ where: { eleccion_id: id } });
    if (aulasCount < 1) {
      throw new BadRequestException('Debe configurar al menos un aula antes de abrir la elección.');
    }

    const docentesCount = await this.prisma.docente.count({ where: { eleccion_id: id } });
    if (docentesCount < 1) {
      throw new BadRequestException('Debe asignar al menos un docente antes de abrir la elección.');
    }

    const partidosCount = await this.prisma.partido.count({ where: { eleccion_id: id } });
    if (partidosCount < 2) {
      throw new BadRequestException('Deben existir al menos dos partidos postulantes inscritos.');
    }

    const electoresCount = await this.prisma.elector.count({ where: { eleccion_id: id } });
    if (electoresCount < 1) {
      throw new BadRequestException('Debe importar el padrón electoral con al menos un elector.');
    }

    // Cálculo determinista de la Huella Digital SHA-256 (ADR-008)
    const electores = await this.prisma.elector.findMany({
      where: { eleccion_id: id },
      select: { dni: true, aula_id: true },
      orderBy: { dni: 'asc' },
    });

    const partidos = await this.prisma.partido.findMany({
      where: { eleccion_id: id },
      select: { numero_lista: true, nombre: true },
      orderBy: { numero_lista: 'asc' },
    });

    const canonicalData = JSON.stringify({
      eleccion_id: id,
      reglas: eleccion.reglas,
      partidos,
      electores_total: electores.length,
      electores_checksum: crypto
        .createHash('sha256')
        .update(JSON.stringify(electores))
        .digest('hex'),
    });

    const huella_sha256 = crypto
      .createHash('sha256')
      .update(canonicalData)
      .digest('hex');

    const abierta = await this.prisma.eleccion.update({
      where: { id },
      data: {
        estado: 'ABIERTA',
        huella_sha256,
        abierta_at: new Date(),
      },
    });

    await this.auditoria.registrar({
      eleccion_id: id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'ABRIR_ELECCION',
      entidad: 'eleccion',
      entidad_id: id,
      datos_despues: {
        huella_sha256,
        abierta_at: abierta.abierta_at,
      },
      ip,
    });

    return abierta;
  }

  /**
   * Transición: ABIERTA -> CERRADA
   * Invariante I14: Balance Cuantitativo estricto ($urna == electores\_voto$).
   */
  async cerrarEleccion(id: string, actorId = 'admin', ip = '127.0.0.1') {
    const eleccion = await this.findOne(id);

    if (eleccion.estado !== 'ABIERTA') {
      throw new BadRequestException(
        `Solo una elección en estado ABIERTA puede ser CERRADA. Estado actual: ${eleccion.estado}`,
      );
    }

    // 1. Verificar si hay electores en proceso de votación
    const habilitacionesActivas = await this.prisma.habilitacion.count({
      where: { eleccion_id: id },
    });

    if (habilitacionesActivas > 0) {
      throw new ConflictException(
        `Hay ${habilitacionesActivas} elector(es) habilitado(s) en proceso de votación. Espere a que terminen o cancele sus reservas antes de cerrar.`,
      );
    }

    // 2. Invariante I14: Total votos en urna == Total electores en "Votó"
    const totalUrna = await this.prisma.urna.count({ where: { eleccion_id: id } });
    const totalVotaron = await this.prisma.elector.count({
      where: { eleccion_id: id, estado: 'VOTO' },
    });

    if (totalUrna !== totalVotaron) {
      // Registrar incidente crítico
      await this.prisma.incidente.create({
        data: {
          eleccion_id: id,
          tipo: 'DESBALANCE_URNA',
          descripcion: `Inconsistencia en cierre: Votos en urna (${totalUrna}) != Electores con estado VOTO (${totalVotaron}). Cierre bloqueado.`,
        },
      });

      throw new ConflictException(
        `INVARIANTE I14 VIOLADO: El número de votos en la urna (${totalUrna}) no coincide con los electores que votaron (${totalVotaron}). Se ha generado un incidente de auditoría.`,
      );
    }

    const cerrada = await this.prisma.eleccion.update({
      where: { id },
      data: {
        estado: 'CERRADA',
        cerrada_at: new Date(),
      },
    });

    await this.auditoria.registrar({
      eleccion_id: id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'CERRAR_ELECCION',
      entidad: 'eleccion',
      entidad_id: id,
      datos_despues: {
        totalUrna,
        totalVotaron,
        cerrada_at: cerrada.cerrada_at,
      },
      ip,
    });

    return cerrada;
  }

  /**
   * Transición: CERRADA -> ABIERTA
   * Permite reanudar la recepción de votos en casos de extensión horaria o correcciones.
   */
  async reaperturarEleccion(id: string, actorId = 'admin', ip = '127.0.0.1') {
    const eleccion = await this.findOne(id);

    if (eleccion.estado !== 'CERRADA') {
      throw new BadRequestException(
        `Solo una elección en estado CERRADA puede ser REAPERTURADA. Estado actual: ${eleccion.estado}`,
      );
    }

    const reaperturada = await this.prisma.eleccion.update({
      where: { id },
      data: {
        estado: 'ABIERTA',
        cerrada_at: null,
      },
    });

    await this.auditoria.registrar({
      eleccion_id: id,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'REAPERTURAR_ELECCION',
      entidad: 'eleccion',
      entidad_id: id,
      datos_despues: {
        estado: 'ABIERTA',
        reaperturada_at: new Date(),
      },
      ip,
    });

    return reaperturada;
  }
}

