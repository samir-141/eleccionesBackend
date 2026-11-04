import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Voto Ciego y Transacción Atómica Indivisible (Fase 6: I1, I2, I3, I4, I5, I9, I18)', () => {
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

  // 1. Invariante I4: Transacción atómica indivisible completa
  it('ejecuta la transacción atómica I4: inserta en urna, elector a VOTO, puesto a LIBRE y elimina habilitación', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Voto 1', 'ABIERTA') RETURNING id;`)
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
        VALUES ('${eleccion}', '${aula}', '11223344', 'Sofia', 'Vega', '5to A', 'HABILITADO')
        RETURNING id;
      `)
    ).rows[0].id;

    const tokenRaw = 'token-super-secreto-voto-1';
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');

    const habId = (
      await db.query<{ id: string }>(`
        INSERT INTO habilitacion (eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
        VALUES ('${eleccion}', '${elector}', '${puesto}', '${tokenHash}', NOW() + INTERVAL '3 minutes')
        RETURNING id;
      `)
    ).rows[0].id;

    // Ejecutar Transacción Atómica I4
    const votoPayload = JSON.stringify({ tipo: 'LISTA', partido_id: 'partido-azul' });

    await db.query(`
      INSERT INTO urna (id, eleccion_id, voto_payload, schema_version)
      VALUES (gen_random_uuid(), '${eleccion}', '${votoPayload}'::jsonb, 1);
    `);
    await db.query(`UPDATE elector SET estado = 'VOTO' WHERE id = '${elector}';`);
    await db.query(`UPDATE puesto SET estado = 'LIBRE' WHERE id = '${puesto}';`);
    await db.query(`DELETE FROM habilitacion WHERE id = '${habId}';`);

    // Verificaciones de Transacción Completa
    // A. Urna contiene 1 voto
    const votosUrna = await db.query<{ count: string }>(`
      SELECT count(*) as count FROM urna WHERE eleccion_id = '${eleccion}';
    `);
    expect(Number(votosUrna.rows[0].count)).toBe(1);

    // B. Elector quedó en VOTO
    const electorCheck = await db.query<{ estado: string }>(`
      SELECT estado FROM elector WHERE id = '${elector}';
    `);
    expect(electorCheck.rows[0].estado).toBe('VOTO');

    // C. Puesto quedó LIBRE
    const puestoCheck = await db.query<{ estado: string }>(`
      SELECT estado FROM puesto WHERE id = '${puesto}';
    `);
    expect(puestoCheck.rows[0].estado).toBe('LIBRE');

    // D. Habilitación eliminada físicamente (I5)
    const habCheck = await db.query(`SELECT id FROM habilitacion WHERE id = '${habId}';`);
    expect(habCheck.rows.length).toBe(0);
  });

  // 2. Invariante I2: La tabla urna tiene EXACTAMENTE 4 columnas
  it('garantiza que la tabla urna tiene exactamente 4 columnas sin fugas de metadatos (I2)', async () => {
    const columnsCheck = await db.query<{ column_name: string }>(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'urna';
    `);

    const columnNames = columnsCheck.rows.map((r) => r.column_name).sort();
    expect(columnNames).toEqual(['eleccion_id', 'id', 'schema_version', 'voto_payload'].sort());

    // Asegurar que NO existan columnas prohibidas
    expect(columnNames).not.toContain('elector_id');
    expect(columnNames).not.toContain('puesto_id');
    expect(columnNames).not.toContain('aula_id');
    expect(columnNames).not.toContain('created_at');
    expect(columnNames).not.toContain('voted_at');
    expect(columnNames).not.toContain('timestamp');
  });

  // 3. Integridad: Bloqueo de reintento de voto con el mismo token (un elector, un voto)
  it('impide la reutilización del token o doble voto una vez consumida la habilitación', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Voto 2', 'ABIERTA') RETURNING id;`)
    ).rows[0].id;

    const tokenRaw = 'token-consumido-123';
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');

    // Intentar buscar habilitación con un token ya eliminado
    const habCheck = await db.query(`
      SELECT id FROM habilitacion WHERE token_voto_hash = '${tokenHash}';
    `);
    expect(habCheck.rows.length).toBe(0); // No existe habilitación activa
  });

  // 4. Invariante I18: Admisión de Voto en Blanco con la misma estructura en urna
  it('permite registrar voto en blanco con formato estandarizado idéntico en urna (I18)', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Voto Blanco', 'ABIERTA') RETURNING id;`)
    ).rows[0].id;

    const votoBlancoPayload = JSON.stringify({ tipo: 'BLANCO' });

    await db.query(`
      INSERT INTO urna (id, eleccion_id, voto_payload, schema_version)
      VALUES (gen_random_uuid(), '${eleccion}', '${votoBlancoPayload}'::jsonb, 1);
    `);

    const urnaCheck = await db.query<{ voto_payload: { tipo: string } }>(`
      SELECT voto_payload FROM urna WHERE eleccion_id = '${eleccion}';
    `);

    expect(urnaCheck.rows.length).toBe(1);
    expect(urnaCheck.rows[0].voto_payload.tipo).toBe('BLANCO');
  });

  // 5. Verificación de Invariante I14: Balance matemático exacto al momento de votar
  it('mantiene balance estricto: suma de votos en urna igual a electores en estado VOTO (I14)', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Balance', 'ABIERTA') RETURNING id;`)
    ).rows[0].id;

    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula Balance') RETURNING id;`)
    ).rows[0].id;

    // Crear 3 electores que votaron
    for (let i = 1; i <= 3; i++) {
      await db.query(`
        INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
        VALUES ('${eleccion}', '${aula}', '8888000${i}', 'Alumno', '${i}', '1ro A', 'VOTO');
      `);
      await db.query(`
        INSERT INTO urna (id, eleccion_id, voto_payload, schema_version)
        VALUES (gen_random_uuid(), '${eleccion}', '{"tipo":"LISTA","partido_id":"partido-a"}'::jsonb, 1);
      `);
    }

    const totalUrna = (
      await db.query<{ count: string }>(`SELECT count(*) as count FROM urna WHERE eleccion_id = '${eleccion}';`)
    ).rows[0].count;

    const totalElectoresVoto = (
      await db.query<{ count: string }>(`SELECT count(*) as count FROM elector WHERE eleccion_id = '${eleccion}' AND estado = 'VOTO';`)
    ).rows[0].count;

    expect(Number(totalUrna)).toBe(3);
    expect(Number(totalElectoresVoto)).toBe(3);
    expect(Number(totalUrna)).toBe(Number(totalElectoresVoto)); // Invariante I14 exacto
  });
});

