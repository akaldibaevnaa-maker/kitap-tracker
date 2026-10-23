// Ойын алаңы: тапсырмалар, жауап тексеру, ашық жауаптар мен рефлексиялар.
import { fail, nowIso, normText, parseJson, V } from '../lib/util.js';
import { bookOr404 } from '../lib/access.js';
import { getShelf } from '../lib/progress.js';
import { computeJourney } from '../lib/journey.js';
import { checkRewards } from '../lib/rewards.js';
import { award } from '../lib/xp.js';
import { AUTO_TYPES, checkAnswer, publicTask, visibleTasks } from '../lib/tasks.js';

/** Оқушының келесі қадамы — «Не істеймін?» сұрағына жауап. */
export function nextStep(db, userId, bookId, journey, excludeId = null) {
  if (!journey) return { kind: 'start', book_id: bookId };
  const tasks = visibleTasks(db, userId, bookId);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const open = journey.tasks.find((t) => t.unlocked && !t.done && t.id !== excludeId);
  const stage = journey.stages.find((s) => s.status === 'current');
  if (!stage) return { kind: 'done', book_id: bookId };
  for (const r of stage.reqs) {
    if (r.done) continue;
    if (r.key === 'first_log' || r.key === 'page' || r.key === 'finish') {
      const target = r.key === 'page' ? r.params.page : r.key === 'finish' ? journey.total : null;
      const ch = db.get(
        'SELECT idx, title FROM chapters WHERE book_id = ? AND page_end > ? ORDER BY idx LIMIT 1',
        bookId, journey.page,
      );
      return { kind: 'read', book_id: bookId, page: target, chapter: ch ? ch.idx : null, chapter_title: ch?.title ?? null };
    }
    if (r.key === 'task') {
      const t = journey.tasks.find((x) => x.stage_no === stage.no && x.unlocked && !x.done && x.id !== excludeId);
      if (t) return { kind: 'task', book_id: bookId, task_id: t.id, title: byId.get(t.id).title, type: byId.get(t.id).type };
    }
    if (r.key === 'note1' || r.key === 'note2') return { kind: 'note', book_id: bookId };
    if (r.key === 'reflection_sent') return { kind: 'reflection', book_id: bookId };
    if (r.key === 'goal') return { kind: 'goal', book_id: bookId };
  }
  if (open) return { kind: 'task', book_id: bookId, task_id: open.id, title: byId.get(open.id).title, type: byId.get(open.id).type };
  return { kind: 'world', book_id: bookId };
}

function loadTaskForStudent(db, user, id) {
  const t = db.get('SELECT * FROM tasks WHERE id = ?', Number(id));
  if (!t || t.status !== 'published') fail(404, 'not_found');
  const myClass = db.get('SELECT class_id FROM class_members WHERE user_id = ?', user.id)?.class_id ?? null;
  if (t.class_id !== null && t.class_id !== myClass) fail(404, 'not_found');
  bookOr404(db, user, t.book_id);
  const journey = computeJourney(db, user.id, t.book_id);
  const state = journey?.tasks.find((x) => x.id === t.id) || { id: t.id, unlocked: false, done: false, lock: { reason: 'start' } };
  return { t, journey, state };
}

function responseView(r) {
  if (!r) return null;
  return {
    id: r.id, kind: r.kind, text: r.text, extra: parseJson(r.extra, {}), status: r.status,
    feedback: r.feedback, reviewed_at: r.reviewed_at, updated_at: r.updated_at,
  };
}

function saveResponse(db, user, { bookId, taskId, kind, text, extra }) {
  const existing = taskId
    ? db.get('SELECT * FROM responses WHERE user_id = ? AND task_id = ?', user.id, taskId)
    : db.get("SELECT * FROM responses WHERE user_id = ? AND book_id = ? AND kind = 'reflection'", user.id, bookId);
  const now = nowIso();
  if (existing) {
    if (existing.status === 'accepted') fail(409, 'already_accepted');
    db.run(
      "UPDATE responses SET text = ?, extra = ?, kind = ?, status = 'pending', seen_feedback = 1, updated_at = ? WHERE id = ?",
      text, JSON.stringify(extra || {}), kind, now, existing.id,
    );
    return db.get('SELECT * FROM responses WHERE id = ?', existing.id);
  }
  const id = db.run(
    `INSERT INTO responses(user_id, book_id, task_id, kind, text, extra, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,'pending',?,?)`,
    user.id, bookId, taskId, kind, text, JSON.stringify(extra || {}), now, now,
  ).lastInsertRowid;
  return db.get('SELECT * FROM responses WHERE id = ?', id);
}

