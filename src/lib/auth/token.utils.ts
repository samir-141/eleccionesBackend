import * as crypto from 'crypto';
import { env } from '../../config/env.config';

export interface VerifiedActor {
  rol: 'ADMIN' | 'DOCENTE';
  actorId: string;
  username: string;
  docenteId?: string;
  aulaId?: string;
}

const ADMIN_PREFIX = 'admin_sec_';
const DOCENTE_PREFIX = 'jwt_session_docente_';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas por jornada electoral

function signPayload(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySignedString(signedPart: string): Record<string, any> | null {
  const parts = signedPart.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expectedSig = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof parsed.iat === 'number' && Date.now() - parsed.iat > TOKEN_TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function issueAdminToken(username: string): string {
  const signed = signPayload({
    rol: 'ADMIN',
    username,
    iat: Date.now(),
    nonce: crypto.randomBytes(12).toString('hex'),
  });
  return `${ADMIN_PREFIX}${signed}`;
}

export function issueDocenteToken(docente: { id: string; username: string; aula_id: string }): string {
  const signed = signPayload({
    rol: 'DOCENTE',
    docente_id: docente.id,
    username: docente.username,
    aula_id: docente.aula_id,
    iat: Date.now(),
    nonce: crypto.randomBytes(12).toString('hex'),
  });
  return `${DOCENTE_PREFIX}${signed}`;
}

export function verifyBearerToken(authHeader?: string): VerifiedActor | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) return null;

  if (rawToken.startsWith(ADMIN_PREFIX)) {
    const parsed = verifySignedString(rawToken.slice(ADMIN_PREFIX.length));
    if (!parsed || parsed.rol !== 'ADMIN') return null;
    return {
      rol: 'ADMIN',
      actorId: String(parsed.username || 'admin'),
      username: String(parsed.username || 'admin'),
    };
  }

  if (rawToken.startsWith(DOCENTE_PREFIX)) {
    const parsed = verifySignedString(rawToken.slice(DOCENTE_PREFIX.length));
    if (!parsed || parsed.rol !== 'DOCENTE' || !parsed.docente_id) return null;
    return {
      rol: 'DOCENTE',
      actorId: String(parsed.username || parsed.docente_id),
      username: String(parsed.username || 'docente'),
      docenteId: String(parsed.docente_id),
      aulaId: parsed.aula_id ? String(parsed.aula_id) : undefined,
    };
  }

  return null;
}

