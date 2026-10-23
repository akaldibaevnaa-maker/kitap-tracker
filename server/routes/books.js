// Кітап сөресі, кітап беті, мәтін оқу, оқу жазбалары.
import { addDays, fail, localDate, nowIso, parseJson, V, weekStart } from '../lib/util.js';
import { bookOr404, upsertShelf } from '../lib/access.js';
import { getShelf, recompute, shelfView, syncDailyXp } from '../lib/progress.js';
import { computeJourney } from '../lib/journey.js';
import { checkRewards } from '../lib/rewards.js';
import { visibleTasks } from '../lib/tasks.js';

const LANGS = ['kk', 'ru', 'en', 'other'];

export function cardView(b, user) {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    description: b.description,
    language: b.language,
    genre: b.genre,
    interests: b.interests ? b.interests.split(',').filter(Boolean) : [],
    grade_min: b.grade_min,
    grade_max: b.grade_max,
    total_pages: b.total_pages,
    cover_color: b.cover_color,
    cover_emoji: b.cover_emoji,
    is_demo: !!b.is_demo,
    has_text: (b.chapters_n ?? 0) > 0,
    visibility: b.visibility,
    mine: b.owner_id === user.id,
    shelf: b.shelf_status
      ? {
          status: b.shelf_status,
          percent: b.shelf_total ? Math.min(100, Math.round((b.current_page / b.shelf_total) * 100)) : 0,
          assigned: !!b.assigned_by,
        }
      : null,
  };
}

const BOOK_SELECT = `
  SELECT b.*, s.status AS shelf_status, s.current_page, s.total_pages AS shelf_total, s.assigned_by,
         (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id) AS chapters_n
  FROM books b LEFT JOIN shelf s ON s.book_id = b.id AND s.user_id = ?`;

export function visibleBooks(db, user) {
  if (user.role === 'teacher') {
    return db.all(
      `${BOOK_SELECT} WHERE b.visibility = 'public' OR (b.visibility = 'class' AND b.class_id IN (SELECT id FROM classes WHERE teacher_id = ?)) ORDER BY b.is_demo DESC, b.title`,
      user.id, user.id,
    );
  }
  if (user.role === 'admin') return db.all(`${BOOK_SELECT} WHERE b.visibility != 'private' ORDER BY b.title`, user.id);
  return db.all(
    `${BOOK_SELECT} WHERE b.visibility = 'public'
       OR (b.visibility = 'class' AND b.class_id IN (SELECT class_id FROM class_members WHERE user_id = ?))
       OR (b.visibility = 'private' AND b.owner_id = ?)
     ORDER BY (s.assigned_by IS NOT NULL) DESC, b.is_demo DESC, b.title`,
    user.id, user.id, user.id,
  );
}

const low = (s) => String(s || '').toLocaleLowerCase('kk');

/** Оқу жазбасынан кейінгі ортақ жаңарту: ұпай, прогресс, карта, марапат. */
export function afterLogChange(db, user, bookId, dates, before) {
  let xp = 0;
  for (const d of new Set(dates)) xp += syncDailyXp(db, user.id, d);
  const { shelf, bookFinishedXp } = recompute(db, user.id, bookId);
  xp += bookFinishedXp;
  const journey = computeJourney(db, user.id, bookId);
  const rewards = checkRewards(db, user.id);
  const weekDays = db.get('SELECT COUNT(DISTINCT log_date) AS n FROM reading_logs WHERE user_id = ? AND log_date >= ?', user.id, weekStart()).n;
  return {
    shelf: shelfView(shelf),
    journey,
    xp_awarded: xp,
    book_finished: bookFinishedXp > 0,
    new_rewards: rewards,
    stage_up: journey && before && journey.done_count > before.done_count ? journey.done_count : null,
    week_days: weekDays,
  };
}

function validateLog(db, user, bookId, body, ignoreId = null) {
  const sh = getShelf(db, user.id, bookId);
  if (!sh) fail(400, 'not_on_shelf');
  if (!sh.total_pages) fail(400, 'need_total_pages');
  const page = V.int(body.page, 'page', { min: 1, max: 100000 });
  if (page > sh.total_pages) fail(400, 'page_exceeds_total', { total: sh.total_pages });
  const minutes = V.int(body.minutes, 'minutes', { min: 1, max: 600, required: false });
  const note = V.str(body.note, 'note', { max: 1000, required: false });
  const today = localDate();
  const date = V.date(body.date || today, 'date');
  if (date > today || date < addDays(today, -14)) fail(400, 'date_invalid');
  const dup = db.get(
    'SELECT id FROM reading_logs WHERE user_id = ? AND book_id = ? AND log_date = ? AND page = ? AND id != ?',
    user.id, bookId, date, page, ignoreId ?? -1,
  );
  if (dup) fail(409, 'duplicate_log');
  return { page, minutes, note, date };
}

