// Мұғалім кабинеті. Әр сұраныста сынып/оқушы иелігі серверде тексеріледі.
import crypto from 'node:crypto';
import { hashSecret } from '../auth.js';
import { addDays, fail, localDate, nowIso, parseJson, V } from '../lib/util.js';
import { bookOr404, canSeeBook, ownClass, ownStudent, parseStagePages, upsertShelf } from '../lib/access.js';
import { award, DEFAULT_RULES, parseRules, totalXp } from '../lib/xp.js';
import { checkRewards } from '../lib/rewards.js';
import { computeJourney } from '../lib/journey.js';
import { METRICS, missionView } from '../lib/missions.js';
import { AUTO_TYPES, TASK_TYPES, buildTask, checkAnswer, groundingIssues, publicTask, sourceTextFor } from '../lib/tasks.js';
import { cardView, visibleBooks } from './books.js';
import { HttpError } from '../lib/util.js';

const STAGE_NAMES = ['1. Бастау қақпасы', '2. Кейіпкерлер мекені', '3. Оқиғалар жолы', '4. Ой қазынасы', '5. Кітап шыңы'];

const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode(db) {
  for (;;) {
    const code = Array.from(crypto.randomBytes(6), (b) => CODE_ABC[b % CODE_ABC.length]).join('');
    if (!db.get('SELECT 1 AS x FROM classes WHERE invite_code = ?', code)) return code;
  }
}

const members = (db, cid) =>
  db.all("SELECT u.id, u.nickname, u.avatar FROM users u JOIN class_members m ON m.user_id = u.id WHERE m.class_id = ? AND u.role = 'student' ORDER BY u.nickname", cid);
const IN_CLASS = 'SELECT user_id FROM class_members WHERE class_id = ?';

function studentRows(db, cid) {
  const since = addDays(localDate(), -6);
  return members(db, cid).map((s) => {
    const cur = db.get(
      `SELECT b.id AS book_id, b.title, sh.current_page, sh.total_pages FROM shelf sh JOIN books b ON b.id = sh.book_id
       WHERE sh.user_id = ? AND sh.status = 'reading' ORDER BY sh.updated_at DESC LIMIT 1`, s.id);
    const one = (sql, ...p) => Object.values(db.get(sql, ...p))[0] ?? 0;

    let stageNo = 1;
    let stageName = STAGE_NAMES[0];
    if (cur) {
      const j = computeJourney(db, s.id, cur.book_id);
      if (j && j.current) {
        stageNo = j.current;
        stageName = STAGE_NAMES[Math.min(4, Math.max(0, j.current - 1))];
      }
    }

    return {
      ...s,
      current_book: cur?.title ?? null,
      percent: cur?.total_pages ? Math.round((cur.current_page / cur.total_pages) * 100) : null,
      stage_no: stageNo,
      stage_name: stageName,
      journey_stage: { stage_no: stageNo, stage_name: stageName },
      finished_books: one("SELECT COUNT(*) FROM shelf WHERE user_id = ? AND status = 'finished'", s.id),
      reading_days: one('SELECT COUNT(DISTINCT log_date) FROM reading_logs WHERE user_id = ?', s.id),
      reading_days_7: one('SELECT COUNT(DISTINCT log_date) FROM reading_logs WHERE user_id = ? AND log_date >= ?', s.id, since),
      minutes: one('SELECT COALESCE(SUM(minutes),0) FROM reading_logs WHERE user_id = ?', s.id),
      games_done: one('SELECT COUNT(*) FROM task_progress WHERE user_id = ? AND completed = 1', s.id),
      accepted: one("SELECT COUNT(*) FROM responses WHERE user_id = ? AND status = 'accepted'", s.id),
      pending: one("SELECT COUNT(*) FROM responses WHERE user_id = ? AND status = 'pending'", s.id),
      diary_notes: one("SELECT COUNT(*) FROM reading_logs WHERE user_id = ? AND note IS NOT NULL AND length(trim(note)) > 0", s.id) +
                   one("SELECT COUNT(*) FROM diary_entries WHERE user_id = ?", s.id) +
                   one("SELECT COUNT(*) FROM responses WHERE user_id = ? AND kind IN ('reflection', 'open') AND status = 'accepted'", s.id),
      xp: totalXp(db, s.id),
      last_log: db.get('SELECT MAX(log_date) AS d FROM reading_logs WHERE user_id = ?', s.id).d,
    };
  });
}

