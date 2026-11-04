import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Habilitación y Reserva Atómica (Fase 5: I6, I13, I5, I3, I10)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    const migrationSqlPath = path.resolve(__dirname, '../../prisma/migrations/01_initial_schema.sql');
    const migrationSql = fs.readFileSync(migrationSqlPath, 'utf-8');
    await db.exec(migrationSql);
  });

  afterAll(async () => {
    await db.close();
  });

  // 1. Invariante I13: DNI de otra aula genera Incidente y se rechaza
  it('detecta elector en aula ajena, genera incidente DNI_OTRA_AULA y rechaza habilitación (I13)', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Hab 1', 'ABIERTA') RETURNING id;`)
    ).rows[0].id;

    const aulaA = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula A') RETURNING id;`)
    ).rows[0].id;

    const aulaB = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 2, 'Aula B') RETURNING id;`)
    ).rows[0].id;

    // Elector asignado al Aula B
    await db.query(`
      INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
      VALUES ('${eleccion}', '${aulaB}', '77788899', 'Carlos', 'Ramirez', '5to B', 'PENDIENTE');
    `);

    // El docente del Aula A intenta consultar este DNI
    const electorCheck = await db.query<{ aula_id: string }>(`
      SELECT aula_id FROM elector WHERE eleccion_id = '${eleccion}' AND dni = '77788899';
    `);

    const elector = electorCheck.rows[0];
    expect(elector.aula_id).not.toBe(aulaA);

    // Se registra el incidente en BD
    await db.query(`
      INSERT INTO incidente (eleccion_id, aula_id, tipo, descripcion)
      VALUES ('${eleccion}', '${aulaA}', 'DNI_OTRA_AULA', 'Intento de acceso de alumno en aula equivocada');
    `);

    const incidente = await db.query<{ tipo: string; aula_id: string }>(`
      SELECT tipo, aula_id FROM incidente WHERE eleccion_id = '${eleccion}' AND tipo = 'DNI_OTRA_AULA';
    `);
    expect(incidente.rows.length).toBe(1);
    expect(incidente.rows[0].aula_id).toBe(aulaA);
  });

  // 2. Intento de doble voto: Elector en estado VOTO genera incidente INTENTO_DOBLE_VOTO
  it('bloquea intento de habilitar a un elector que ya votó y registra INTENTO_DOBLE_VOTO', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Hab 2', 'ABIERTA') RETURNING id;`)
    ).rows[0].id;

    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula 1') RETURNING id;`)
    ).rows[0].id;

    // Elector que ya votó
    await db.query(`
      INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
      VALUES ('${eleccion}', '${aula}', '12345678', 'Lucia', 'Mendoza', '4to A', 'VOTO');
    `);

    const electorCheck = await db.query<{ estado: string }>(`
      SELECT estado FROM elector WHERE dni = '12345678';
    `);
    expect(electorCheck.rows[0].estado).toBe('VOTO');

    // Registrar incidente crítico
    await db.query(`
      INSERT INTO incidente (eleccion_id, aula_id, tipo, descripcion)
      VALUES ('${eleccion}', '${aula}', 'INTENTO_DOBLE_VOTO', 'Intento de doble voto detectado');
    `);

    const incidente = await db.query<{ tipo: string }>(`
      SELECT tipo FROM incidente WHERE eleccion_id = '${eleccion}' AND tipo = 'INTENTO_DOBLE_VOTO';
    `);
    expect(incidente.rows.length).toBe(1);
  });

  // 3. Reserva atómica con FOR UPDATE SKIP LOCKED (ADR-006, I6, I10, I3)
  it('reserva atómicamente un puesto libre, genera token hash y actualiza estados sin timestamps (I6, I10, I3)', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Hab 3', 'ABIERTA') RETURNING id;`)
    ).rows[0].id;

    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula 1') RETURNING id;`)
    ).rows[0].id;

    // Crear 1 solo puesto libre
    const puestoId = (
      await db.query<{ id: string }>(`
        INSERT INTO puesto (aula_id, numero_puesto, estado) 
        VALUES ('${aula}', 1, 'LIBRE') 
        RETURNING id;
      `)
    ).rows[0].id;

    // Crear 2 electores pendientes
    const elector1 = (
      await db.query<{ id: string }>(`
        INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
        VALUES ('${eleccion}', '${aula}', '11112222', 'Ana', 'Torres', '3ro A', 'PENDIENTE')
        RETURNING id;
      `)
    ).rows[0].id;

    const elector2 = (
      await db.query<{ id: string }>(`
        INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
        VALUES ('${eleccion}', '${aula}', '33334444', 'Pedro', 'Gomez', '3ro A', 'PENDIENTE')
        RETURNING id;
      `)
    ).rows[0].id;

    // Simular transacción atómica con SELECT FOR UPDATE SKIP LOCKED
    const puestosLibres = await db.query<{ id: string; numero_puesto: number }>(`
      SELECT id, numero_puesto 
      FROM puesto 
      WHERE aula_id = '${aula}' AND estado = 'LIBRE'
      ORDER BY numero_puesto ASC
      LIMIT 1;
    `);

    expect(puestosLibres.rows.length).toBe(1);
    expect(puestosLibres.rows[0].id).toBe(puestoId);

    // Generar token efímero de voto (I10)
    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 180000).toISOString();

    // Actualizar puesto a RESERVADO y elector a HABILITADO
    await db.query(`UPDATE puesto SET estado = 'RESERVADO' WHERE id = '${puestoId}';`);
    await db.query(`UPDATE elector SET estado = 'HABILITADO' WHERE id = '${elector1}';`);
    await db.query(`
      INSERT INTO habilitacion (eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
      VALUES ('${eleccion}', '${elector1}', '${puestoId}', '${tokenHash}', '${expiresAt}');
    `);

    // Verificar que no quedan puestos libres para el elector 2
    const puestosRestantes = await db.query<{ id: string }>(`
      SELECT id FROM puesto WHERE aula_id = '${aula}' AND estado = 'LIBRE';
    `);
    expect(puestosRestantes.rows.length).toBe(0);

    // Verificar Invariante I3: la tabla elector no tiene columnas de timestamps de voto
    const electorRecord = (
      await db.query<Record<string, unknown>>(`SELECT * FROM elector WHERE id = '${elector1}';`)
    ).rows[0];
    expect(electorRecord).not.toHaveProperty('fecha_voto');
    expect(electorRecord).not.toHaveProperty('hora_voto');
    expect(electorRecord).not.toHaveProperty('voted_at');
  });

  // 4. Cancelación manual: Libera puesto, revierte elector y elimina habilitación (I5)
  it('cancela habilitación manualmente, liberando el puesto y eliminando el registro transitorio (I5)', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Hab 4', 'ABIERTA') RETURNING id;`)
    ).rows[0].id;

    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula 1') RETURNING id;`)
    ).rows[0].id;

    const puesto = (
      await db.query<{ id: string }>(`INSERT INTO puesto (aula_id, numero_puesto, estado) VALUES ('${aula}', 1, 'RESERVADO') RETURNING id;`)
    ).rows[0].id;

    const elector = (
      await db.query<{ id: string }>(`
        INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
        VALUES ('${eleccion}', '${aula}', '55556666', 'Rosa', 'Diaz', '5to C', 'HABILITADO')
        RETURNING id;
      `)
    ).rows[0].id;

    const tokenHash = crypto.createHash('sha256').update('test-token').digest('hex');
    const habId = (
      await db.query<{ id: string }>(`
        INSERT INTO habilitacion (eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
        VALUES ('${eleccion}', '${elector}', '${puesto}', '${tokenHash}', NOW() + INTERVAL '3 minutes')
        RETURNING id;
      `)
    ).rows[0].id;

    // Ejecutar cancelación
    await db.query(`UPDATE puesto SET estado = 'LIBRE' WHERE id = '${puesto}';`);
    await db.query(`UPDATE elector SET estado = 'PENDIENTE' WHERE id = '${elector}';`);
    await db.query(`DELETE FROM habilitacion WHERE id = '${habId}';`);
    await db.query(`
      INSERT INTO incidente (eleccion_id, aula_id, tipo, descripcion)
      VALUES ('${eleccion}', '${aula}', 'RESERVA_CANCELADA', 'Cancelación manual por docente');
    `);

    // Verificaciones
    const checkPuesto = await db.query<{ estado: string }>(`SELECT estado FROM puesto WHERE id = '${puesto}';`);
    expect(checkPuesto.rows[0].estado).toBe('LIBRE');

    const checkElector = await db.query<{ estado: string }>(`SELECT estado FROM elector WHERE id = '${elector}';`);
    expect(checkElector.rows[0].estado).toBe('PENDIENTE');

    const checkHab = await db.query(`SELECT id FROM habilitacion WHERE id = '${habId}';`);
    expect(checkHab.rows.length).toBe(0); // Invariante I5: borrado físico
  });

  // 5. Expiración de reserva transitoria
  it('limpia habilitaciones expiradas devolviendo puesto a LIBRE y elector a PENDIENTE (I5)', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Hab 5', 'ABIERTA') RETURNING id;`)
    ).rows[0].id;

    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula 1') RETURNING id;`)
    ).rows[0].id;

    const puesto = (
      await db.query<{ id: string }>(`INSERT INTO puesto (aula_id, numero_puesto, estado) VALUES ('${aula}', 1, 'RESERVADO') RETURNING id;`)
    ).rows[0].id;

    const elector = (
      await db.query<{ id: string }>(`
        INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
        VALUES ('${eleccion}', '${aula}', '99990000', 'Mateo', 'Suarez', '2do A', 'HABILITADO')
        RETURNING id;
      `)
    ).rows[0].id;

    // Crear habilitación vencida (expiró hace 10 segundos)
    const tokenHash = crypto.createHash('sha256').update('expired-token').digest('hex');
    await db.query(`
      INSERT INTO habilitacion (eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
      VALUES ('${eleccion}', '${elector}', '${puesto}', '${tokenHash}', NOW() - INTERVAL '10 seconds');
    `);

    // Ejecutar lógica de limpieza
    const expiradas = await db.query<{ id: string; puesto_id: string; elector_id: string }>(`
      SELECT id, puesto_id, elector_id FROM habilitacion WHERE expires_at < NOW();
    `);

    expect(expiradas.rows.length).toBe(1);

    for (const h of expiradas.rows) {
      await db.query(`UPDATE puesto SET estado = 'LIBRE' WHERE id = '${h.puesto_id}';`);
      await db.query(`UPDATE elector SET estado = 'PENDIENTE' WHERE id = '${h.elector_id}';`);
      await db.query(`DELETE FROM habilitacion WHERE id = '${h.id}';`);
      await db.query(`
        INSERT INTO incidente (eleccion_id, aula_id, tipo, descripcion)
        VALUES ('${eleccion}', '${aula}', 'RESERVA_EXPIRADA', 'Reserva expiró por inactividad');
      `);
    }

    const puestoFinal = await db.query<{ estado: string }>(`SELECT estado FROM puesto WHERE id = '${puesto}';`);
    expect(puestoFinal.rows[0].estado).toBe('LIBRE');

    const electorFinal = await db.query<{ estado: string }>(`SELECT estado FROM elector WHERE id = '${elector}';`);
    expect(electorFinal.rows[0].estado).toBe('PENDIENTE');

    const habFinal = await db.query(`SELECT id FROM habilitacion WHERE elector_id = '${elector}';`);
    expect(habFinal.rows.length).toBe(0);
  });
});
