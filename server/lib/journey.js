// Саяхат картасы: 5 кезең. Әр кезең нақты оқу жазбасы мен тапсырма нәтижесі арқылы ашылады.
import { getShelf, stagePagesFor } from './progress.js';
import { visibleTasks, doneTaskIds } from './tasks.js';

export const STAGES = ['gate', 'characters', 'events', 'treasure', 'summit'];

export function computeJourney(db, userId, bookId) {
  const sh = getShelf(db, userId, bookId);
  if (!sh) return null;
  const book = db.get('SELECT * FROM books WHERE id = ?', bookId);
  const sp = stagePagesFor(db, sh, book);
  const page = sh.current_page;
  const total = sh.total_pages;
  const logs = db.get(
    `SELECT COUNT(*) AS n,
            COALESCE(SUM(CASE WHEN note IS NOT NULL AND length(trim(note)) > 0 THEN 1 ELSE 0 END), 0) AS notes
     FROM reading_logs WHERE user_id = ? AND book_id = ?`,
    userId, bookId,
  );
  const tasks = visibleTasks(db, userId, bookId);
  const done = doneTaskIds(db, userId);
  const reflection = db.get(
    "SELECT status FROM responses WHERE user_id = ? AND book_id = ? AND kind = 'reflection'",
    userId, bookId,
  );

  const stages = [];
  stages.push({
    no: 1,
    key: STAGES[0],
    reqs: [
      { key: 'goal', done: !!sh.goal_set },
      { key: 'first_log', done: logs.n > 0 },
    ],
  });
  for (let n = 2; n <= 4; n++) {
    const reqs = [];
    const th = sp[n - 2];
    if (th) reqs.push({ key: 'page', params: { page: th }, done: page >= th });
    const st = tasks.filter((t) => t.stage_no === n);
    if (st.length) {
      reqs.push({ key: 'task', params: { total: st.length, done: st.filter((t) => done.has(t.id)).length }, done: st.some((t) => done.has(t.id)) });
    } else if (n === 2) reqs.push({ key: 'note1', done: logs.notes >= 1 });
    else if (n === 3) reqs.push({ key: 'note2', done: logs.notes >= 2 });
    else reqs.push({ key: 'reflection_sent', done: !!reflection });
    stages.push({ no: n, key: STAGES[n - 1], threshold: th || null, reqs });
  }
  stages.push({
    no: 5,
    key: STAGES[4],
    threshold: total || null,
    reqs: [
      { key: 'finish', params: { total }, done: sh.status === 'finished' },
      { key: 'reflection_sent', done: !!reflection },
    ],
  });

  let prevDone = true;
  for (const s of stages) {
    const all = s.reqs.every((r) => r.done);
    s.done = prevDone && all;
    s.status = s.done ? 'done' : prevDone ? 'current' : 'locked';
    prevDone = s.done;
  }
  const doneCount = stages.filter((s) => s.done).length;
  const current = stages.find((s) => s.status === 'current')?.no ?? 6;

  // Тапсырмалардың ашылуы: алдыңғы кезең аяқталып, осы кезеңнің беті оқылғанда
  const thresholdOf = (n) => (n >= 2 && n <= 4 ? sp[n - 2] : n === 5 ? total : null);
  const taskStates = tasks.map((t) => {
    const n = t.stage_no;
    const prevOk = n <= 1 || stages[n - 2].done;
    const th = thresholdOf(n);
    const pageOk = !th || page >= th;
    return {
      id: t.id,
      stage_no: n,
      unlocked: prevOk && pageOk,
      done: done.has(t.id),
      lock: !prevOk ? { reason: 'stage', stage: n - 1 } : !pageOk ? { reason: 'page', page: th } : null,
    };
  });

  return { book_id: bookId, page, total, stage_pages: sp, stages, current, done_count: doneCount, tasks: taskStates };
}