function canPreviewTask(db, teacher, t) {
  if (!t) return false;
  if (t.created_by === teacher.id) return true;
  if (t.class_id === null) return true;
  return !!db.get('SELECT 1 AS x FROM classes WHERE id = ? AND teacher_id = ?', t.class_id, teacher.id);
}

function taskOr404(db, teacher, id, { edit = false } = {}) {
  const t = db.get('SELECT * FROM tasks WHERE id = ?', Number(id));
  if (!canPreviewTask(db, teacher, t)) fail(404, 'not_found');
  if (edit && t.created_by !== teacher.id) fail(403, 'forbidden');
  return t;
}

function taskInput(db, teacher, body, existing = null) {
  const type = existing ? existing.type : V.oneOf(body.type, 'type', TASK_TYPES);
  let classId = existing ? existing.class_id : null;
  let bookId = existing ? existing.book_id : null;
  if (!existing) {
    classId = ownClass(db, teacher, body.classId).id;
    const book = bookOr404(db, teacher, body.bookId);
    bookId = book.id;
  }
  const f = {
    type,
    class_id: classId,
    book_id: bookId,
    stage_no: V.int(body.stageNo ?? existing?.stage_no ?? 2, 'stageNo', { min: 2, max: 5 }),
    title: V.str(body.title ?? existing?.title, 'title', { min: 2, max: 80 }),
    instruction: V.str(body.instruction ?? existing?.instruction, 'instruction', { min: 5, max: 300 }),
    example: V.str(body.example ?? existing?.example, 'example', { max: 300, required: false }) || '',
    source_excerpt: V.str(body.sourceExcerpt ?? existing?.source_excerpt, 'sourceExcerpt', { max: 6000, required: false }) || '',
    source_chapter: V.int(body.sourceChapter ?? existing?.source_chapter, 'sourceChapter', { min: 1, max: 500, required: false }),
    hints: (Array.isArray(body.hints) ? body.hints : parseJson(existing?.hints, []))
      .map((h) => String(h || '').trim().slice(0, 300)).filter(Boolean).slice(0, 4),
    explanation: V.str(body.explanation ?? existing?.explanation, 'explanation', { max: 1200, required: false }) || '',
    spec: body.spec ?? parseJson(existing?.spec, {}),
  };
  const built = buildTask(type, f.spec);
  return { ...f, built };
}

function publishCheck(db, t) {
  const spec = parseJson(t.spec, {});
  const src = sourceTextFor(db, t.book_id, t.source_excerpt);
  if (AUTO_TYPES.includes(t.type) && src.trim().length < 20) fail(400, 'source_required');
  const missing = groundingIssues(t.type, spec, src);
  if (missing.length) fail(400, 'not_grounded', { missing });
}

