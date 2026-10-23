// Рұқсаттарды тексеру және сөреге қатысты ортақ әрекеттер.
import { fail, nowIso, V } from './util.js';
import { getShelf, maxLoggedPage, recompute } from './progress.js';

export const AVATARS = ['fox', 'owl', 'bear', 'wolf', 'horse', 'eagle', 'camel', 'turtle', 'cat', 'panda'];

export function canSeeBook(db, user, book) {
  if (!book) return false;
  if (book.visibility === 'public') return true;
  if (book.visibility === 'private') return book.owner_id === user.id;
  if (user.role === 'admin') return true;
  if (user.role === 'teacher') return !!db.get('SELECT 1 AS x FROM classes WHERE id = ? AND teacher_id = ?', book.class_id, user.id);
  return !!db.get('SELECT 1 AS x FROM class_members WHERE class_id = ? AND user_id = ?', book.class_id, user.id);
}

export function bookOr404(db, user, id) {
  const book = db.get('SELECT * FROM books WHERE id = ?', Number(id));
  if (!canSeeBook(db, user, book)) fail(404, 'not_found');
  return book;
}

export function ownClass(db, teacher, classId) {
  const c = db.get('SELECT * FROM classes WHERE id = ?', Number(classId));
  if (!c) fail(404, 'not_found');
  if (c.teacher_id !== teacher.id) fail(403, 'forbidden');
  return c;
}

/** Мұғалімнің сыныбындағы оқушы ма? */
export function ownStudent(db, teacher, studentId) {
  const row = db.get(
    `SELECT u.*, c.id AS class_id FROM users u
       JOIN class_members m ON m.user_id = u.id
       JOIN classes c ON c.id = m.class_id
     WHERE u.id = ? AND u.role = 'student' AND c.teacher_id = ?`,
    Number(studentId), teacher.id,
  );
  if (!row) fail(403, 'forbidden');
  return row;
}

export function parseStagePages(v, total) {
  if (v == null) return null;
  if (!Array.isArray(v) || v.length !== 3) fail(400, 'invalid_input', { field: 'stagePages' });
  const arr = v.map((x) => (x === null || x === '' ? null : Number(x)));
  let prev = 0;
  for (const x of arr) {
    if (x === null) continue;
    if (!Number.isInteger(x) || x <= prev || (total && x >= total)) fail(400, 'stage_pages_invalid');
    prev = x;
  }
  return arr.every((x) => x === null) ? null : arr;
}

/**
 * Саяхатты бастау / сөрені жаңарту. Жалпы бет санын каталогта болмаса — оқушы өз басылымы бойынша енгізеді.
 */
export function upsertShelf(db, userId, book, { status, totalPages, stagePages, goalText, assignedBy } = {}) {
  const existing = getShelf(db, userId, book.id);
  let total = book.total_pages ?? existing?.total_pages ?? null;
  if (!book.total_pages && totalPages != null) {
    total = V.int(totalPages, 'totalPages', { min: 1, max: 5000 });
    const maxP = maxLoggedPage(db, userId, book.id);
    if (maxP > total) fail(400, 'pages_below_logs', { max: maxP });
  }
  if (status === 'reading' && !total) fail(400, 'need_total_pages');
  const sp = stagePages !== undefined ? parseStagePages(stagePages, total) : undefined;
  const goal = goalText !== undefined ? V.str(goalText, 'goalText', { max: 160, required: false }) : undefined;
  const now = nowIso();
  if (!existing) {
    db.run(
      `INSERT INTO shelf(user_id, book_id, status, total_pages, stage_pages, current_page, goal_text, goal_set, assigned_by, started_at, updated_at)
       VALUES (?,?,?,?,?,0,?,?,?,?,?)`,
      userId, book.id, status || 'want', total, sp ? JSON.stringify(sp) : null, goal ?? null, goal ? 1 : 0,
      assignedBy ?? null, status === 'reading' ? now : null, now,
    );
  } else {
    let st = existing.status;
    if (status === 'reading' && st === 'want') st = 'reading';
    if (status === 'want' && st === 'reading' && existing.current_page === 0) st = 'want';
    db.run(
      `UPDATE shelf SET status = ?, total_pages = ?, stage_pages = ?, goal_text = ?, goal_set = ?, assigned_by = ?, updated_at = ?
       WHERE user_id = ? AND book_id = ?`,
      st, total,
      sp === undefined ? existing.stage_pages : sp ? JSON.stringify(sp) : null,
      goal === undefined ? existing.goal_text : goal,
      goal === undefined ? existing.goal_set : goal ? 1 : existing.goal_set,
      assignedBy ?? existing.assigned_by, now, userId, book.id,
    );
  }
  return recompute(db, userId, book.id);
}