function ownLog(db, user, id) {
  const log = db.get('SELECT * FROM reading_logs WHERE id = ?', Number(id));
  if (!log || log.user_id !== user.id) fail(404, 'not_found');
  return log;
}

export default function register(r, db) {
  r.get('/api/books', ['student', 'teacher', 'admin'], ({ user, query }) => {
    const all = visibleBooks(db, user);
    const genres = [...new Set(all.map((b) => b.genre).filter(Boolean))].sort();
    const interests = [...new Set(all.flatMap((b) => (b.interests || '').split(',')).filter(Boolean))].sort();
    const languages = [...new Set(all.map((b) => b.language))];
    const q = low(query.q || '').trim();
    const grade = query.grade && query.grade !== 'undefined' ? Number(query.grade) : null;
    const lang = query.lang && query.lang !== 'undefined' && query.lang.trim() !== '' ? query.lang.trim() : null;
    const genre = query.genre && query.genre !== 'undefined' && query.genre.trim() !== '' ? query.genre.trim() : null;
    const interest = query.interest && query.interest !== 'undefined' && query.interest.trim() !== '' ? query.interest.trim() : null;
    const books = all.filter((b) => {
      if (q && !low(b.title).includes(q) && !low(b.author).includes(q)) return false;
      if (grade && (b.grade_min > grade || b.grade_max < grade)) return false;
      if (lang && b.language !== lang) return false;
      if (genre && b.genre !== genre) return false;
      if (interest && !(b.interests || '').split(',').includes(interest)) return false;
      return true;
    });
    return { books: books.map((b) => cardView(b, user)), filters: { genres, interests, languages }, total: all.length };
  });

  r.get('/api/shelf', ['student'], ({ user }) => {
    const rows = db.all(`${BOOK_SELECT} WHERE s.user_id IS NOT NULL ORDER BY s.updated_at DESC`, user.id);
    const out = { want: [], reading: [], finished: [] };
    for (const b of rows) out[b.shelf_status].push(cardView(b, user));
    return out;
  });

  r.get('/api/books/:id', ['student', 'teacher', 'admin'], ({ user, params }) => {
    bookOr404(db, user, params.id);
    const b = db.get(`${BOOK_SELECT} WHERE b.id = ?`, user.id, Number(params.id));
    const chapters = db.all('SELECT idx, title, page_start, page_end FROM chapters WHERE book_id = ? ORDER BY idx', b.id);
    const out = { book: { ...cardView(b, user), stage_pages: parseJson(b.stage_pages, null) }, chapters };
    if (user.role === 'student') {
      const sh = getShelf(db, user.id, b.id);
      out.shelf = shelfView(sh);
      out.journey = sh ? computeJourney(db, user.id, b.id) : null;
      out.logs = db.all(
        'SELECT id, page, minutes, note, log_date, created_at, updated_at FROM reading_logs WHERE user_id = ? AND book_id = ? ORDER BY log_date DESC, id DESC',
        user.id, b.id,
      );
      const states = new Map((out.journey?.tasks || []).map((t) => [t.id, t]));
      out.tasks = visibleTasks(db, user.id, b.id).map((t) => ({
        id: t.id, type: t.type, title: t.title, stage_no: t.stage_no, state: states.get(t.id) || null,
      }));
      out.reflection = db.get(
        "SELECT id, text, status, feedback, reviewed_at, updated_at FROM responses WHERE user_id = ? AND book_id = ? AND kind = 'reflection'",
        user.id, b.id,
      ) || null;
    }
    return out;
  });

  r.get('/api/books/:id/chapters/:idx', ['student', 'teacher', 'admin'], ({ user, params }) => {
    const book = bookOr404(db, user, params.id);
    const ch = db.get('SELECT idx, title, body, page_start, page_end FROM chapters WHERE book_id = ? AND idx = ?', book.id, Number(params.idx));
    if (!ch) fail(404, 'not_found');
    const count = db.get('SELECT COUNT(*) AS n FROM chapters WHERE book_id = ?', book.id).n;
    const sh = user.role === 'student' ? getShelf(db, user.id, book.id) : null;
    return {
      book: { id: book.id, title: book.title, author: book.author, is_demo: !!book.is_demo, total_pages: book.total_pages },
      chapter: ch,
      count,
      shelf: shelfView(sh),
    };
  });

  // Каталогта жоқ кітапты қолмен қосу (тек оқушының өзіне көрінеді)
  r.post('/api/books', ['student'], ({ user, body }) => {
    const title = V.str(body.title, 'title', { min: 1, max: 120 });
    const author = V.str(body.author, 'author', { min: 1, max: 80 });
    const totalPages = V.int(body.totalPages, 'totalPages', { min: 1, max: 5000 });
    const language = V.oneOf(body.language || 'kk', 'language', LANGS);
    const genre = V.str(body.genre, 'genre', { max: 40, required: false }) || '';
    const description = V.str(body.description, 'description', { max: 500, required: false }) || '';
    const id = db.tx(() => {
      const bid = db.run(
        `INSERT INTO books(title, author, description, language, genre, total_pages, cover_color, cover_emoji, visibility, owner_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,'private',?,?)`,
        title, author, description, language, genre, totalPages, '#5b6b8c', '📗', user.id, nowIso(),
      ).lastInsertRowid;
      upsertShelf(db, user.id, db.get('SELECT * FROM books WHERE id = ?', bid), { status: 'want' });
      return bid;
    });
    return { id };
  });

  r.delete('/api/books/:id', ['student'], ({ user, params }) => {
    const b = db.get('SELECT * FROM books WHERE id = ?', Number(params.id));
    if (!b || b.owner_id !== user.id) fail(404, 'not_found');
    if (db.get('SELECT 1 AS x FROM reading_logs WHERE book_id = ? LIMIT 1', b.id)) fail(409, 'has_logs');
    db.run('DELETE FROM books WHERE id = ?', b.id);
    return { ok: true };
  });

  r.put('/api/shelf/:bookId', ['student'], ({ user, params, body }) => {
    const book = bookOr404(db, user, params.bookId);
    const status = V.oneOf(body.status || 'want', 'status', ['want', 'reading']);
    const before = computeJourney(db, user.id, book.id);
    const res = db.tx(() => {
      upsertShelf(db, user.id, book, {
        status,
        totalPages: body.totalPages,
        stagePages: body.stagePages,
        goalText: body.goalText,
      });
      return afterLogChange(db, user, book.id, [], before);
    });
    return res;
  });

  r.delete('/api/shelf/:bookId', ['student'], ({ user, params }) => {
    const id = Number(params.bookId);
    if (db.get('SELECT 1 AS x FROM reading_logs WHERE user_id = ? AND book_id = ? LIMIT 1', user.id, id)) fail(409, 'has_logs');
    db.run('DELETE FROM shelf WHERE user_id = ? AND book_id = ?', user.id, id);
    return { ok: true };
  });

  // Оқу жазбалары — оқушының өзі белгілеген мәлімет
  r.post('/api/books/:id/logs', ['student'], ({ user, params, body }) => {
    const book = bookOr404(db, user, params.id);
    return db.tx(() => {
      const before = computeJourney(db, user.id, book.id);
      const v = validateLog(db, user, book.id, body);
      const now = nowIso();
      const id = db.run(
        'INSERT INTO reading_logs(user_id, book_id, page, minutes, note, log_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        user.id, book.id, v.page, v.minutes, v.note, v.date, now, now,
      ).lastInsertRowid;
      return { id, ...afterLogChange(db, user, book.id, [v.date], before) };
    });
  });

  r.patch('/api/logs/:id', ['student'], ({ user, params, body }) => {
    const log = ownLog(db, user, params.id);
    return db.tx(() => {
      const before = computeJourney(db, user.id, log.book_id);
      const v = validateLog(db, user, log.book_id, { page: log.page, minutes: log.minutes, note: log.note, date: log.log_date, ...body }, log.id);
      db.run(
        'UPDATE reading_logs SET page = ?, minutes = ?, note = ?, log_date = ?, updated_at = ? WHERE id = ?',
        v.page, v.minutes, v.note, v.date, nowIso(), log.id,
      );
      return { id: log.id, ...afterLogChange(db, user, log.book_id, [log.log_date, v.date], before) };
    });
  });

  r.delete('/api/logs/:id', ['student'], ({ user, params }) => {
    const log = ownLog(db, user, params.id);
    return db.tx(() => {
      const before = computeJourney(db, user.id, log.book_id);
      db.run('DELETE FROM reading_logs WHERE id = ?', log.id);
      return afterLogChange(db, user, log.book_id, [log.log_date], before);
    });
  });
}