/** Мұғалім үзіндісінен ереже бойынша жоба (AI емес). Мұғалім міндетті түрде тексереді. */
function ruleDraft(type, excerpt) {
  const text = String(excerpt || '').replace(/\r/g, '');
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim().replace(/^[—–-]\s*/, ''))
    .filter((s) => s.length >= 20 && s.length <= 220);
  if (type === 'sequence') {
    const n = Math.min(5, sentences.length);
    const items = Array.from({ length: n }, (_, i) => sentences[Math.floor((i * sentences.length) / n)]);
    return { items };
  }
  if (type === 'who_said') {
    const quotes = [];
    const re = /^[—–-]\s*(.+?)[,!?.]?\s*[—–-]\s*(?:деді|деп|сказал[аи]?|спросил[аи]?)\s+([\p{Lu}][\p{L}]+(?:\s+(?:әже|ата|апа|аға|ағай))?)/gmu;
    let m;
    while ((m = re.exec(text)) && quotes.length < 6) quotes.push({ text: m[1].trim(), speaker: m[2].trim() });
    const re2 = /«([^»]{8,200})»/g;
    while ((m = re2.exec(text)) && quotes.length < 6) quotes.push({ text: m[1].trim(), speaker: '' });
    return { quotes, extraSpeakers: [] };
  }
  if (type === 'vocab') {
    const words = [...new Set((text.match(/[\p{L}]{7,}/gu) || []).map((w) => w.toLocaleLowerCase('kk')))].slice(0, 5);
    return { words: words.map((word) => ({ word, meaning: '' })), sentence: true };
  }
  if (type === 'evidence') {
    return { claims: [{ claim: '', options: sentences.slice(0, 3), correct: 0 }] };
  }
  fail(400, 'draft_unsupported');
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export default function register(r, db) {
  const T = ['teacher'];

  // ---------- Сыныптар ----------
  r.get('/api/teacher/classes', T, ({ user }) => ({
    classes: db.all(
      `SELECT c.id, c.name, c.level, c.invite_code, c.xp_rules, c.is_demo,
              (SELECT COUNT(*) FROM class_members m WHERE m.class_id = c.id) AS students
       FROM classes c WHERE c.teacher_id = ? ORDER BY c.id`, user.id,
    ).map((c) => ({ ...c, xp_rules: parseRules(c.xp_rules), is_demo: !!c.is_demo })),
    default_rules: DEFAULT_RULES,
  }));

  r.post('/api/teacher/classes', T, ({ user, body }) => {
    const name = V.str(body.name, 'name', { min: 2, max: 40 });
    const level = V.oneOf(body.level || 'junior', 'level', ['junior', 'senior']);
    const code = newCode(db);
    const id = db.run('INSERT INTO classes(name, teacher_id, invite_code, level, created_at) VALUES (?,?,?,?,?)', name, user.id, code, level, nowIso()).lastInsertRowid;
    return { id, invite_code: code };
  });

  r.patch('/api/teacher/classes/:id', T, ({ user, params, body }) => {
    const c = ownClass(db, user, params.id);
    const name = body.name !== undefined ? V.str(body.name, 'name', { min: 2, max: 40 }) : c.name;
    const level = body.level !== undefined ? V.oneOf(body.level, 'level', ['junior', 'senior']) : c.level;
    let rules = parseRules(c.xp_rules);
    if (body.xpRules) {
      rules = {};
      for (const k of Object.keys(DEFAULT_RULES)) rules[k] = V.int(body.xpRules[k], 'xp_' + k, { min: 0, max: 500 });
    }
    db.run('UPDATE classes SET name = ?, level = ?, xp_rules = ? WHERE id = ?', name, level, JSON.stringify(rules), c.id);
    return { ok: true, xp_rules: rules };
  });

  r.post('/api/teacher/classes/:id/new-code', T, ({ user, params }) => {
    const c = ownClass(db, user, params.id);
    const code = newCode(db);
    db.run('UPDATE classes SET invite_code = ? WHERE id = ?', code, c.id);
    return { invite_code: code };
  });

  r.get('/api/teacher/classes/:id/students', T, ({ user, params }) => {
    const c = ownClass(db, user, params.id);
    return { students: studentRows(db, c.id) };
  });

  r.post('/api/teacher/students/:id/reset-pin', T, ({ user, params }) => {
    const s = ownStudent(db, user, params.id);
    const pin = String(crypto.randomInt(0, 10000)).padStart(4, '0');
    db.run('UPDATE users SET secret_hash = ? WHERE id = ?', hashSecret(pin), s.id);
    db.run('DELETE FROM sessions WHERE user_id = ?', s.id);
    return { pin };
  });

  // ---------- Шолу: 4 негізгі көрсеткіш ----------
  r.get('/api/teacher/classes/:id/overview', T, ({ user, params }) => {
    const c = ownClass(db, user, params.id);
    const today = localDate();
    const since = addDays(today, -6);
    const n = db.get(`SELECT COUNT(*) AS n FROM class_members WHERE class_id = ?`, c.id).n;
    const activity = {
      students: n,
      active_students_7: db.get(`SELECT COUNT(DISTINCT user_id) AS n FROM reading_logs WHERE user_id IN (${IN_CLASS}) AND log_date >= ?`, c.id, since).n,
      reading_days_7: db.get(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT user_id, log_date FROM reading_logs WHERE user_id IN (${IN_CLASS}) AND log_date >= ?)`, c.id, since).n,
      minutes_7: db.get(`SELECT COALESCE(SUM(minutes),0) AS n FROM reading_logs WHERE user_id IN (${IN_CLASS}) AND log_date >= ?`, c.id, since).n,
      days: Array.from({ length: 7 }, (_, i) => {
        const d = addDays(since, i);
        return { date: d, readers: db.get(`SELECT COUNT(DISTINCT user_id) AS n FROM reading_logs WHERE user_id IN (${IN_CLASS}) AND log_date = ?`, c.id, d).n };
      }),
    };
    const books = db.all(
      `SELECT b.id, b.title, b.cover_color, b.cover_emoji,
              SUM(CASE WHEN s.status != 'want' THEN 1 ELSE 0 END) AS readers,
              SUM(CASE WHEN s.status = 'want' THEN 1 ELSE 0 END) AS not_started,
              SUM(CASE WHEN s.status = 'finished' THEN 1 ELSE 0 END) AS finished,
              ROUND(AVG(CASE WHEN s.status != 'want' AND s.total_pages > 0 THEN 100.0 * s.current_page / s.total_pages END)) AS avg_percent
       FROM shelf s JOIN books b ON b.id = s.book_id
       WHERE s.user_id IN (${IN_CLASS}) GROUP BY b.id ORDER BY readers DESC`, c.id,
    );
    const tasks = db.all(
      `SELECT t.id, t.title, t.type, t.stage_no, b.title AS book_title,
              (SELECT COUNT(*) FROM task_progress p WHERE p.task_id = t.id AND p.completed = 1 AND p.user_id IN (${IN_CLASS})) AS completed,
              (SELECT COUNT(*) FROM task_progress p WHERE p.task_id = t.id AND p.user_id IN (${IN_CLASS})) AS attempted,
              (SELECT ROUND(AVG(p.tries), 1) FROM task_progress p WHERE p.task_id = t.id AND p.completed = 1 AND p.user_id IN (${IN_CLASS})) AS avg_tries,
              (SELECT COUNT(*) FROM responses r WHERE r.task_id = t.id AND r.user_id IN (${IN_CLASS})) AS submitted,
              (SELECT COUNT(*) FROM responses r WHERE r.task_id = t.id AND r.status = 'accepted' AND r.user_id IN (${IN_CLASS})) AS accepted
       FROM tasks t JOIN books b ON b.id = t.book_id
       WHERE t.status = 'published' AND (t.class_id IS NULL OR t.class_id = ?)
         AND t.book_id IN (SELECT book_id FROM shelf WHERE user_id IN (${IN_CLASS}))
       ORDER BY b.title, t.stage_no, t.id`,
      c.id, c.id, c.id, c.id, c.id, c.id, c.id,
    );
    const pending = db.get(`SELECT COUNT(*) AS n FROM responses WHERE status = 'pending' AND user_id IN (${IN_CLASS})`, c.id).n;
    const students = studentRows(db, c.id);
    const stage_distribution = [
      { stage: 1, name: 'Бастау қақпасы', count: students.filter((s) => s.stage_no === 1).length },
      { stage: 2, name: 'Кейіпкерлер мекені', count: students.filter((s) => s.stage_no === 2).length },
      { stage: 3, name: 'Оқиғалар жолы', count: students.filter((s) => s.stage_no === 3).length },
      { stage: 4, name: 'Ой қазынасы', count: students.filter((s) => s.stage_no === 4).length },
      { stage: 5, name: 'Кітап шыңы', count: students.filter((s) => s.stage_no === 5).length },
    ];
    return {
      class: { id: c.id, name: c.name, level: c.level, invite_code: c.invite_code, is_demo: !!c.is_demo },
      activity, books, tasks, pending, students, stage_distribution,
    };
  });

  r.get('/api/teacher/classes/:id/export.csv', T, ({ user, params, res }) => {
    const c = ownClass(db, user, params.id);
    const rows = studentRows(db, c.id);
    const head = ['Бүркеншік ат', 'Оқып жатқан кітап', 'Прогресс, %', 'Саяхат кезеңі', 'Аяқталған кітаптар', 'Оқу күндері (барлығы)', 'Оқу күндері (7 күн)', 'Белгіленген минут', 'Орындалған ойындар', 'Қабылданған жауаптар', 'Тексеруді күтетін', 'Күнделік жазбалары', 'XP (баға емес)', 'Соңғы жазба'];
    const lines = [head, ...rows.map((s) => [s.nickname, s.current_book, s.percent, s.stage_name, s.finished_books, s.reading_days, s.reading_days_7, s.minutes, s.games_done, s.accepted, s.pending, s.diary_notes, s.xp, s.last_log])];
    const csv = '\uFEFF' + lines.map((l) => l.map(csvCell).join(';')).join('\r\n');
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kitaptracker-class-${c.id}-${localDate()}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.end(csv);
  });

  // ---------- Кітаптар және мақсаттар ----------
  r.get('/api/teacher/books', T, ({ user }) => ({
    books: visibleBooks(db, user).map((b) => ({ ...cardView(b, user), class_id: b.class_id })),
  }));

  r.post('/api/teacher/books', T, ({ user, body }) => {
    const c = ownClass(db, user, body.classId);
    const title = V.str(body.title, 'title', { min: 1, max: 120 });
    const author = V.str(body.author, 'author', { min: 1, max: 80 });
    const totalPages = V.int(body.totalPages, 'totalPages', { min: 1, max: 5000, required: false });
    const language = V.oneOf(body.language || 'kk', 'language', ['kk', 'ru', 'en', 'other']);
    const gradeMin = V.int(body.gradeMin ?? 1, 'gradeMin', { min: 1, max: 11 });
    const gradeMax = V.int(body.gradeMax ?? 11, 'gradeMax', { min: gradeMin, max: 11 });
    const text = V.str(body.text, 'text', { max: 60000, required: false });
    const sp = parseStagePages(body.stagePages ?? null, totalPages);
    const id = db.tx(() => {
      const bid = db.run(
        `INSERT INTO books(title, author, description, language, genre, interests, grade_min, grade_max, total_pages, stage_pages, cover_color, cover_emoji, visibility, class_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'class',?,?)`,
        title, author, V.str(body.description, 'description', { max: 600, required: false }) || '', language,
        V.str(body.genre, 'genre', { max: 40, required: false }) || '', V.str(body.interests, 'interests', { max: 120, required: false }) || '',
        gradeMin, gradeMax, totalPages, sp ? JSON.stringify(sp) : null, '#1f4e79', '📕', c.id, nowIso(),
      ).lastInsertRowid;
      if (text) {
        // Мәтінді «## Бөлім атауы» жолдары бойынша бөлімдерге бөлеміз
        const parts = text.split(/^##\s+/m).map((p) => p.trim()).filter(Boolean);
        parts.forEach((p, i) => {
          const nl = p.indexOf('\n');
          const head = nl > 0 && parts.length > 1 ? p.slice(0, nl).trim() : `${i + 1}`;
          const bodyText = nl > 0 && parts.length > 1 ? p.slice(nl + 1).trim() : p;
          db.run('INSERT INTO chapters(book_id, idx, title, body) VALUES (?,?,?,?)', bid, i + 1, head.slice(0, 120), bodyText);
        });
      }
      return bid;
    });
    return { id };
  });

  r.post('/api/teacher/classes/:id/assign', T, ({ user, params, body }) => {
    const c = ownClass(db, user, params.id);
    const book = bookOr404(db, user, body.bookId);
    if (book.visibility === 'private' || (book.visibility === 'class' && book.class_id !== c.id)) fail(400, 'book_not_for_class');
    const targets = body.studentId ? [ownStudent(db, user, body.studentId)] : members(db, c.id);
    if (body.studentId && targets[0].class_id !== c.id) fail(403, 'forbidden');
    const goalText = V.str(body.goalText, 'goalText', { min: 2, max: 160 });
    let assigned = 0;
    const skipped = [];
    db.tx(() => {
      for (const s of targets) {
        try {
          upsertShelf(db, s.id, book, { totalPages: body.totalPages || undefined, stagePages: body.stagePages ?? undefined, goalText, assignedBy: user.id });
          assigned++;
        } catch (e) {
          if (e instanceof HttpError && e.status === 400) skipped.push({ id: s.id, nickname: s.nickname, error: e.code });
          else throw e;
        }
      }
    });
    return { assigned, skipped };
  });

  r.get('/api/teacher/classes/:id/assignments', T, ({ user, params }) => {
    const c = ownClass(db, user, params.id);
    return {
      assignments: db.all(
        `SELECT b.id AS book_id, b.title, b.cover_color, b.cover_emoji, s.goal_text, COUNT(*) AS students,
                SUM(CASE WHEN s.status = 'finished' THEN 1 ELSE 0 END) AS finished,
                SUM(CASE WHEN s.status = 'want' THEN 1 ELSE 0 END) AS not_started
         FROM shelf s JOIN books b ON b.id = s.book_id
         WHERE s.assigned_by IS NOT NULL AND s.user_id IN (${IN_CLASS})
         GROUP BY b.id, s.goal_text ORDER BY b.title`, c.id,
      ),
    };
  });

  // ---------- Тапсырма құрастырушы ----------
  r.get('/api/teacher/tasks', T, ({ user, query }) => {
    const rows = db.all(
      `SELECT t.*, b.title AS book_title, c.name AS class_name FROM tasks t
         JOIN books b ON b.id = t.book_id LEFT JOIN classes c ON c.id = t.class_id
       WHERE (t.created_by = ? OR t.class_id IN (SELECT id FROM classes WHERE teacher_id = ?) OR (t.class_id IS NULL AND t.status = 'published'))
         AND (? IS NULL OR t.book_id = ?)
       ORDER BY b.title, t.stage_no, t.id`,
      user.id, user.id, query.bookId ? Number(query.bookId) : null, query.bookId ? Number(query.bookId) : null,
    );
    return {
      tasks: rows.map((t) => ({
        id: t.id, type: t.type, title: t.title, stage_no: t.stage_no, status: t.status, book_id: t.book_id,
        book_title: t.book_title, class_name: t.class_name, shared: t.class_id === null, is_demo: !!t.is_demo,
        editable: t.created_by === user.id,
      })),
    };
  });

  r.get('/api/teacher/tasks/:id', T, ({ user, params }) => {
    const t = taskOr404(db, user, params.id);
    return {
      task: publicTask(t),
      spec: parseJson(t.spec, {}),
      hints: parseJson(t.hints, []),
      explanation: t.explanation,
      editable: t.created_by === user.id,
      warnings: groundingIssues(t.type, parseJson(t.spec, {}), sourceTextFor(db, t.book_id, t.source_excerpt)),
    };
  });

  r.post('/api/teacher/tasks', T, ({ user, body }) => {
    const f = taskInput(db, user, body);
    const now = nowIso();
    const id = db.run(
      `INSERT INTO tasks(book_id, class_id, created_by, type, stage_no, title, instruction, example, source_excerpt, source_chapter, spec, payload, answer, hints, explanation, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?)`,
      f.book_id, f.class_id, user.id, f.type, f.stage_no, f.title, f.instruction, f.example, f.source_excerpt, f.source_chapter,
      JSON.stringify(f.spec), JSON.stringify(f.built.payload), JSON.stringify(f.built.answer), JSON.stringify(f.hints), f.explanation, now, now,
    ).lastInsertRowid;
    return { id, warnings: groundingIssues(f.type, f.spec, sourceTextFor(db, f.book_id, f.source_excerpt)) };
  });

  r.patch('/api/teacher/tasks/:id', T, ({ user, params, body }) => {
    const t = taskOr404(db, user, params.id, { edit: true });
    const f = taskInput(db, user, body, t);
    const warnings = groundingIssues(f.type, f.spec, sourceTextFor(db, f.book_id, f.source_excerpt));
    if (t.status === 'published' && warnings.length) fail(400, 'not_grounded', { missing: warnings });
    db.run(
      `UPDATE tasks SET stage_no = ?, title = ?, instruction = ?, example = ?, source_excerpt = ?, source_chapter = ?, spec = ?, payload = ?, answer = ?, hints = ?, explanation = ?, updated_at = ? WHERE id = ?`,
      f.stage_no, f.title, f.instruction, f.example, f.source_excerpt, f.source_chapter, JSON.stringify(f.spec),
      JSON.stringify(f.built.payload), JSON.stringify(f.built.answer), JSON.stringify(f.hints), f.explanation, nowIso(), t.id,
    );
    return { id: t.id, warnings };
  });

  r.post('/api/teacher/tasks/:id/publish', T, ({ user, params, body }) => {
    const t = taskOr404(db, user, params.id, { edit: true });
    const publish = body.publish !== false;
    if (publish) publishCheck(db, t);
    db.run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?', publish ? 'published' : 'draft', nowIso(), t.id);
    return { status: publish ? 'published' : 'draft' };
  });

  r.delete('/api/teacher/tasks/:id', T, ({ user, params }) => {
    const t = taskOr404(db, user, params.id, { edit: true });
    db.run('DELETE FROM tasks WHERE id = ?', t.id);
    return { ok: true };
  });

  // Оқушы ретінде алдын ала қарау: жауап тексеріледі, бірақ еш жерде сақталмайды
  r.post('/api/teacher/tasks/:id/check', T, ({ user, params, body }) => {
    const t = taskOr404(db, user, params.id);
    if (!AUTO_TYPES.includes(t.type)) fail(400, 'not_auto_task');
    const res = checkAnswer(t, body.answer);
    const streak = Math.max(1, Number(body.streak) || 1);
    const hints = parseJson(t.hints, []);
    return {
      correct: res.correct,
      items: res.items,
      preview: true,
      feedback: res.correct
        ? { status: 'correct', explanation: t.explanation || null }
        : {
            status: 'retry', streak,
            hint: hints.length ? hints[Math.min(streak - 1, hints.length - 1)] : null,
            explanation: streak >= 2 ? t.explanation || null : null,
            correct_count: res.items.filter((x) => x.ok).length, total: res.items.length,
          },
    };
  });

  r.post('/api/teacher/draft', T, ({ body }) => {
    const type = V.oneOf(body.type, 'type', ['sequence', 'who_said', 'vocab', 'evidence']);
    const excerpt = V.str(body.excerpt, 'excerpt', { min: 40, max: 6000 });
    return { spec: ruleDraft(type, excerpt), method: 'rules' };
  });

  // ---------- Жауаптарды тексеру ----------
  r.get('/api/teacher/reviews', T, ({ user, query }) => {
    const status = ['pending', 'accepted', 'returned', 'all'].includes(query.status) ? query.status : 'pending';
    const classId = query.classId ? ownClass(db, user, query.classId).id : null;
    const rows = db.all(
      `SELECT r.*, u.nickname, u.avatar, c.name AS class_name, b.title AS book_title, t.title AS task_title, t.type AS task_type, t.payload AS task_payload
       FROM responses r
         JOIN users u ON u.id = r.user_id
         JOIN class_members m ON m.user_id = u.id
         JOIN classes c ON c.id = m.class_id
         JOIN books b ON b.id = r.book_id
         LEFT JOIN tasks t ON t.id = r.task_id
       WHERE c.teacher_id = ? AND (? IS NULL OR c.id = ?) AND (? = 'all' OR r.status = ?)
       ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.updated_at DESC LIMIT 200`,
      user.id, classId, classId, status, status,
    );
    return {
      reviews: rows.map((x) => ({
        id: x.id, kind: x.kind, text: x.text, extra: parseJson(x.extra, {}), status: x.status, feedback: x.feedback,
        created_at: x.created_at, updated_at: x.updated_at, reviewed_at: x.reviewed_at,
        student: { id: x.user_id, nickname: x.nickname, avatar: x.avatar }, class_name: x.class_name,
        book_title: x.book_title, task_title: x.task_title, task_type: x.task_type, task_payload: parseJson(x.task_payload, null),
      })),
    };
  });

  r.post('/api/teacher/reviews/:id', T, ({ user, params, body }) => {
    const resp = db.get('SELECT * FROM responses WHERE id = ?', Number(params.id));
    if (!resp) fail(404, 'not_found');
    ownStudent(db, user, resp.user_id);
    const decision = V.oneOf(body.decision, 'decision', ['accept', 'return']);
    const feedback = V.str(body.feedback, 'feedback', { max: 1500, required: decision === 'return', min: decision === 'return' ? 3 : 0 });
    if (resp.status !== 'pending') fail(409, 'not_pending');
    return db.tx(() => {
      db.run(
        'UPDATE responses SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = ?, seen_feedback = 0 WHERE id = ?',
        decision === 'accept' ? 'accepted' : 'returned', feedback, user.id, nowIso(), resp.id,
      );
      let xp = 0;
      if (decision === 'accept') {
        // Бір тапсырма/кітап үшін рефлексия ұпайы бір-ақ рет
        xp = award(db, resp.user_id, 'reflection', resp.task_id ? 'task:' + resp.task_id : 'book:' + resp.book_id);
        checkRewards(db, resp.user_id);
      }
      return { status: decision === 'accept' ? 'accepted' : 'returned', xp_awarded: xp };
    });
  });

  // ---------- Ортақ миссия ----------
  r.get('/api/teacher/classes/:id/missions', T, ({ user, params }) => {
    const c = ownClass(db, user, params.id);
    const studs = members(db, c.id);
    return {
      missions: db.all('SELECT * FROM missions WHERE class_id = ? ORDER BY active DESC, id DESC', c.id).map((m) => ({
        ...missionView(db, m),
        contributions: studs.map((s) => ({ nickname: s.nickname, value: missionView(db, m, s.id).mine })),
      })),
    };
  });

  const missionFields = (body, m = {}) => {
    const start = V.date(body.startDate ?? m.start_date, 'startDate');
    const end = V.date(body.endDate ?? m.end_date, 'endDate');
    if (end < start) fail(400, 'date_invalid', { field: 'endDate' });
    return {
      title: V.str(body.title ?? m.title, 'title', { min: 3, max: 80 }),
      description: V.str(body.description ?? m.description, 'description', { max: 300, required: false }) || '',
      metric: m.metric ?? V.oneOf(body.metric, 'metric', METRICS),
      target: V.int(body.target ?? m.target, 'target', { min: 1, max: 10000 }),
      start, end,
      active: body.active === undefined ? (m.active ?? 1) : body.active ? 1 : 0,
    };
  };

  r.post('/api/teacher/classes/:id/missions', T, ({ user, params, body }) => {
    const c = ownClass(db, user, params.id);
    const f = missionFields(body);
    const id = db.run(
      'INSERT INTO missions(class_id, title, description, metric, target, start_date, end_date, active, created_at) VALUES (?,?,?,?,?,?,?,1,?)',
      c.id, f.title, f.description, f.metric, f.target, f.start, f.end, nowIso(),
    ).lastInsertRowid;
    return { id };
  });

  r.patch('/api/teacher/missions/:id', T, ({ user, params, body }) => {
    const m = db.get('SELECT * FROM missions WHERE id = ?', Number(params.id));
    if (!m) fail(404, 'not_found');
    ownClass(db, user, m.class_id);
    const f = missionFields(body, m);
    db.run('UPDATE missions SET title = ?, description = ?, target = ?, start_date = ?, end_date = ?, active = ? WHERE id = ?',
      f.title, f.description, f.target, f.start, f.end, f.active, m.id);
    return { ok: true };
  });

  void canSeeBook;
}
