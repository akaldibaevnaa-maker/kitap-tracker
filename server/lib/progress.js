// Оқу прогресі: жазбалардан қайта есептеу және соған байланысты ұпайлар.
import { award, revoke, totalXp } from './xp.js';
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

/**
 * Оқушының «Кітап ағашы» сатысын (1-7) есептейді:
 * 1. Тұқым, 2. Өскін, 3. Жас өркен, 4. Жас ағаш, 5. Жапырақты ағаш, 6. Гүлдеген ағаш, 7. Жемісті ағаш
 */
export function computeStudentTreeStage(db, userId) {
  const xp = totalXp(db, userId);
  const finishedBooksCount = db.get("SELECT COUNT(*) AS c FROM shelf WHERE user_id = ? AND status = 'finished'", userId)?.c || 0;
  const logsCount = db.get("SELECT COUNT(*) AS c FROM reading_logs WHERE user_id = ?", userId)?.c || 0;

  const logsMaxPerBook = db.all(`
    SELECT book_id, MAX(page) as max_page FROM reading_logs WHERE user_id = ? GROUP BY book_id
  `, userId);
  const finishedBooksPages = db.all(`
    SELECT sh.book_id, COALESCE(sh.total_pages, b.total_pages, 100) as pages
    FROM shelf sh JOIN books b ON b.id = sh.book_id
    WHERE sh.user_id = ? AND sh.status = 'finished'
  `, userId);

  const pagesMap = new Map();
  for (const row of logsMaxPerBook) pagesMap.set(row.book_id, row.max_page || 0);
  for (const row of finishedBooksPages) {
    const prev = pagesMap.get(row.book_id) || 0;
    pagesMap.set(row.book_id, Math.max(prev, row.pages || 0));
  }
  let totalPages = 0;
  for (const p of pagesMap.values()) totalPages += p;

  const stages = db.all('SELECT * FROM tree_stages_config ORDER BY stage ASC');
  let currentStageIndex = 0;
  if (stages.length) {
    for (let i = stages.length - 1; i >= 0; i--) {
      const st = stages[i];
      if (
        (st.min_books && finishedBooksCount >= st.min_books) ||
        (st.min_pages && totalPages >= st.min_pages) ||
        (st.min_xp && xp >= st.min_xp) ||
        (i === 1 && (logsCount >= 1 || totalPages >= 10 || xp >= 20)) ||
        (i === 0)
      ) {
        currentStageIndex = i;
        break;
      }
    }
  }

  const currentStage = stages[currentStageIndex] || { stage: 1, name: 'Тұқым', title: 'Тұқым', icon: '🌱' };
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

  let progressPercent = 100;
  let remaining = { books: 0, pages: 0, xp: 0 };
  if (nextStage) {
    const prevXP = currentStage.min_xp || 0;
    const nextXP = nextStage.min_xp || 100;
    const xpSpan = Math.max(1, nextXP - prevXP);
    const xpGained = Math.max(0, xp - prevXP);
    progressPercent = Math.min(99, Math.max(5, Math.round((xpGained / xpSpan) * 100)));
    remaining.books = Math.max(0, (nextStage.min_books || 0) - finishedBooksCount);
    remaining.pages = Math.max(0, (nextStage.min_pages || 0) - totalPages);
    remaining.xp = Math.max(0, nextXP - xp);
  }

  return {
    stage: currentStage.stage,
    name: currentStage.name,
    title: currentStage.title,
    icon: currentStage.icon,
    progress_percent: progressPercent,
    finished_books: finishedBooksCount,
    total_pages: totalPages,
    reading_logs_count: logsCount,
    xp,
    remaining,
    next_stage: nextStage ? { stage: nextStage.stage, name: nextStage.name, min_xp: nextStage.min_xp } : null,
  };
}
