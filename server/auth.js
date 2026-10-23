// Аутентификация: scrypt хэштер, HttpOnly cookie сессиялары.
import crypto from 'node:crypto';
import { nowIso } from './lib/util.js';

const COOKIE = 'kt_sid';
const TTL_DAYS = 30;

export function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(secret), salt, 32);
  return `s1$${salt.toString('hex')}$${h.toString('hex')}`;
}

export function verifySecret(secret, stored) {
  const [v, saltHex, hHex] = String(stored || '').split('$');
  if (v !== 's1' || !saltHex || !hHex) return false;
  const h = crypto.scryptSync(String(secret), Buffer.from(saltHex, 'hex'), 32);
  const ref = Buffer.from(hHex, 'hex');
  return ref.length === h.length && crypto.timingSafeEqual(h, ref);
}

const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function startSession(db, res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const exp = new Date(Date.now() + TTL_DAYS * 864e5);
  db.run('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?,?,?)', sha(token), userId, nowIso(exp));
  const secure = process.env.KT_SECURE_COOKIE === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TTL_DAYS * 86400}${secure}`);
}

export function endSession(db, req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) db.run('DELETE FROM sessions WHERE token_hash = ?', sha(token));
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

export function sessionUser(db, req) {
  const token = parseCookies(req)[COOKIE];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = db.get(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
    sha(token), nowIso(),
  );
  return row || null;
}
