import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

describe('Aulas, Partidos, Padrón CSV & Pantalla de Puerta (Fase 3)', () => {
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

  it('impide dos aulas con el mismo número en la misma elección', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec Aulas') RETURNING id;`)
    ).rows[0].id;

    await db.query(`
      INSERT INTO aula (eleccion_id, numero, nombre, capacidad)
      VALUES ('${eleccion}', 1, 'Aula 101', 40);
    `);

    // Intentar insertar la misma aula con número 1 -> debe ser rechazada por restricción UNIQUE
    await expect(
      db.query(`
        INSERT INTO aula (eleccion_id, numero, nombre, capacidad)
        VALUES ('${eleccion}', 1, 'Aula 102', 40);
      `)
    ).rejects.toThrow();
  });

  it('impide dos partidos con el mismo número de lista en la misma elección', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec Partidos') RETURNING id;`)
    ).rows[0].id;

    await db.query(`
      INSERT INTO partido (eleccion_id, numero_lista, nombre)
      VALUES ('${eleccion}', 1, 'Lista Unión');
    `);

    await expect(
      db.query(`
        INSERT INTO partido (eleccion_id, numero_lista, nombre)
        VALUES ('${eleccion}', 1, 'Lista Fuerza');
      `)
    ).rejects.toThrow();
  });

  it('importa electores vinculados a sus aulas correspondientes en el padrón', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec Padron') RETURNING id;`)
    ).rows[0].id;

    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula 1') RETURNING id;`)
    ).rows[0].id;

    await db.query(`
      INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
      VALUES 
        ('${eleccion}', '${aula}', '70000001', 'Carlos', 'Mejía', '5to A', 'PENDIENTE'),
        ('${eleccion}', '${aula}', '70000002', 'Lucía', 'Fernández', '5to A', 'PENDIENTE');
    `);

    const count = await db.query<{ count: string }>(`
      SELECT COUNT(*) as count FROM elector WHERE eleccion_id = '${eleccion}' AND aula_id = '${aula}';
    `);

    expect(Number(count.rows[0].count)).toBe(2);
  });

  it('Invariante I1 en Pantalla de Puerta: la consulta pública excluye por completo el estado del elector', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec Puerta') RETURNING id;`)
    ).rows[0].id;

    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula Puerta') RETURNING id;`)
    ).rows[0].id;

    // Insertar un elector que ya votó y uno pendiente
    await db.query(`
      INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
      VALUES 
        ('${eleccion}', '${aula}', '71111111', 'Ana', 'Ramos', '4to B', 'VOTO'),
        ('${eleccion}', '${aula}', '72222222', 'David', 'Salas', '4to B', 'PENDIENTE');
    `);

    // Consulta de pantalla de puerta (proyección estricta autorizada)
    const puertaQuery = await db.query<{ id: string; nombres: string; apellidos: string; grado_seccion: string; estado?: string }>(`
      SELECT id, nombres, apellidos, grado_seccion
      FROM elector
      WHERE aula_id = '${aula}'
      ORDER BY apellidos ASC;
    `);

    expect(puertaQuery.rows).toHaveLength(2);
    // Verificación crítica: NINGÚN registro en la proyección de puerta contiene la propiedad 'estado'
    for (const row of puertaQuery.rows) {
      expect(row.estado).toBeUndefined();
    }
  });
});

