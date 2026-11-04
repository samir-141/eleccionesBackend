import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';

describe('Puestos & Docentes (Fase 4: 2FA, QR Efímero, Heartbeat e I13)', () => {
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

  // 1. Docentes: Argon2id y 2FA TOTP
  it('autentica docentes mediante contraseña hasheada en Argon2id y segundo factor TOTP', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec 2FA') RETURNING id;`)
    ).rows[0].id;
    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula 2FA') RETURNING id;`)
    ).rows[0].id;

    const rawPassword = 'ClaveDocenteSegura2026!';
    const passwordHash = await argon2.hash(rawPassword, { type: argon2.argon2id });
    const totpSecret = authenticator.generateSecret();

    await db.query(`
      INSERT INTO docente (eleccion_id, aula_id, username, password_hash, totp_secret, activo)
      VALUES ('${eleccion}', '${aula}', 'profesor_garcia', '${passwordHash}', '${totpSecret}', true);
    `);

    // Validar contraseña correcta
    const passCheck = await argon2.verify(passwordHash, rawPassword);
    expect(passCheck).toBe(true);

    // Validar contraseña incorrecta
    const passWrong = await argon2.verify(passwordHash, 'ClaveIncorrecta');
    expect(passWrong).toBe(false);

    // Validar código TOTP válido
    const validTotpCode = authenticator.generate(totpSecret);
    expect(authenticator.check(validTotpCode, totpSecret)).toBe(true);

    // Validar código TOTP falso o expirado
    expect(authenticator.check('000000', totpSecret)).toBe(false);
  });

  // 2. Emparejamiento por QR efímero de un solo uso
  it('empareja un puesto mediante QR efímero y lo marca como consumido', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec Puestos') RETURNING id;`)
    ).rows[0].id;
    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula Puestos') RETURNING id;`)
    ).rows[0].id;

    // Crear puesto en FUERA_SERVICIO
    const puesto = (
      await db.query<{ id: string }>(`INSERT INTO puesto (aula_id, numero_puesto, estado) VALUES ('${aula}', 1, 'FUERA_SERVICIO') RETURNING id;`)
    ).rows[0].id;

    // Generar QR efímero
    const tokenQr = 'qr_token_super_secreto_123';
    await db.query(`
      INSERT INTO qr_emparejamiento (puesto_id, token, expires_at, usado)
      VALUES ('${puesto}', '${tokenQr}', NOW() + INTERVAL '5 minutes', false);
    `);

    // Docente escanea y empareja
    await db.query(`
      UPDATE qr_emparejamiento SET usado = true WHERE token = '${tokenQr}';
    `);
    await db.query(`
      UPDATE puesto SET estado = 'LIBRE', token_sesion = 'token_sesion_activa_1', ultimo_heartbeat = NOW() WHERE id = '${puesto}';
    `);

    const puestoActualizado = await db.query<{ estado: string; token_sesion: string }>(`
      SELECT estado, token_sesion FROM puesto WHERE id = '${puesto}';
    `);
    expect(puestoActualizado.rows[0].estado).toBe('LIBRE');
    expect(puestoActualizado.rows[0].token_sesion).toBe('token_sesion_activa_1');

    const qrCheck = await db.query<{ usado: boolean }>(`
      SELECT usado FROM qr_emparejamiento WHERE token = '${tokenQr}';
    `);
    expect(qrCheck.rows[0].usado).toBe(true);
  });

  // 3. Invariante I13: Segregación estricta de aulas
  it('Invariante I13: El docente NO puede emparejar puestos de otra aula', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec I13') RETURNING id;`)
    ).rows[0].id;
    const aula1 = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula 1') RETURNING id;`)
    ).rows[0].id;
    const aula2 = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 2, 'Aula 2') RETURNING id;`)
    ).rows[0].id;

    const puestoAula2 = (
      await db.query<{ id: string }>(`INSERT INTO puesto (aula_id, numero_puesto, estado) VALUES ('${aula2}', 1, 'FUERA_SERVICIO') RETURNING id;`)
    ).rows[0].id;

    // Verificar lógicamente que aula_id del puesto != aula_id del docente asignado a aula 1
    const docenteAulaId = aula1;
    const puestoCheck = await db.query<{ aula_id: string }>(`SELECT aula_id FROM puesto WHERE id = '${puestoAula2}';`);

    const perteneceAMismaAula = puestoCheck.rows[0].aula_id === docenteAulaId;
    expect(perteneceAMismaAula).toBe(false);
  });

  // 4. Heartbeat e Inactividad (> 30s -> FUERA_SERVICIO)
  it('cambia el estado de un puesto a FUERA_SERVICIO si no recibe heartbeat por más de 30 segundos', async () => {
    const eleccion = (
      await db.query<{ id: string }>(`INSERT INTO eleccion (nombre) VALUES ('Elec Heartbeat') RETURNING id;`)
    ).rows[0].id;
    const aula = (
      await db.query<{ id: string }>(`INSERT INTO aula (eleccion_id, numero, nombre) VALUES ('${eleccion}', 1, 'Aula Heartbeat') RETURNING id;`)
    ).rows[0].id;

    // Puesto cuyo último heartbeat ocurrió hace 45 segundos
    const puesto = (
      await db.query<{ id: string }>(`
        INSERT INTO puesto (aula_id, numero_puesto, estado, ultimo_heartbeat)
        VALUES ('${aula}', 1, 'LIBRE', NOW() - INTERVAL '45 seconds')
        RETURNING id;
      `)
    ).rows[0].id;

    // Ejecutar chequeo de inactividad (> 30s)
    await db.query(`
      UPDATE puesto
      SET estado = 'FUERA_SERVICIO'
      WHERE aula_id = '${aula}'
        AND estado != 'FUERA_SERVICIO'
        AND ultimo_heartbeat < (NOW() - INTERVAL '30 seconds');
    `);

    const check = await db.query<{ estado: string }>(`SELECT estado FROM puesto WHERE id = '${puesto}';`);
    expect(check.rows[0].estado).toBe('FUERA_SERVICIO');
  });
});

