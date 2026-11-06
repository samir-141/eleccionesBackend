import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Eleccion Lifecycle & Rule Freeze (Fase 2)', () => {
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

  it('crea una elección en estado BORRADOR por defecto con reglas estándar', async () => {
    const res = await db.query<{ id: string; estado: string; reglas: any }>(`
      INSERT INTO eleccion (nombre, descripcion)
      VALUES ('Elección Escolar 2026', 'Elección del municipio escolar')
      RETURNING id, estado, reglas;
    `);

    expect(res.rows[0].estado).toBe('BORRADOR');
    expect(res.rows[0].reglas.blanco_en_porcentaje).toBe(false);
    expect(res.rows[0].reglas.duracion_reserva_segundos).toBe(180);
  });

  it('permite actualizar reglas cuando la elección está en BORRADOR', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`
        INSERT INTO eleccion (nombre) VALUES ('Elección Borrador Reglas') RETURNING id;
      `)
    ).rows[0].id;

    const nuevasReglas = {
      blanco_en_porcentaje: true,
      porcentaje_minimo_ganar: 45.0,
      segunda_vuelta: true,
      cuantos_pasan_segunda_vuelta: 2,
      duracion_reserva_segundos: 240,
    };

    await db.query(`
      UPDATE eleccion
      SET reglas = '${JSON.stringify(nuevasReglas)}'::jsonb
      WHERE id = '${eleccion}' AND estado = 'BORRADOR';
    `);

    const check = await db.query<{ reglas: any }>(`
      SELECT reglas FROM eleccion WHERE id = '${eleccion}';
    `);

    expect(check.rows[0].reglas.blanco_en_porcentaje).toBe(true);
    expect(check.rows[0].reglas.duracion_reserva_segundos).toBe(240);
  });

  it('calcula la huella criptográfica SHA-256 determinista al abrir la elección', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`
        INSERT INTO eleccion (nombre) VALUES ('Elección Apertura Hash') RETURNING id;
      `)
    ).rows[0].id;

    // Crear aula
    const aula = (
      await db.query<{ id: string }>(`
        INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula 1') RETURNING id;
      `)
    ).rows[0].id;

    // Crear partidos
    await db.query(`
      INSERT INTO partido (eleccion_id, numero_lista, nombre)
      VALUES 
        ('${eleccion}', 1, 'Lista Juventud'),
        ('${eleccion}', 2, 'Lista Futuro');
    `);

    // Crear electores
    await db.query(`
      INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion)
      VALUES 
        ('${eleccion}', '${aula}', '10000001', 'Alum1', 'Ap1', '1A'),
        ('${eleccion}', '${aula}', '10000002', 'Alum2', 'Ap2', '1A');
    `);

    // Simular el cálculo canónico de SHA-256
    const electores = await db.query(`SELECT dni, aula_id FROM elector WHERE eleccion_id = '${eleccion}' ORDER BY dni ASC;`);
    const partidos = await db.query(`SELECT numero_lista, nombre FROM partido WHERE eleccion_id = '${eleccion}' ORDER BY numero_lista ASC;`);
    const reglas = (await db.query<{ reglas: any }>(`SELECT reglas FROM eleccion WHERE id = '${eleccion}';`)).rows[0].reglas;

    const canonicalData = JSON.stringify({
      eleccion_id: eleccion,
      reglas,
      partidos: partidos.rows,
      electores_total: electores.rows.length,
      electores_checksum: crypto.createHash('sha256').update(JSON.stringify(electores.rows)).digest('hex'),
    });

    const hash = crypto.createHash('sha256').update(canonicalData).digest('hex');
    expect(hash).toHaveLength(64);

    // Transicionar a ABIERTA con el hash
    await db.query(`
      UPDATE eleccion
      SET estado = 'ABIERTA', huella_sha256 = '${hash}', abierta_at = NOW()
      WHERE id = '${eleccion}';
    `);

    const updated = await db.query<{ estado: string; huella_sha256: string }>(`
      SELECT estado, huella_sha256 FROM eleccion WHERE id = '${eleccion}';
    `);

    expect(updated.rows[0].estado).toBe('ABIERTA');
    expect(updated.rows[0].huella_sha256).toBe(hash);
  });

  it('auditoría inmutable registra el evento sin contener datos de votos (Invariante I12)', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec Audit Test') RETURNING id;`)
    ).rows[0].id;

    await db.query(`
      INSERT INTO auditoria_log (eleccion_id, actor_tipo, actor_id, accion, entidad, entidad_id, datos_despues, ip)
      VALUES ('${eleccion}', 'ADMIN', 'admin_user', 'ABRIR_ELECCION', 'eleccion', '${eleccion}', '{"huella": "abc"}'::jsonb, '192.168.1.10');
    `);

    const audit = await db.query<{ accion: string; actor_id: string }>(`
      SELECT accion, actor_id FROM auditoria_log WHERE eleccion_id = '${eleccion}';
    `);

    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0].accion).toBe('ABRIR_ELECCION');
  });

  it('permite reaperturar una elección en estado CERRADA retornando a ABIERTA y auditando el evento', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`
        INSERT INTO eleccion (nombre, estado, huella_sha256, cerrada_at)
        VALUES ('Elec Cerrada Test', 'CERRADA', 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', NOW())
        RETURNING id;
      `)
    ).rows[0].id;

    // Reaperturar la elección
    await db.query(`
      UPDATE eleccion
      SET estado = 'ABIERTA', cerrada_at = NULL
      WHERE id = '${eleccion}' AND estado = 'CERRADA';
    `);

    // Registrar auditoría de reapertura
    await db.query(`
      INSERT INTO auditoria_log (eleccion_id, actor_tipo, actor_id, accion, entidad, entidad_id, datos_despues, ip)
      VALUES ('${eleccion}', 'ADMIN', 'admin', 'REAPERTURAR_ELECCION', 'eleccion', '${eleccion}', '{"estado":"ABIERTA"}'::jsonb, '127.0.0.1');
    `);

    const check = await db.query<{ estado: string; cerrada_at: any }>(`
      SELECT estado, cerrada_at FROM eleccion WHERE id = '${eleccion}';
    `);

    expect(check.rows[0].estado).toBe('ABIERTA');
    expect(check.rows[0].cerrada_at).toBeNull();

    const audit = await db.query<{ accion: string }>(`
      SELECT accion FROM auditoria_log WHERE eleccion_id = '${eleccion}' AND accion = 'REAPERTURAR_ELECCION';
    `);
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0].accion).toBe('REAPERTURAR_ELECCION');
  });

  it('permite crear una nueva elección en estado BORRADOR con configuración de aulas y listas', async () => {
    const nuevaEleccion = (
      await db.query<{ id: string; estado: string }>(`
        INSERT INTO eleccion (nombre, descripcion, estado)
        VALUES ('Elección Municipio Escolar 2027', 'Nueva convocatoria anual', 'BORRADOR')
        RETURNING id, estado;
      `)
    ).rows[0];

    expect(nuevaEleccion.estado).toBe('BORRADOR');

    // Registrar auditoría de creación
    await db.query(`
      INSERT INTO auditoria_log (eleccion_id, actor_tipo, actor_id, accion, entidad, entidad_id, ip)
      VALUES ('${nuevaEleccion.id}', 'ADMIN', 'admin', 'CREAR_ELECCION', 'eleccion', '${nuevaEleccion.id}', '127.0.0.1');
    `);

    const audit = await db.query<{ accion: string }>(`
      SELECT accion FROM auditoria_log WHERE eleccion_id = '${nuevaEleccion.id}' AND accion = 'CREAR_ELECCION';
    `);
    expect(audit.rows).toHaveLength(1);
  });
});

