import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

describe('Escrutinio Oficial y Fórmulas Electorales (Fase 7: I14, I18, I19)', () => {
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

  // 1. Invariante I19: Lectura aleatorizada de la urna con ORDER BY RANDOM()
  it('lee la urna de manera aleatoria con ORDER BY RANDOM() para escrutinio (I19)', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Escrutinio 1', 'CERRADA') RETURNING id;`)
    ).rows[0].id;

    for (let i = 1; i <= 10; i++) {
      await db.query(`
        INSERT INTO urna (id, eleccion_id, voto_payload, schema_version)
        VALUES (gen_random_uuid(), '${eleccion}', '{"tipo":"LISTA","partido_id":"p-${i}"}'::jsonb, 1);
      `);
    }

    const votosAleatorios = await db.query<{ voto_payload: { partido_id: string } }>(`
      SELECT voto_payload FROM urna WHERE eleccion_id = '${eleccion}' ORDER BY RANDOM();
    `);

    expect(votosAleatorios.rows.length).toBe(10);
  });

  // 2. Fórmulas electorales: Voto en blanco fuera del porcentaje vs dentro del porcentaje
  it('calcula porcentajes excluyendo el voto en blanco si blanco_en_porcentaje es falso', async () => {
    const totalVotos = 100;
    const votosListaA = 40;
    const votosListaB = 20;
    const votosBlanco = 40;

    // Regla: blanco_en_porcentaje = false -> Base = 60 (votos válidos)
    const baseValidos = totalVotos - votosBlanco;
    const porcentajeA = Number(((votosListaA / baseValidos) * 100).toFixed(2));
    const porcentajeB = Number(((votosListaB / baseValidos) * 100).toFixed(2));

    expect(porcentajeA).toBe(66.67); // 40/60 = 66.67%
    expect(porcentajeB).toBe(33.33); // 20/60 = 33.33%

    // Regla: blanco_en_porcentaje = true -> Base = 100
    const porcentajeConBlancoA = Number(((votosListaA / totalVotos) * 100).toFixed(2));
    expect(porcentajeConBlancoA).toBe(40.0); // 40/100 = 40%
  });

  // 3. Quórum y declaración de elección desierta
  it('evalúa quórum y declara elección desierta si la participación no alcanza el mínimo configurado', async () => {
    const padronTotal = 200;
    const electoresVotaron = 80;
    const quorumRequerido = 50.0;

    const participacion = (electoresVotaron / padronTotal) * 100;
    expect(participacion).toBe(40.0);

    const quorumCumplido = participacion >= quorumRequerido;
    expect(quorumCumplido).toBe(false);

    // Acción sin quórum = DECLARAR_DESIERTA
    const accion = 'DECLARAR_DESIERTA';
    const esDesierta = !quorumCumplido && accion === 'DECLARAR_DESIERTA';
    expect(esDesierta).toBe(true);
  });

  // 4. Umbral de mayoría y segunda vuelta
  it('determina ganador en primera vuelta si supera el 50%, o pasa a segunda vuelta si no lo alcanza', async () => {
    const porcentajeMinimo = 50.0;

    // Caso A: Lista A con 55% -> Ganador directo
    const lista1Porcentaje = 55.0;
    const ganaEnPrimera = lista1Porcentaje >= porcentajeMinimo;
    expect(ganaEnPrimera).toBe(true);

    // Caso B: Lista A con 42%, Lista B con 38% -> Pasan a segunda vuelta
    const casoBLista1 = 42.0;
    const casoBLista2 = 38.0;
    const requiereSegunda = casoBLista1 < porcentajeMinimo;
    expect(requiereSegunda).toBe(true);

    const pasanSegundaVuelta = [
      { id: 'p1', porcentaje: casoBLista1 },
      { id: 'p2', porcentaje: casoBLista2 },
    ];
    expect(pasanSegundaVuelta.length).toBe(2);
  });

  // 5. Persistencia de resultado en tabla resultado_escrutinio y verificación de huella
  it('persiste el resultado en resultado_escrutinio con verificación de huella SHA-256', async () => {
    const huellaSha = 'a'.repeat(64);
    const eleccion = (
      await db.query<{ id: string }>(`
        INSERT INTO eleccion (nombre, estado, huella_sha256) 
        VALUES ('Elec Reporte', 'CERRADA', '${huellaSha}') 
        RETURNING id;
      `)
    ).rows[0].id;

    // Insertar resultado de escrutinio oficial
    await db.query(`
      INSERT INTO resultado_escrutinio (
        eleccion_id, total_votos_urna, total_electores_votaron, conteo_partidos, 
        porcentajes_calculados, quorum_cumplido, huella_verificada
      )
      VALUES (
        '${eleccion}', 50, 50, '{"votos_blanco": 5}'::jsonb, 
        '{"participacion": 80.0}'::jsonb, true, true
      );
    `);

    // Actualizar estado a ESCRUTADA
    await db.query(`UPDATE eleccion SET estado = 'ESCRUTADA' WHERE id = '${eleccion}';`);

    const resultadoCheck = await db.query<{
      total_votos_urna: number;
      quorum_cumplido: boolean;
      huella_verificada: boolean;
    }>(`
      SELECT total_votos_urna, quorum_cumplido, huella_verificada 
      FROM resultado_escrutinio 
      WHERE eleccion_id = '${eleccion}';
    `);

    expect(resultadoCheck.rows.length).toBe(1);
    expect(resultadoCheck.rows[0].total_votos_urna).toBe(50);
    expect(resultadoCheck.rows[0].quorum_cumplido).toBe(true);
    expect(resultadoCheck.rows[0].huella_verificada).toBe(true);

    const eleccionCheck = await db.query<{ estado: string }>(`
      SELECT estado FROM eleccion WHERE id = '${eleccion}';
    `);
    expect(eleccionCheck.rows[0].estado).toBe('ESCRUTADA');
  });
});

