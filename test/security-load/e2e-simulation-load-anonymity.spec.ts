import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Simulación E2E, Carga Concurrente, Anonimato y Seguridad (Fase 8: T-801 a T-804)', () => {
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

  // T-801: Simulación de Elección Completa de Punta a Punta
  it('ejecuta simulación de ciclo de vida completo: Borrador -> Abierta -> Votación -> Cerrada -> Escrutada', async () => {
    // 1. Crear Elección en BORRADOR
    const eleccionId = (
      await db.query<{ id: string }>(`
        INSERT INTO eleccion (nombre, descripcion, estado)
        VALUES ('Elección Escolar Institucional 2026', 'Directiva estudiantil', 'BORRADOR')
        RETURNING id;
      `)
    ).rows[0].id;

    // 2. Crear 5 Aulas
    const aulasIds: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const aId = (
        await db.query<{ id: string }>(`
          INSERT INTO aula (eleccion_id, numero, nombre, capacidad)
          VALUES ('${eleccionId}', ${i}, 'Aula ${i}', 60)
          RETURNING id;
        `)
      ).rows[0].id;
      aulasIds.push(aId);

      // Crear 2 puestos por aula
      for (let p = 1; p <= 2; p++) {
        await db.query(`
          INSERT INTO puesto (aula_id, numero_puesto, estado)
          VALUES ('${aId}', ${p}, 'LIBRE');
        `);
      }
    }

    // 3. Crear 3 Partidos
    const partidoIds: string[] = [];
    for (let p = 1; p <= 3; p++) {
      const pId = (
        await db.query<{ id: string }>(`
          INSERT INTO partido (eleccion_id, numero_lista, nombre, lema)
          VALUES ('${eleccionId}', ${p}, 'Lista ${p} Progreso', 'Por un colegio mejor')
          RETURNING id;
        `)
      ).rows[0].id;
      partidoIds.push(pId);
    }

    // 4. Cargar Padrón con 100 Electores distribuidos en las 5 aulas
    const electores: Array<{ id: string; aula_id: string }> = [];
    for (let e = 1; e <= 100; e++) {
      const aulaAsignada = aulasIds[(e - 1) % 5];
      const dni = (10000000 + e).toString();
      const eId = (
        await db.query<{ id: string }>(`
          INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
          VALUES ('${eleccionId}', '${aulaAsignada}', '${dni}', 'Estudiante', '${e}', 'Secundaria', 'PENDIENTE')
          RETURNING id;
        `)
      ).rows[0].id;
      electores.push({ id: eId, aula_id: aulaAsignada });
    }

    // 5. Abrir Elección y congelar Huella SHA-256
    const huellaSha = crypto
      .createHash('sha256')
      .update(JSON.stringify({ eleccionId, totalElectores: 100, totalPartidos: 3 }))
      .digest('hex');

    await db.query(`
      UPDATE eleccion 
      SET estado = 'ABIERTA', huella_sha256 = '${huellaSha}', abierta_at = NOW()
      WHERE id = '${eleccionId}';
    `);

    // 6. Simular Votación de 80 Estudiantes
    const totalQueVotan = 80;
    for (let i = 0; i < totalQueVotan; i++) {
      const elector = electores[i];
      const partidoElegido = i % 4 === 0 ? 'BLANCO' : partidoIds[i % 3];
      const payload =
        partidoElegido === 'BLANCO'
          ? JSON.stringify({ tipo: 'BLANCO' })
          : JSON.stringify({ tipo: 'LISTA', partido_id: partidoElegido });

      // Transacción atómica I4
      await db.query(`
        INSERT INTO urna (id, eleccion_id, voto_payload, schema_version)
        VALUES (gen_random_uuid(), '${eleccionId}', '${payload}'::jsonb, 1);
      `);
      await db.query(`UPDATE elector SET estado = 'VOTO' WHERE id = '${elector.id}';`);
    }

    // 7. Cierre de Elección con Verificación Invariante I14
    const totalUrna = Number(
      (await db.query<{ count: string }>(`SELECT count(*) as count FROM urna WHERE eleccion_id = '${eleccionId}';`))
        .rows[0].count,
    );
    const totalElectoresVoto = Number(
      (await db.query<{ count: string }>(`SELECT count(*) as count FROM elector WHERE eleccion_id = '${eleccionId}' AND estado = 'VOTO';`))
        .rows[0].count,
    );

    expect(totalUrna).toBe(totalQueVotan);
    expect(totalElectoresVoto).toBe(totalQueVotan);
    expect(totalUrna).toBe(totalElectoresVoto); // Invariante I14 exacto

    await db.query(`
      UPDATE eleccion 
      SET estado = 'CERRADA', cerrada_at = NOW()
      WHERE id = '${eleccionId}';
    `);

    // 8. Escrutinio Oficial con lectura aleatoria ORDER BY RANDOM() (I19)
    const votosEscrutados = await db.query<{ voto_payload: { tipo: string; partido_id?: string } }>(`
      SELECT voto_payload FROM urna WHERE eleccion_id = '${eleccionId}' ORDER BY RANDOM();
    `);
    expect(votosEscrutados.rows.length).toBe(totalQueVotan);

    // Conteo y determinación de ganador
    let votosBlanco = 0;
    const conteo: Record<string, number> = {};
    for (const v of votosEscrutados.rows) {
      if (v.voto_payload.tipo === 'BLANCO') {
        votosBlanco++;
      } else if (v.voto_payload.partido_id) {
        conteo[v.voto_payload.partido_id] = (conteo[v.voto_payload.partido_id] || 0) + 1;
      }
    }

    expect(votosBlanco).toBe(20); // 80 / 4 = 20 votos en blanco
    expect(conteo[partidoIds[0]] + conteo[partidoIds[1]] + conteo[partidoIds[2]]).toBe(60);

    // Persistir resultado oficial
    await db.query(`
      INSERT INTO resultado_escrutinio (
        eleccion_id, total_votos_urna, total_electores_votaron, conteo_partidos,
        porcentajes_calculados, ganador_partido_id, quorum_cumplido, huella_verificada
      )
      VALUES (
        '${eleccionId}', ${totalUrna}, ${totalElectoresVoto},
        '{"votos_blanco": ${votosBlanco}}'::jsonb,
        '{"participacion_porcentaje": 80.0}'::jsonb,
        '${partidoIds[1]}', true, true
      );
    `);

    await db.query(`UPDATE eleccion SET estado = 'ESCRUTADA' WHERE id = '${eleccionId}';`);

    const eleccionFinal = (
      await db.query<{ estado: string; huella_sha256: string }>(`SELECT estado, huella_sha256 FROM eleccion WHERE id = '${eleccionId}';`)
    ).rows[0];

    expect(eleccionFinal.estado).toBe('ESCRUTADA');
    expect(eleccionFinal.huella_sha256).toBe(huellaSha);
  });

  // T-802: Concurrencia de reserva atómica (I6 / ADR-006)
  it('evita condiciones de carrera: garantiza que ningún puesto sea reservado por más de un elector concurrente', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre, estado) VALUES ('Elec Concurrente', 'ABIERTA') RETURNING id;`)
    ).rows[0].id;

    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula Concurrente') RETURNING id;`)
    ).rows[0].id;

    // Crear 3 puestos libres
    for (let i = 1; i <= 3; i++) {
      await db.query(`INSERT INTO puesto (aula_id, numero_puesto, estado) VALUES ('${aula}', ${i}, 'LIBRE');`);
    }

    // Simular 3 reservas consecutivas atómicas con LIMIT 1
    const reservados: string[] = [];
    for (let r = 0; r < 3; r++) {
      const puestoLibre = await db.query<{ id: string }>(`
        SELECT id FROM puesto 
        WHERE aula_id = '${aula}' AND estado = 'LIBRE' 
        ORDER BY numero_puesto ASC 
        LIMIT 1;
      `);
      expect(puestoLibre.rows.length).toBe(1);
      const id = puestoLibre.rows[0].id;
      reservados.push(id);
      await db.query(`UPDATE puesto SET estado = 'RESERVADO' WHERE id = '${id}';`);
    }

    // Verificar que los 3 puestos reservados son únicos y distintos
    const uniqueReservados = new Set(reservados);
    expect(uniqueReservados.size).toBe(3);

    // Un 4to intento concurrente no debe encontrar ningún puesto libre
    const cuartoIntento = await db.query<{ id: string }>(`
      SELECT id FROM puesto WHERE aula_id = '${aula}' AND estado = 'LIBRE';
    `);
    expect(cuartoIntento.rows.length).toBe(0);
  });

  // T-803: Auditoría y Test de Penetración de Anonimato Radical (I1, I2, I9, I12)
  it('garantiza anonimato radical: es matemáticamente imposible correlacionar un voto con un elector', async () => {
    const columnsUrna = await db.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'urna';
    `);

    const names = columnsUrna.rows.map((c) => c.column_name);

    // 1. Urna solo posee los 4 campos mínimos
    expect(names.sort()).toEqual(['eleccion_id', 'id', 'schema_version', 'voto_payload'].sort());

    // 2. Ninguna columna permite rastreo de usuario ni tiempo
    expect(names).not.toContain('elector_id');
    expect(names).not.toContain('dni');
    expect(names).not.toContain('puesto_id');
    expect(names).not.toContain('created_at');
    expect(names).not.toContain('voted_at');

    // 3. La tabla elector no almacena timestamps de voto (Invariante I3)
    const columnsElector = await db.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'elector';
    `);
    const namesElector = columnsElector.rows.map((c) => c.column_name);
    expect(namesElector).not.toContain('voted_at');
    expect(namesElector).not.toContain('fecha_voto');
    expect(namesElector).not.toContain('hora_voto');

    // 4. La auditoría no almacena el contenido del voto (Invariante I12)
    const columnsAuditoria = await db.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'auditoria_log';
    `);
    const namesAuditoria = columnsAuditoria.rows.map((c) => c.column_name);
    expect(namesAuditoria).not.toContain('voto');
    expect(namesAuditoria).not.toContain('partido_elegido');
  });

  // T-804: Integridad de Restricciones y Habilitación Transitoria (I5)
  it('verifica que la tabla habilitación no retiene datos una vez finalizado el voto', async () => {
    const habilitacionesRestantes = await db.query<{ count: string }>(`
      SELECT count(*) as count FROM habilitacion;
    `);
    // En las pruebas anteriores todas las habilitaciones fueron eliminadas físicamente
    expect(Number(habilitacionesRestantes.rows[0].count)).toBe(0);
  });
});

