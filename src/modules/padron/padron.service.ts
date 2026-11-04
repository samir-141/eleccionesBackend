import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ElectorCsvRowDto } from './dto/importar-padron.dto';

@Injectable()
export class PadronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /**
   * Procesa y valida el texto CSV sin insertarlo, retornando una vista previa
   * con identificación de errores línea por línea.
   */
  async previsualizarCsv(eleccionId: string, csvContent: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      include: { aulas: true },
    });

    if (!eleccion) {
      throw new NotFoundException(`Elección ${eleccionId} no encontrada`);
    }

    if (eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException('El padrón solo puede modificarse cuando la elección se encuentra en estado BORRADOR.');
    }

    const mapaAulas = new Map<number, string>();
    for (const aula of eleccion.aulas) {
      mapaAulas.set(aula.numero, aula.id);
    }

    // Obtener DNIs ya existentes en la BD para esta elección
    const existentesDb = await this.prisma.elector.findMany({
      where: { eleccion_id: eleccionId },
      select: { dni: true },
    });
    const setDnisExistentes = new Set(existentesDb.map((e) => e.dni.trim()));

    const lineas = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lineas.length <= 1) {
      throw new BadRequestException('El archivo CSV está vacío o solo contiene la cabecera.');
    }

    // Cabecera esperada: dni,nombres,apellidos,grado_seccion,aula_numero
    const cabecera = lineas[0].toLowerCase();
    const separador = cabecera.includes(';') ? ';' : ',';

    const validos: (ElectorCsvRowDto & { aula_id: string })[] = [];
    const errores: { fila: number; dni?: string; motivo: string }[] = [];
    const setDnisEnCsv = new Set<string>();

    for (let i = 1; i < lineas.length; i++) {
      const filaNumero = i + 1;
      const columnas = lineas[i].split(separador).map((c) => c.trim().replace(/^["']|["']$/g, ''));

      if (columnas.length < 5) {
        errores.push({
          fila: filaNumero,
          motivo: 'Faltan columnas (se esperan: DNI, Nombres, Apellidos, Grado/Sección, Número de Aula)',
        });
        continue;
      }

      const [dni, nombres, apellidos, grado_seccion, aulaStr] = columnas;
      const aulaNumero = parseInt(aulaStr, 10);

      if (!dni || dni.length < 6 || dni.length > 15) {
        errores.push({ fila: filaNumero, dni, motivo: 'DNI inválido (debe tener entre 6 y 15 caracteres)' });
        continue;
      }

      if (setDnisEnCsv.has(dni)) {
        errores.push({ fila: filaNumero, dni, motivo: 'DNI duplicado dentro del mismo archivo CSV' });
        continue;
      }
      setDnisEnCsv.add(dni);

      if (setDnisExistentes.has(dni)) {
        errores.push({ fila: filaNumero, dni, motivo: 'El DNI ya se encuentra registrado en el padrón de esta elección' });
        continue;
      }

      if (!nombres || !apellidos) {
        errores.push({ fila: filaNumero, dni, motivo: 'Nombres o apellidos vacíos' });
        continue;
      }

      if (isNaN(aulaNumero) || !mapaAulas.has(aulaNumero)) {
        errores.push({
          fila: filaNumero,
          dni,
          motivo: `El Aula número "${aulaStr}" no existe en esta elección. Configure las aulas primero.`,
        });
        continue;
      }

      validos.push({
        dni,
        nombres,
        apellidos,
        grado_seccion: grado_seccion || 'General',
        aula_numero: aulaNumero,
        aula_id: mapaAulas.get(aulaNumero)!,
      });
    }

    return {
      total_lineas: lineas.length - 1,
      total_validos: validos.length,
      total_errores: errores.length,
      validos: validos.slice(0, 100), // Preview de hasta 100
      errores,
      puede_importar: validos.length > 0 && errores.length === 0,
    };
  }

  /**
   * Confirma e inserta los electores en lote.
   */
  async confirmarImportacion(
    eleccionId: string,
    electores: ElectorCsvRowDto[],
    actorId = 'admin',
    ip = '127.0.0.1',
  ) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      include: { aulas: true },
    });

    if (!eleccion || eleccion.estado !== 'BORRADOR') {
      throw new BadRequestException('No se puede importar el padrón: la elección no está en estado BORRADOR.');
    }

    const mapaAulas = new Map<number, string>();
    for (const aula of eleccion.aulas) {
      mapaAulas.set(aula.numero, aula.id);
    }

    const dataToInsert = electores.map((e) => {
      const aulaId = mapaAulas.get(Number(e.aula_numero));
      if (!aulaId) {
        throw new BadRequestException(`Aula ${e.aula_numero} no válida`);
      }
      return {
        eleccion_id: eleccionId,
        aula_id: aulaId,
        dni: e.dni.trim(),
        nombres: e.nombres.trim(),
        apellidos: e.apellidos.trim(),
        grado_seccion: e.grado_seccion.trim(),
        estado: 'PENDIENTE' as const,
      };
    });

    const resultado = await this.prisma.elector.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    await this.auditoria.registrar({
      eleccion_id: eleccionId,
      actor_tipo: 'ADMIN',
      actor_id: actorId,
      accion: 'IMPORTAR_PADRON_CSV',
      entidad: 'padron',
      datos_despues: { total_importados: resultado.count },
      ip,
    });

    return {
      total_registrados: resultado.count,
    };
  }

  async listarElectores(eleccionId: string, page = 1, limit = 50, busqueda?: string) {
    const skip = (page - 1) * limit;
    const where: any = { eleccion_id: eleccionId };

    if (busqueda && busqueda.trim().length > 0) {
      where.OR = [
        { dni: { contains: busqueda.trim(), mode: 'insensitive' } },
        { nombres: { contains: busqueda.trim(), mode: 'insensitive' } },
        { apellidos: { contains: busqueda.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, electores] = await Promise.all([
      this.prisma.elector.count({ where }),
      this.prisma.elector.findMany({
        where,
        skip,
        take: limit,
        include: { aula: { select: { numero: true, nombre: true } } },
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
      }),
    ]);

    return {
      total,
      pagina: page,
      total_paginas: Math.ceil(total / limit),
      electores,
    };
  }

  /**
   * INVARIANTE I1: PANTALLA PÚBLICA DE PUERTA DEL AULA
   * Proyecta en monitor público quiénes votan en esta aula.
   * PROHIBICIÓN RADICAL: Jamás expone si el elector ya votó o no.
   */
  async obtenerParaPantallaPuerta(aulaId: string) {
    const aula = await this.prisma.aula.findUnique({
      where: { id: aulaId },
      include: {
        eleccion: {
          select: { nombre: true, estado: true },
        },
      },
    });

    if (!aula) {
      throw new NotFoundException(`Aula con ID ${aulaId} no encontrada`);
    }

    // Invariante I1: Solo traemos id, nombres, apellidos y grado_seccion.
    // EXCLUIDO INTENCIONALMENTE: estado, created_at, y cualquier indicador de voto.
    const electores = await this.prisma.elector.findMany({
      where: { aula_id: aulaId },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        grado_seccion: true,
      },
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    });

    return {
      eleccion: aula.eleccion.nombre,
      estado_eleccion: aula.eleccion.estado,
      aula: {
        id: aula.id,
        numero: aula.numero,
        nombre: aula.nombre,
      },
      total_asignados: electores.length,
      electores,
    };
  }
}

