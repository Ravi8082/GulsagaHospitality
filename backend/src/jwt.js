// Minimal HS256 JSON Web Tokens shared by administrator, partner and member sign-in.
import crypto from 'node:crypto';
import { config } from './config.js';

const secret = () => process.env.JWT_SECRET || crypto.createHmac('sha256', config.SESSION_SECRET).update('gulsaga-jwt').digest('hex');
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (input) => crypto.createHmac('sha256', secret()).update(input).digest('base64url');

// typ is the account type: admin, partner or member. ttlSeconds defaults to 2 hours.
export function signToken(claims, ttlSeconds = Number(process.env.JWT_TTL_SECONDS || 7200)) {
  const now = Math.floor(Date.now() / 1000);
  const head = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...claims, iss: 'gulsaga', iat: now, exp: now + ttlSeconds })}`;
  return `${head}.${sign(head)}`;
}

export function bearerToken(req) {
  const header = req.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

// Returns the claims for a valid, unexpired token of the expected account type, otherwise null.
export function verifyToken(token, typ) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (header.alg !== 'HS256' || claims.iss !== 'gulsaga') return null;
    if (!Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typ && claims.typ !== typ) return null;
    return claims;
  } catch {
    return null;
  }
}
