import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Invariants & Schema Security (PG 16)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    
    // Leer y ejecutar la migración inicial de esquema
    const migrationSqlPath = path.resolve(__dirname, '../../prisma/migrations/01_initial_schema.sql');
    const migrationSql = fs.readFileSync(migrationSqlPath, 'utf-8');
    
    // Ejecutar migración en PostgreSQL
    await db.exec(migrationSql);
  });

  afterAll(async () => {
    await db.close();
  });

  // ============================================================
  // INVARIANTE I1 & I2: Estructura Minimalista y Aislada de URNA
  // ============================================================
  describe('Invariante I1 & I2: Estructura de la Tabla Urna', () => {
    it('la tabla urna debe contener ÚNICAMENTE las 4 columnas permitidas', async () => {
      const res = await db.query<{ column_name: string; data_type: string }>(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'urna'
        ORDER BY ordinal_position;
      `);

      const columnNames = res.rows.map((r) => r.column_name);
      
      // Columnas estrictamente permitidas
      expect(columnNames).toHaveLength(4);
      expect(columnNames).toEqual(['id', 'eleccion_id', 'voto_payload', 'schema_version']);
    });

    it('la tabla urna NO debe contener marcas temporales (created_at, timestamp)', async () => {
      const res = await db.query<{ column_name: string }>(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'urna' 
          AND column_name IN ('created_at', 'timestamp', 'fecha', 'hora', 'updated_at');
      `);

      expect(res.rows).toHaveLength(0);
    });

    it('la tabla urna NO debe contener claves foráneas hacia elector, puesto, aula o docente', async () => {
      const res = await db.query<{ column_name: string }>(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'urna' 
          AND column_name IN ('elector_id', 'puesto_id', 'aula_id', 'docente_id', 'padron_id');
      `);

      expect(res.rows).toHaveLength(0);
    });

    it('la clave primaria de urna debe ser UUID (gen_random_uuid v4) y NO secuencial/serial', async () => {
      const res = await db.query<{ column_name: string; data_type: string; column_default: string }>(`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'urna' AND column_name = 'id';
      `);

      expect(res.rows[0].data_type).toBe('uuid');
      expect(res.rows[0].column_default).toContain('gen_random_uuid');
    });
  });

  // ============================================================
  // INVARIANTE I3: Ausencia de Timestamps en ELECTOR
  // ============================================================
  describe('Invariante I3: Inexistencia de Marcas Temporales de Voto en Elector', () => {
    it('la tabla elector no debe almacenar la fecha u hora en que votó', async () => {
      const res = await db.query<{ column_name: string }>(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'elector' 
          AND column_name IN ('voto_at', 'voto_timestamp', 'updated_at', 'hora_voto');
      `);

      expect(res.rows).toHaveLength(0);
    });
  });

  // ============================================================
  // INVARIANTE I6: Unicidad y Restricciones a Nivel de Base de Datos
  // ============================================================
  describe('Invariante I6: Restricciones de Integridad en Motor de BD', () => {
    it('debe impedir dos electores con el mismo DNI en una misma elección', async () => {
      // 1. Crear elección
      const eleccionRes = await db.query<{ id: string }>(`
        INSERT INTO eleccion (nombre) VALUES ('Elección Test') RETURNING id;
      `);
      const eleccionId = eleccionRes.rows[0].id;

      // 2. Crear aula
      const aulaRes = await db.query<{ id: string }>(`
        INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccionId}', 1, 'Aula 1') RETURNING id;
      `);
      const aulaId = aulaRes.rows[0].id;

      // 3. Insertar primer elector
      await db.query(`
        INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion)
        VALUES ('${eleccionId}', '${aulaId}', '12345678', 'Pedro', 'Castillo', '5to A');
      `);

      // 4. Intentar duplicar DNI en la misma elección -> Debe fallar por UNIQUE constraint
      await expect(
        db.query(`
          INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion)
          VALUES ('${eleccionId}', '${aulaId}', '12345678', 'Juan', 'Perez', '5to B');
        `)
      ).rejects.toThrow();
    });

    it('debe impedir más de una habilitación activa por elector (UNIQUE elector_id)', async () => {
      const eleccion = (await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec 2') RETURNING id;`)).rows[0].id;
      const aula = (await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula A') RETURNING id;`)).rows[0].id;
      const elector = (await db.query<{ id: string }>(`INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion) VALUES ('${eleccion}', '${aula}', '88888888', 'Ana', 'Gomez', '1A') RETURNING id;`)).rows[0].id;
      const puesto1 = (await db.query<{ id: string }>(`INSERT INTO puesto (aula_id, numero_puesto) VALUES ('${aula}', 1) RETURNING id;`)).rows[0].id;
      const puesto2 = (await db.query<{ id: string }>(`INSERT INTO puesto (aula_id, numero_puesto) VALUES ('${aula}', 2) RETURNING id;`)).rows[0].id;

      // Primera habilitación
      await db.query(`
        INSERT INTO habilitacion (eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
        VALUES ('${eleccion}', '${elector}', '${puesto1}', 'token_hash_1', NOW() + INTERVAL '3 minutes');
      `);

      // Segunda habilitación para el mismo elector en otro puesto -> Debe ser rechazada por BD
      await expect(
        db.query(`
          INSERT INTO habilitacion (eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
          VALUES ('${eleccion}', '${elector}', '${puesto2}', 'token_hash_2', NOW() + INTERVAL '3 minutes');
        `)
      ).rejects.toThrow();
    });

    it('debe impedir más de una habilitación activa por puesto (UNIQUE puesto_id)', async () => {
      const eleccion = (await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec 3') RETURNING id;`)).rows[0].id;
      const aula = (await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula B') RETURNING id;`)).rows[0].id;
      const elector1 = (await db.query<{ id: string }>(`INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion) VALUES ('${eleccion}', '${aula}', '11111111', 'Luis', 'Soto', '2B') RETURNING id;`)).rows[0].id;
      const elector2 = (await db.query<{ id: string }>(`INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion) VALUES ('${eleccion}', '${aula}', '22222222', 'Maria', 'Vega', '2B') RETURNING id;`)).rows[0].id;
      const puesto = (await db.query<{ id: string }>(`INSERT INTO puesto (aula_id, numero_puesto) VALUES ('${aula}', 1) RETURNING id;`)).rows[0].id;

      // Habilitar elector1 en el puesto
      await db.query(`
        INSERT INTO habilitacion (eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
        VALUES ('${eleccion}', '${elector1}', '${puesto}', 'token_hash_puesto_1', NOW() + INTERVAL '3 minutes');
      `);

      // Intentar habilitar elector2 en el mismo puesto -> Debe fallar
      await expect(
        db.query(`
          INSERT INTO habilitacion (eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
          VALUES ('${eleccion}', '${elector2}', '${puesto}', 'token_hash_puesto_2', NOW() + INTERVAL '3 minutes');
        `)
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // INVARIANTE I4: Transacción Atómica de Emisión de Voto
  // ============================================================
  describe('Invariante I4: Transacción Atómica e Indivisible de Votación', () => {
    it('al votar, debe insertar en urna, marcar elector VOTO y borrar habilitación en 1 sola transacción', async () => {
      const eleccion = (await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec I4') RETURNING id;`)).rows[0].id;
      const aula = (await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula I4') RETURNING id;`)).rows[0].id;
      const elector = (await db.query<{ id: string }>(`INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion) VALUES ('${eleccion}', '${aula}', '99999999', 'Sara', 'Luz', '3C') RETURNING id;`)).rows[0].id;
      const puesto = (await db.query<{ id: string }>(`INSERT INTO puesto (aula_id, numero_puesto, estado) VALUES ('${aula}', 1, 'RESERVADO') RETURNING id;`)).rows[0].id;

      await db.query(`
        INSERT INTO habilitacion (eleccion_id, elector_id, puesto_id, token_voto_hash, expires_at)
        VALUES ('${eleccion}', '${elector}', '${puesto}', 'token_secreto_i4', NOW() + INTERVAL '3 minutes');
      `);

      // Ejecutar Transacción Atómica I4
      await db.transaction(async (tx) => {
        // 1. Insertar voto anónimo en urna
        await tx.query(`
          INSERT INTO urna (eleccion_id, voto_payload, schema_version)
          VALUES ('${eleccion}', '{"seleccion": "BLANCO"}'::jsonb, 'v1');
        `);
        // 2. Marcar elector como VOTO
        await tx.query(`
          UPDATE elector SET estado = 'VOTO' WHERE id = '${elector}';
        `);
        // 3. Liberar puesto
        await tx.query(`
          UPDATE puesto SET estado = 'LIBRE' WHERE id = '${puesto}';
        `);
        // 4. Borrar habilitación (Invariante I5)
        await tx.query(`
          DELETE FROM habilitacion WHERE elector_id = '${elector}';
        `);
      });

      // Verificaciones post-transacción
      const urnaCheck = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM urna WHERE eleccion_id = '${eleccion}';`);
      expect(Number(urnaCheck.rows[0].count)).toBe(1);

      const electorCheck = await db.query<{ estado: string }>(`SELECT estado FROM elector WHERE id = '${elector}';`);
      expect(electorCheck.rows[0].estado).toBe('VOTO');

      const habilitacionCheck = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM habilitacion WHERE elector_id = '${elector}';`);
      expect(Number(habilitacionCheck.rows[0].count)).toBe(0);

      const puestoCheck = await db.query<{ estado: string }>(`SELECT estado FROM puesto WHERE id = '${puesto}';`);
      expect(puestoCheck.rows[0].estado).toBe('LIBRE');
    });
  });

  // ============================================================
  // TEST DE ANONIMATO ESTRUCTURAL (Invariante I1)
  // ============================================================
  describe('Test de Anonimato Estructural (Invariante I1)', () => {
    it('ninguna clave foránea ni relación une a urna con elector en el catálogo de PostgreSQL', async () => {
      const fkRes = await db.query<{ constraint_name: string; table_name: string; foreign_table_name: string }>(`
        SELECT
            tc.constraint_name, 
            tc.table_name, 
            ccu.table_name AS foreign_table_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'urna';
      `);

      // Urna solo puede apuntar a 'eleccion'
      expect(fkRes.rows).toHaveLength(1);
      expect(fkRes.rows[0].foreign_table_name).toBe('eleccion');
      expect(fkRes.rows.some((r) => r.foreign_table_name === 'elector')).toBe(false);
      expect(fkRes.rows.some((r) => r.foreign_table_name === 'puesto')).toBe(false);
    });
  });

  // ============================================================
  // INVARIANTE I14: Balance Cuantitativo de Cierre
  // ============================================================
  describe('Invariante I14: Balance Cuantitativo (Urna == Votaron)', () => {
    it('el total de votos en urna debe coincidir matemáticamente con el total de electores con estado VOTO', async () => {
      const eleccion = (await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec I14 Balance') RETURNING id;`)).rows[0].id;
      const aula = (await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula Balance') RETURNING id;`)).rows[0].id;

      // Insertar 3 electores que votaron y 2 pendientes
      await db.query(`
        INSERT INTO elector (eleccion_id, aula_id, dni, nombres, apellidos, grado_seccion, estado)
        VALUES 
          ('${eleccion}', '${aula}', 'DNI1', 'Alum 1', 'Ap 1', '1A', 'VOTO'),
          ('${eleccion}', '${aula}', 'DNI2', 'Alum 2', 'Ap 2', '1A', 'VOTO'),
          ('${eleccion}', '${aula}', 'DNI3', 'Alum 3', 'Ap 3', '1A', 'VOTO'),
          ('${eleccion}', '${aula}', 'DNI4', 'Alum 4', 'Ap 4', '1A', 'PENDIENTE'),
          ('${eleccion}', '${aula}', 'DNI5', 'Alum 5', 'Ap 5', '1A', 'PENDIENTE');
      `);

      // Insertar 3 votos en la urna
      await db.query(`
        INSERT INTO urna (eleccion_id, voto_payload, schema_version)
        VALUES 
          ('${eleccion}', '{"seleccion":"BLANCO"}', 'v1'),
          ('${eleccion}', '{"seleccion":"LISTA_1"}', 'v1'),
          ('${eleccion}', '{"seleccion":"LISTA_2"}', 'v1');
      `);

      // Verificación de balance Invariante I14
      const urnaCount = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM urna WHERE eleccion_id = '${eleccion}';`);
      const votaronCount = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM elector WHERE eleccion_id = '${eleccion}' AND estado = 'VOTO';`);
      const habilitacionesActivas = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM habilitacion WHERE eleccion_id = '${eleccion}';`);

      const totalUrna = Number(urnaCount.rows[0].count);
      const totalVotaron = Number(votaronCount.rows[0].count);
      const totalHabilitados = Number(habilitacionesActivas.rows[0].count);

      expect(totalUrna).toBe(3);
      expect(totalVotaron).toBe(3);
      expect(totalUrna === totalVotaron).toBe(true);
      expect(totalHabilitados).toBe(0);
    });
  });
});

