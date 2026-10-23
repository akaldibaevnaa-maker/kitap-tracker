// KitapTracker HTTP қосымшасы (тесттер үшін бөлек жасалады).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { seedIfEmpty, ensureCatalog } from './seed.js';
import { Router } from './router.js';
import { sessionUser } from './auth.js';
import { HttpError } from './lib/util.js';
import registerAuth from './routes/auth.js';
import registerStudent from './routes/student.js';
import registerBooks from './routes/books.js';
import registerGames from './routes/games.js';
import registerTeacher from './routes/teacher.js';
import registerAdmin from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '..', 'public');
export const DEFAULT_DB = path.resolve(__dirname, '..', 'data', 'kitaptracker.db');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'too_large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'bad_json'));
      }
    });
    req.on('error', reject);
  });
}

export function createApp({ dbPath = DEFAULT_DB, authRateLimit = 40 } = {}) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = openDb(dbPath);
  seedIfEmpty(db);
  ensureCatalog(db);

  const router = new Router();
  for (const reg of [registerAuth, registerStudent, registerBooks, registerGames, registerTeacher, registerAdmin]) reg(router, db);

  const hits = new Map(); // Кіру әрекеттерінің жиілігін шектеу
  const limited = (ip) => {
    const now = Date.now();
    const h = hits.get(ip) || { n: 0, reset: now + 60_000 };
    if (now > h.reset) { h.n = 0; h.reset = now + 60_000; }
    h.n++;
    hits.set(ip, h);
    return h.n > authRateLimit;
  };

  async function handleApi(req, res, url) {
    const m = router.match(req.method, url.pathname);
    if (!m) return sendJson(res, 404, { error: 'not_found' });
    if (m.methodNotAllowed) return sendJson(res, 405, { error: 'method_not_allowed' });
    // CSRF қорғанысы: өзгертетін сұраныстарда арнайы тақырып міндетті
    if (req.method !== 'GET' && req.headers['x-kt'] !== '1') return sendJson(res, 403, { error: 'csrf' });
    const ip = req.socket.remoteAddress || '';
    if (req.method === 'POST' && url.pathname.startsWith('/api/auth/') && limited(ip)) return sendJson(res, 429, { error: 'rate_limited' });

    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
    const user = sessionUser(db, req);
    const auth = m.route.auth;
    if (auth) {
      if (!user) return sendJson(res, 401, { error: 'unauthorized' });
      if (auth !== 'any' && !auth.includes(user.role)) return sendJson(res, 403, { error: 'forbidden' });
    }
    const ctx = { db, req, res, url, params: m.params, query: Object.fromEntries(url.searchParams), body: body || {}, user };
    const out = await m.route.handler(ctx);
    if (!res.writableEnded) sendJson(res, 200, out ?? { ok: true });
  }

  function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'method_not_allowed' });
    let rel;
    try {
      rel = decodeURIComponent(url.pathname);
    } catch {
      return sendJson(res, 400, { error: 'bad_request' });
    }
    let file = path.resolve(PUBLIC, '.' + rel);
    if (!file.startsWith(PUBLIC)) return sendJson(res, 403, { error: 'forbidden' });
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC, 'index.html');
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
    );
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
      else serveStatic(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) return sendJson(res, e.status, { error: e.code, ...e.extra });
      console.error(e);
      if (!res.headersSent) sendJson(res, 500, { error: 'server_error' });
    }
  });

  return { server, db };
}