export default function register(r, db) {
  r.get('/api/play', ['student'], ({ user }) => {
    const shelfRows = db.all(
      `SELECT b.id, b.title, b.author, b.cover_color, b.cover_emoji, b.is_demo, s.status
       FROM shelf s JOIN books b ON b.id = s.book_id WHERE s.user_id = ? ORDER BY (s.status = 'reading') DESC, s.updated_at DESC`,
      user.id,
    );
    const books = [];
    for (const b of shelfRows) {
      const tasks = visibleTasks(db, user.id, b.id);
      if (!tasks.length) continue;
      const journey = b.status === 'want' ? null : computeJourney(db, user.id, b.id);
      const states = new Map((journey?.tasks || []).map((t) => [t.id, t]));
      const resp = new Map(
        db.all('SELECT task_id, status FROM responses WHERE user_id = ? AND book_id = ? AND task_id IS NOT NULL', user.id, b.id)
          .map((x) => [x.task_id, x.status]),
      );
      books.push({
        book: b,
        started: b.status !== 'want',
        current_stage: journey?.current ?? null,
        next: nextStep(db, user.id, b.id, journey),
        tasks: tasks.map((t) => ({
          id: t.id, type: t.type, title: t.title, stage_no: t.stage_no,
          unlocked: states.get(t.id)?.unlocked ?? false,
          done: states.get(t.id)?.done ?? false,
          lock: states.get(t.id)?.lock ?? { reason: 'start' },
          response_status: resp.get(t.id) || null,
        })),
      });
    }
    const noTaskBooks = shelfRows.filter((b) => b.status !== 'want' && !books.some((x) => x.book.id === b.id)).map((b) => ({ id: b.id, title: b.title }));
    return { books, no_task_books: noTaskBooks };
  });

  r.get('/api/tasks/:id', ['student'], ({ user, params }) => {
    const { t, state, journey } = loadTaskForStudent(db, user, params.id);
    const prog = db.get('SELECT tries, completed, wrong_streak FROM task_progress WHERE user_id = ? AND task_id = ?', user.id, t.id);
    const resp = db.get('SELECT * FROM responses WHERE user_id = ? AND task_id = ?', user.id, t.id);
    const book = db.get('SELECT id, title, is_demo FROM books WHERE id = ?', t.book_id);
    const base = publicTask(t);
    if (!state.unlocked) delete base.payload;
    return {
      task: base,
      book,
      state,
      progress: prog || { tries: 0, completed: 0, wrong_streak: 0 },
      response: responseView(resp),
      next: state.done ? nextStep(db, user.id, t.book_id, journey, t.id) : null,
    };
  });

  r.post('/api/tasks/:id/attempt', ['student'], ({ user, params, body }) => {
    const { t, state, journey: before } = loadTaskForStudent(db, user, params.id);
    if (!state.unlocked) fail(403, 'task_locked', { lock: state.lock });
    if (!AUTO_TYPES.includes(t.type)) fail(400, 'not_auto_task');
    return db.tx(() => {
      const res = checkAnswer(t, body.answer);
      const prev = db.get('SELECT * FROM task_progress WHERE user_id = ? AND task_id = ?', user.id, t.id);
      const tries = (prev?.tries ?? 0) + 1;
      const streak = res.correct ? 0 : (prev?.wrong_streak ?? 0) + 1;
      const firstCompletion = res.correct && !prev?.completed;
      db.run(
        `INSERT INTO task_progress(user_id, task_id, tries, wrong_streak, completed, completed_at) VALUES (?,?,?,?,?,?)
         ON CONFLICT(user_id, task_id) DO UPDATE SET tries = excluded.tries, wrong_streak = excluded.wrong_streak,
           completed = MAX(completed, excluded.completed), completed_at = COALESCE(completed_at, excluded.completed_at)`,
        user.id, t.id, tries, streak, res.correct ? 1 : 0, res.correct ? nowIso() : null,
      );
      db.run('INSERT INTO attempts(task_id, user_id, answer, correct, created_at) VALUES (?,?,?,?,?)',
        t.id, user.id, JSON.stringify(body.answer ?? null).slice(0, 4000), res.correct ? 1 : 0, nowIso());
      // Ұпай тек алғаш орындағанда беріледі; қайта жаттығуға болады, бірақ ұпай қосылмайды
      const xp = res.correct ? award(db, user.id, 'game', 'task:' + t.id) : 0;
      const hints = parseJson(t.hints, []);
      const feedback = res.correct
        ? { status: 'correct', explanation: t.explanation || null, practice: !firstCompletion }
        : {
            status: 'retry',
            streak,
            hint: hints.length ? hints[Math.min(streak - 1, hints.length - 1)] : null,
            explanation: streak >= 2 ? t.explanation || null : null,
            correct_count: res.items.filter((x) => x.ok).length,
            total: res.items.length,
          };
      const journey = computeJourney(db, user.id, t.book_id);
      const rewards = checkRewards(db, user.id);
      return {
        correct: res.correct,
        items: res.items,
        feedback,
        xp_awarded: xp,
        new_rewards: rewards,
        stage_up: journey.done_count > before.done_count ? journey.done_count : null,
        journey,
        next: res.correct ? nextStep(db, user.id, t.book_id, journey, t.id) : null,
      };
    });
  });

  // Ашық жауап: «Кейіпкердің таңдауы», «Шығармашылық шеберхана», «Сөз қазынасы» сөйлемі
  r.post('/api/tasks/:id/response', ['student'], ({ user, params, body }) => {
    const { t, state, journey: before } = loadTaskForStudent(db, user, params.id);
    if (!state.unlocked) fail(403, 'task_locked', { lock: state.lock });
    const payload = parseJson(t.payload, {});
    let kind = 'open';
    let text;
    let extra = {};
    if (t.type === 'choice') {
      text = V.str(body.text, 'text', { min: 30, max: 3000 });
      const position = body.position == null || body.position === '' ? null : V.oneOf(body.position, 'position', payload.positions || []);
      extra = { position, evidence: V.str(body.evidence, 'evidence', { max: 600, required: false }) };
    } else if (t.type === 'creative') {
      const pkind = V.oneOf(body.kind, 'kind', (payload.prompts || []).map((p) => p.kind));
      text = V.str(body.text, 'text', { min: 20, max: 4000 });
      extra = { kind: pkind };
      if (pkind === 'cover') {
        extra.cover = {
          color: /^#[0-9a-f]{6}$/i.test(body.cover?.color || '') ? body.cover.color : '#2e7d5b',
          emoji: String(body.cover?.emoji || '📘').slice(0, 4),
          title: V.str(body.cover?.title, 'coverTitle', { max: 80, required: false }) || '',
        };
      }
    } else if (t.type === 'vocab') {
      kind = 'sentence';
      const word = (payload.words || []).find((w) => w.id === body.wordId);
      if (!word) fail(400, 'invalid_input', { field: 'wordId' });
      text = V.str(body.text, 'text', { min: 8, max: 400 });
      const n = normText(word.word);
      const stem = n.slice(0, Math.max(3, n.length - 2));
      if (!(' ' + normText(text)).includes(' ' + stem)) fail(400, 'word_missing', { word: word.word });
      if (normText(text).split(' ').length < 4) fail(400, 'too_short', { field: 'text', min: 4 });
      extra = { word: word.word };
    } else fail(400, 'not_open_task');
    return db.tx(() => {
      const resp = saveResponse(db, user, { bookId: t.book_id, taskId: t.id, kind, text, extra });
      const journey = computeJourney(db, user.id, t.book_id);
      const rewards = checkRewards(db, user.id);
      return {
        response: responseView(resp),
        journey,
        new_rewards: rewards,
        stage_up: journey.done_count > before.done_count ? journey.done_count : null,
        next: nextStep(db, user.id, t.book_id, journey, t.id),
      };
    });
  });

  // Кітап туралы рефлексия
  r.post('/api/books/:id/reflection', ['student'], ({ user, params, body }) => {
    const book = bookOr404(db, user, params.id);
    const sh = getShelf(db, user.id, book.id);
    if (!sh || sh.status === 'want') fail(400, 'not_started');
    const text = V.str(body.text, 'text', { min: 30, max: 3000 });
    return db.tx(() => {
      const before = computeJourney(db, user.id, book.id);
      const resp = saveResponse(db, user, { bookId: book.id, taskId: null, kind: 'reflection', text, extra: {} });
      const journey = computeJourney(db, user.id, book.id);
      return {
        response: responseView(resp),
        journey,
        new_rewards: checkRewards(db, user.id),
        stage_up: journey.done_count > before.done_count ? journey.done_count : null,
      };
    });
  });

  r.get('/api/responses', ['student'], ({ user }) => {
    const rows = db.all(
      `SELECT r.*, t.title AS task_title, t.type AS task_type, b.title AS book_title
       FROM responses r LEFT JOIN tasks t ON t.id = r.task_id JOIN books b ON b.id = r.book_id
       WHERE r.user_id = ? ORDER BY r.updated_at DESC`,
      user.id,
    );
    return {
      responses: rows.map((x) => ({
        ...responseView(x), task_id: x.task_id, task_title: x.task_title, task_type: x.task_type,
        book_id: x.book_id, book_title: x.book_title, unseen: !x.seen_feedback,
      })),
    };
  });

  r.post('/api/responses/seen', ['student'], ({ user }) => {
    db.run('UPDATE responses SET seen_feedback = 1 WHERE user_id = ?', user.id);
    return { ok: true };
  });
}
