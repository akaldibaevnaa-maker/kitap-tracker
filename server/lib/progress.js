// Оқу прогресі: жазбалардан қайта есептеу және соған байланысты ұпайлар.
import { award, revoke } from './xp.js';
import { nowIso, parseJson } from './util.js';

export function getShelf(db, userId, bookId) {
  return db.get('SELECT * FROM shelf WHERE user_id = ? AND book_id = ?', userId, bookId);
}

export function maxLoggedPage(db, userId, bookId) {
  return db.get('SELECT MAX(page) AS p FROM reading_logs WHERE user_id = ? AND book_id = ?', userId, bookId).p ?? 0;
}

/**
 * Сөредегі кітаптың прогресін жазбалардан толық қайта есептейді.
 * Прогресс = оқушы белгілеген ең үлкен бет. Кітап аяқталса — бір рет +XP;
 * түзету кезінде аяқталмаған болып шықса, бұл ұпай алынады (артық ұпай жиналмайды).
 */
export function recompute(db, userId, bookId) {
  const sh = getShelf(db, userId, bookId);
  if (!sh) return { shelf: null, bookFinishedXp: 0 };
  const page = maxLoggedPage(db, userId, bookId);
  let status = sh.status;
  let finishedAt = sh.finished_at;
  let startedAt = sh.started_at;
  let bookFinishedXp = 0;
  const total = sh.total_pages;
  if (total && page >= total) {
    if (status !== 'finished') {
      status = 'finished';
      finishedAt = nowIso();
    }
    bookFinishedXp = award(db, userId, 'book_finished', bookId);
  } else {
    if (status === 'finished') {
      status = 'reading';
      finishedAt = null;
    }
    if (page > 0 && status === 'want') status = 'reading';
    revoke(db, userId, 'book_finished', bookId);
  }
  if (status !== 'want' && !startedAt) startedAt = nowIso();
  db.run(
    'UPDATE shelf SET current_page = ?, status = ?, finished_at = ?, started_at = ?, updated_at = ? WHERE user_id = ? AND book_id = ?',
    page, status, finishedAt, startedAt, nowIso(), userId, bookId,
  );
  return { shelf: getShelf(db, userId, bookId), bookFinishedXp };
}

/** Күндегі алғашқы оқу жазбасы үшін ұпай: сол күні жазба болса — бар, болмаса — алынады. */
export function syncDailyXp(db, userId, date) {
  const has = db.get('SELECT 1 AS x FROM reading_logs WHERE user_id = ? AND log_date = ? LIMIT 1', userId, date);
  if (has) return award(db, userId, 'daily_log', date);
  revoke(db, userId, 'daily_log', date);
  return 0;
}

export function stagePagesFor(db, shelf, book) {
  const ok = (a) => Array.isArray(a) && a.length === 3 ? a.map((x) => (Number.isInteger(x) && x > 0 ? x : null)) : null;
  return ok(parseJson(shelf?.stage_pages, null)) || ok(parseJson(book?.stage_pages, null)) || [null, null, null];
}

export function shelfView(sh) {
  if (!sh) return null;
  const pct = sh.total_pages ? Math.min(100, Math.round((sh.current_page / sh.total_pages) * 100)) : 0;
  return {
    status: sh.status,
    total_pages: sh.total_pages,
    current_page: sh.current_page,
    percent: pct,
    goal_text: sh.goal_text,
    stage_pages: parseJson(sh.stage_pages, null),
    assigned: !!sh.assigned_by,
    started_at: sh.started_at,
    finished_at: sh.finished_at,
  };
}
