// Ұпай (XP) кітабы. Әр марапат (user, kind, ref) бойынша бірегей —
// сондықтан бір әрекет үшін ұпай қайта берілмейді.
import { nowIso, parseJson } from './util.js';

export const DEFAULT_RULES = { daily_log: 10, game: 10, reflection: 20, book_finished: 50 };

export function classOf(db, userId) {
  return db.get(
    'SELECT c.* FROM classes c JOIN class_members m ON m.class_id = c.id WHERE m.user_id = ?',
    userId,
  );
}

export function parseRules(json) {
  const r = parseJson(json, {}) || {};
  const out = { ...DEFAULT_RULES };
  for (const k of Object.keys(DEFAULT_RULES)) {
    const v = Number(r[k]);
    if (r[k] != null && Number.isInteger(v) && v >= 0 && v <= 500) out[k] = v;
  }
  return out;
}

export function rulesFor(db, userId) {
  return parseRules(classOf(db, userId)?.xp_rules);
}

/** Ұпай береді. Бұрын берілген болса — 0 қайтарады. */
export function award(db, userId, kind, ref, customAmount = null) {
  const amount = customAmount != null ? customAmount : rulesFor(db, userId)[kind];
  if (amount == null) throw new Error('unknown xp kind ' + kind);
  const r = db.run(
    'INSERT OR IGNORE INTO xp_events(user_id, kind, ref, amount, created_at) VALUES (?,?,?,?,?)',
    userId, kind, String(ref), amount, nowIso(),
  );
  return r.changes ? amount : 0;
}

/** Негізі жойылған әрекеттің ұпайын алып тастайды (мысалы, жазба өшірілгенде). */
export function revoke(db, userId, kind, ref) {
  return db.run('DELETE FROM xp_events WHERE user_id = ? AND kind = ? AND ref = ?', userId, kind, String(ref)).changes;
}

export function totalXp(db, userId) {
  return db.get('SELECT COALESCE(SUM(amount), 0) AS s FROM xp_events WHERE user_id = ?', userId).s;
}
