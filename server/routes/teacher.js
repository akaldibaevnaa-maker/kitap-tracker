// Мұғалім кабинеті. Әр сұраныста сынып/оқушы иелігі серверде тексеріледі.
import crypto from 'node:crypto';
import { hashSecret } from '../auth.js';
import { addDays, fail, localDate, nowIso, parseJson, V, weekStart } from '../lib/util.js';
import { AVATARS, bookOr404, canSeeBook, ownClass, ownStudent, parseStagePages, upsertShelf } from '../lib/access.js';
import { award, DEFAULT_RULES, parseRules, totalXp } from '../lib/xp.js';
import { checkRewards } from '../lib/rewards.js';
import { computeJourney } from '../lib/journey.js';
import { computeStudentTreeStage } from '../lib/progress.js';
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

    const tree = computeStudentTreeStage(db, s.id);
    const compRow = db.get('SELECT ROUND(AVG(percent)) AS avg_score, COUNT(*) AS count FROM comprehension_attempts WHERE user_id = ?', s.id);
    const analysisCount = one('SELECT COUNT(*) FROM comprehension_analyses WHERE user_id = ?', s.id);
    const userRow = db.get('SELECT weekly_days, daily_minutes FROM users WHERE id = ?', s.id);
    const weeklyTarget = userRow?.weekly_days || 3;
    const readingDays7 = one('SELECT COUNT(DISTINCT log_date) FROM reading_logs WHERE user_id = ? AND log_date >= ?', s.id, since);
    const goalPct = Math.min(100, Math.round((readingDays7 / weeklyTarget) * 100));

    return {
      ...s,
      current_book: cur?.title ?? null,
      percent: cur?.total_pages ? Math.round((cur.current_page / cur.total_pages) * 100) : null,
      stage_no: stageNo,
      stage_name: stageName,
      journey_stage: { stage_no: stageNo, stage_name: stageName },
      finished_books: one("SELECT COUNT(*) FROM shelf WHERE user_id = ? AND status = 'finished'", s.id),
      reading_days: one('SELECT COUNT(DISTINCT log_date) FROM reading_logs WHERE user_id = ?', s.id),
      reading_days_7: readingDays7,
      minutes: one('SELECT COALESCE(SUM(minutes),0) FROM reading_logs WHERE user_id = ?', s.id),
      games_done: one('SELECT COUNT(*) FROM task_progress WHERE user_id = ? AND completed = 1', s.id),
      accepted: one("SELECT COUNT(*) FROM responses WHERE user_id = ? AND status = 'accepted'", s.id),
      pending: one("SELECT COUNT(*) FROM responses WHERE user_id = ? AND status = 'pending'", s.id),
      diary_notes: one("SELECT COUNT(*) FROM reading_logs WHERE user_id = ? AND note IS NOT NULL AND length(trim(note)) > 0", s.id) +
                   one("SELECT COUNT(*) FROM diary_entries WHERE user_id = ?", s.id) +
                   one("SELECT COUNT(*) FROM responses WHERE user_id = ? AND kind IN ('reflection', 'open') AND status = 'accepted'", s.id),
      xp: totalXp(db, s.id),
      last_log: db.get('SELECT MAX(log_date) AS d FROM reading_logs WHERE user_id = ?', s.id).d,
      tree_stage: tree,
      tree_stage_no: tree.stage,
      tree_stage_name: tree.name,
      tree_icon: tree.icon,
      comprehension_avg: compRow?.avg_score ?? null,
      comprehension_tests: compRow?.count || 0,
      comprehension_analyses: analysisCount,
      goal_weekly_days: weeklyTarget,
      goal_daily_minutes: userRow?.daily_minutes || 15,
      goal_pct: goalPct,
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

  // ---------- Оқушыларды жеке тіркеу ----------
  r.post('/api/teacher/classes/:id/students', T, ({ user, params, body }) => {
    const c = ownClass(db, user, params.id);
    const nickname = V.str(body.nickname, 'nickname', { min: 2, max: 24 });
    const avatar = AVATARS.includes(body.avatar) ? body.avatar : 'fox';
    let pin = String(body.pin || '').trim();
    if (pin && !/^\d{4}$/.test(pin)) fail(400, 'invalid_input', { field: 'pin' });
    if (!pin) {
      pin = String(crypto.randomInt(1000, 10000));
    }
    const taken = db.get(
      'SELECT 1 AS x FROM users u JOIN class_members m ON m.user_id = u.id WHERE m.class_id = ? AND lower(u.nickname) = lower(?)',
      c.id, nickname
    );
    if (taken) fail(409, 'nickname_taken');

    const id = db.tx(() => {
      const uid = db.run(
        `INSERT INTO users(role, nickname, secret_hash, avatar, onboarded, created_at) VALUES ('student', ?, ?, ?, 1, ?)`,
        nickname, hashSecret(pin), avatar, nowIso()
      ).lastInsertRowid;
      db.run('INSERT INTO class_members(class_id, user_id, joined_at) VALUES (?, ?, ?)', c.id, uid, nowIso());
      db.run("INSERT INTO user_rewards(user_id, reward_id, earned_at) VALUES (?, 'scene_steppe', ?)", uid, nowIso());
      return uid;
    });

    return {
      student: {
        id,
        nickname,
        avatar,
        pin,
        class_id: c.id,
        class_name: c.name,
        invite_code: c.invite_code,
      }
    };
  });

  // ---------- Excel / CSV / Тізім арқылы оқушыларды жаппай импорттау ----------
  r.post('/api/teacher/classes/:id/import-students', T, ({ user, params, body }) => {
    const c = ownClass(db, user, params.id);
    let rows = [];
    if (Array.isArray(body.students)) {
      rows = body.students;
    } else if (typeof body.text === 'string') {
      const lines = body.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        // Тізім элементін талдау: "1. Ахметов Әли; 1234" немесе "Серік Айдос, 5678" немесе "Қасымова Әмина"
        const parts = line.split(/[;,\t]/).map((p) => p.trim());
        let rawName = parts[0];
        rawName = rawName.replace(/^\d+[\.\)]\s*/, '').trim();
        if (!rawName) continue;
        const pin = parts[1] && /^\d{4}$/.test(parts[1]) ? parts[1] : null;
        rows.push({ nickname: rawName, pin });
      }
    }

    if (!rows.length) fail(400, 'no_students_provided');

    const imported = [];
    const skipped = [];
    const avatarsList = ['fox', 'owl', 'bear', 'cat', 'wolf', 'lion', 'eagle', 'hare'];

    db.tx(() => {
      for (let i = 0; i < rows.length; i++) {
        const rItem = rows[i];
        const nickname = String(rItem.nickname || '').trim().slice(0, 24);
        if (nickname.length < 2) {
          skipped.push({ nickname, reason: 'too_short' });
          continue;
        }
        const existing = db.get(
          'SELECT 1 AS x FROM users u JOIN class_members m ON m.user_id = u.id WHERE m.class_id = ? AND lower(u.nickname) = lower(?)',
          c.id, nickname
        );
        if (existing) {
          skipped.push({ nickname, reason: 'nickname_taken' });
          continue;
        }
        const pin = rItem.pin && /^\d{4}$/.test(rItem.pin) ? rItem.pin : String(crypto.randomInt(1000, 10000));
        const avatar = avatarsList[i % avatarsList.length];
        const uid = db.run(
          `INSERT INTO users(role, nickname, secret_hash, avatar, onboarded, created_at) VALUES ('student', ?, ?, ?, 1, ?)`,
          nickname, hashSecret(pin), avatar, nowIso()
        ).lastInsertRowid;
        db.run('INSERT INTO class_members(class_id, user_id, joined_at) VALUES (?, ?, ?)', c.id, uid, nowIso());
        db.run("INSERT INTO user_rewards(user_id, reward_id, earned_at) VALUES (?, 'scene_steppe', ?)", uid, nowIso());
        imported.push({ id: uid, nickname, pin, avatar });
      }
    });

    return {
      imported,
      count: imported.length,
      skipped,
      class_id: c.id,
      class_name: c.name,
      invite_code: c.invite_code,
    };
  });

  // ---------- Оқушының жеке оқу портфолиосы ----------
  r.get('/api/teacher/students/:id/portfolio', T, ({ user, params }) => {
    const s = ownStudent(db, user, params.id);
    const cls = db.get('SELECT c.* FROM classes c JOIN class_members m ON m.class_id = c.id WHERE m.user_id = ?', s.id);
    const tree = computeStudentTreeStage(db, s.id);
    const xp = totalXp(db, s.id);

    const shelfBooks = db.all(`
      SELECT b.id, b.title, b.author, b.cover_color, b.cover_emoji, b.genre,
             sh.status, sh.current_page, COALESCE(sh.total_pages, b.total_pages, 100) AS total_pages,
             sh.goal_text, sh.started_at, sh.finished_at,
             ROUND(100.0 * sh.current_page / NULLIF(COALESCE(sh.total_pages, b.total_pages, 100), 0)) AS percent
      FROM shelf sh JOIN books b ON b.id = sh.book_id
      WHERE sh.user_id = ? ORDER BY sh.updated_at DESC
    `, s.id);

    const totalMinutes = db.get('SELECT COALESCE(SUM(minutes), 0) AS m FROM reading_logs WHERE user_id = ?', s.id)?.m || 0;
    const readingDays = db.get('SELECT COUNT(DISTINCT log_date) AS d FROM reading_logs WHERE user_id = ?', s.id)?.d || 0;
    const since7 = addDays(localDate(), -6);
    const days7 = db.get('SELECT COUNT(DISTINCT log_date) AS d FROM reading_logs WHERE user_id = ? AND log_date >= ?', s.id, since7)?.d || 0;

    const comprehensionAttempts = db.all(`
      SELECT a.id, a.book_id, b.title AS book_title, a.score, a.total, a.total AS total_questions, a.percent,
             (a.percent >= 60) AS passed, a.created_at
      FROM comprehension_attempts a JOIN books b ON b.id = a.book_id
      WHERE a.user_id = ? ORDER BY a.created_at DESC
    `, s.id);
    const compAvg = comprehensionAttempts.length
      ? Math.round(comprehensionAttempts.reduce((acc, row) => acc + (row.percent || 0), 0) / comprehensionAttempts.length)
      : null;

    const analyses = db.all(`
      SELECT a.id, a.book_id, b.title AS book_title, a.analysis_type, a.analysis_type AS analysis_kind,
             a.title, a.content AS text, a.status, a.feedback, a.score, a.created_at, a.reviewed_at
      FROM comprehension_analyses a JOIN books b ON b.id = a.book_id
      WHERE a.user_id = ? ORDER BY a.created_at DESC
    `, s.id);

    const recentLogs = db.all(`
      SELECT l.id, l.book_id, b.title AS book_title, l.page, l.minutes, l.note, l.log_date, l.created_at
      FROM reading_logs l JOIN books b ON b.id = l.book_id
      WHERE l.user_id = ? ORDER BY l.log_date DESC, l.created_at DESC LIMIT 15
    `, s.id);

    const teacherFeedbacks = db.all(`
      SELECT f.id, f.message, f.created_at, f.seen, u.nickname AS teacher_name
      FROM teacher_student_feedback f JOIN users u ON u.id = f.teacher_id
      WHERE f.student_id = ? ORDER BY f.created_at DESC
    `, s.id);

    const weeklyTargetDays = s.weekly_days || 3;
    const goalAchievementPct = Math.min(100, Math.round((days7 / weeklyTargetDays) * 100));

    return {
      student: {
        id: s.id,
        nickname: s.nickname,
        avatar: s.avatar,
        class_id: cls?.id || null,
        class_name: cls?.name || null,
        invite_code: cls?.invite_code || null,
        created_at: s.created_at,
        daily_minutes: s.daily_minutes || 15,
        weekly_days: weeklyTargetDays,
      },
      metrics: {
        xp,
        finished_books: tree.finished_books,
        total_pages: tree.total_pages,
        total_minutes: totalMinutes,
        reading_days: readingDays,
        reading_days_7: days7,
        goal_achievement_pct: goalAchievementPct,
        comprehension_avg: compAvg,
        comprehension_tests_count: comprehensionAttempts.length,
        comprehension_analyses_count: analyses.length,
      },
      tree_stage: tree,
      shelf: shelfBooks,
      comprehension_attempts: comprehensionAttempts,
      comprehension_analyses: analyses,
      recent_logs: recentLogs,
      feedbacks: teacherFeedbacks,
    };
  });

  // ---------- Оқушыға жеке педагогикалық кері байланыс беру ----------
  r.post('/api/teacher/students/:id/feedback', T, ({ user, params, body }) => {
    const s = ownStudent(db, user, params.id);
    const message = V.str(body.message, 'message', { min: 2, max: 1500 });
    const cls = db.get('SELECT class_id FROM class_members WHERE user_id = ?', s.id);
    const fid = db.run(
      'INSERT INTO teacher_student_feedback(teacher_id, student_id, class_id, message, seen, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      user.id, s.id, cls?.class_id || null, message, nowIso()
    ).lastInsertRowid;
    return { ok: true, id: fid, message, created_at: nowIso() };
  });

  // ---------- Оқу белсенділігі төмендеген (At-Risk) оқушыларды анықтау ----------
  r.get('/api/teacher/classes/:id/at-risk', T, ({ user, params }) => {
    const c = ownClass(db, user, params.id);
    const students = members(db, c.id);
    const today = localDate();
    const since7 = addDays(today, -6);

    const atRiskList = [];
    for (const s of students) {
      const lastLog = db.get('SELECT MAX(log_date) AS d FROM reading_logs WHERE user_id = ?', s.id)?.d;
      const days7 = db.get('SELECT COUNT(DISTINCT log_date) AS c FROM reading_logs WHERE user_id = ? AND log_date >= ?', s.id, since7)?.c || 0;
      const userRow = db.get('SELECT weekly_days FROM users WHERE id = ?', s.id);
      const targetDays = userRow?.weekly_days || 3;
      const goalPct = Math.round((days7 / targetDays) * 100);

      const compRow = db.get('SELECT AVG(percent) AS avg_score FROM comprehension_attempts WHERE user_id = ?', s.id);
      const compAvg = compRow?.avg_score != null ? Math.round(compRow.avg_score) : null;

      const reasons = [];
      const reasonsKk = [];

      if (!lastLog) {
        reasons.push('never_read');
        reasonsKk.push('Әлі бірде-бір рет кітап оқылымын тіркемеген');
      } else {
        const daysSince = Math.round((new Date(today) - new Date(lastLog)) / (1000 * 60 * 60 * 24));
        if (daysSince >= 7) {
          reasons.push('inactive_7d');
          reasonsKk.push(`Соңғы ${daysSince} күн бойы оқылым тіркемеген (соңғы оқылымы: ${lastLog})`);
        }
      }

      if (goalPct < 30) {
        reasons.push('low_goal');
        reasonsKk.push(`Апталық оқу мақсаты ${goalPct}% ғана орындалған (мақсат: ${targetDays} күн, оқығаны: ${days7} күн)`);
      }

      if (compAvg !== null && compAvg < 50) {
        reasons.push('low_comprehension');
        reasonsKk.push(`Кітапты түсіну тесттерінің орташа көрсеткіші төмен: ${compAvg}%`);
      }

      if (reasons.length > 0) {
        let recommendation = 'Оқушыға ынталандырушы жеке пікір жазыңыз немесе қызықты жеңіл шығарма ұсыныңыз.';
        if (reasons.includes('low_comprehension')) {
          recommendation = 'Оқушыға мәтіннің негізгі идеясын түсінуге бағытталған қарапайым тапсырма беріңіз.';
        }
        atRiskList.push({
          id: s.id,
          nickname: s.nickname,
          avatar: s.avatar,
          last_log: lastLog || null,
          days_7: days7,
          goal_pct: goalPct,
          comprehension_avg: compAvg,
          reasons,
          reasons_kk: reasonsKk,
          recommendation,
        });
      }
    }

    return {
      class_id: c.id,
      class_name: c.name,
      total_students: students.length,
      at_risk_count: atRiskList.length,
      at_risk_students: atRiskList,
    };
  });

  // ---------- Сыныпта ең көп оқылған кітаптар ----------
  r.get('/api/teacher/classes/:id/popular-books', T, ({ user, params }) => {
    const c = ownClass(db, user, params.id);
    const rows = db.all(`
      SELECT b.id, b.title, b.author, b.genre, b.cover_color, b.cover_emoji,
             COUNT(DISTINCT sh.user_id) AS total_readers,
             SUM(CASE WHEN sh.status = 'reading' THEN 1 ELSE 0 END) AS currently_reading,
             SUM(CASE WHEN sh.status = 'finished' THEN 1 ELSE 0 END) AS finished_count,
             ROUND(AVG(CASE WHEN sh.total_pages > 0 THEN 100.0 * sh.current_page / sh.total_pages END)) AS avg_progress,
             (SELECT ROUND(AVG(a.percent)) FROM comprehension_attempts a WHERE a.book_id = b.id AND a.user_id IN (${IN_CLASS})) AS avg_comprehension_score
      FROM shelf sh
      JOIN books b ON b.id = sh.book_id
      WHERE sh.user_id IN (${IN_CLASS})
      GROUP BY b.id
      ORDER BY total_readers DESC, finished_count DESC
      LIMIT 10
    `, c.id, c.id);
    return { popular_books: rows };
  });

  // ---------- Айлық және тоқсандық академиялық есептер ----------
  r.get('/api/teacher/classes/:id/report', T, ({ user, params, query }) => {
    const c = ownClass(db, user, params.id);
    const period = query.period || 'q2';
    const monthStr = query.month || localDate().slice(0, 7);

    const curDate = new Date();
    const curY = curDate.getFullYear();
    const curM = curDate.getMonth() + 1;
    let startYear = curM >= 8 ? curY : curY - 1;
    let endYear = startYear + 1;

    if (query.year) {
      const qy = Number(query.year);
      if (qy === startYear || qy === endYear) {
        // matches current school year
      } else if (qy < startYear) {
        startYear = qy;
        endYear = qy + 1;
      } else {
        startYear = qy - 1;
        endYear = qy;
      }
    }

    let startDate = `${startYear}-09-01`;
    let endDate = `${endYear}-05-31`;
    let periodTitle = '';

    if (period === 'q1') {
      startDate = `${startYear}-09-01`;
      endDate = `${startYear}-10-31`;
      periodTitle = `1-тоқсан (${startYear} ж. қыркүйек - қазан)`;
    } else if (period === 'q2') {
      startDate = `${startYear}-11-01`;
      endDate = `${startYear}-12-31`;
      periodTitle = `2-тоқсан (${startYear} ж. қараша - желтоқсан)`;
    } else if (period === 'q3') {
      startDate = `${endYear}-01-01`;
      endDate = `${endYear}-03-31`;
      periodTitle = `3-тоқсан (${endYear} ж. қаңтар - наурыз)`;
    } else if (period === 'q4') {
      startDate = `${endYear}-04-01`;
      endDate = `${endYear}-05-31`;
      periodTitle = `4-тоқсан (${endYear} ж. сәуір - мамыр)`;
    } else if (period === 'month') {
      startDate = `${monthStr}-01`;
      endDate = `${monthStr}-31`;
      periodTitle = `${monthStr} айының есебі`;
    } else {
      periodTitle = `${startYear}-${endYear} оқу жылының жылдық есебі`;
    }

    const students = members(db, c.id);
    const inClause = students.length ? students.map((s) => s.id).join(',') : '0';

    const logsAgg = db.get(`
      SELECT COALESCE(SUM(page), 0) AS total_pages,
             COALESCE(SUM(minutes), 0) AS total_minutes,
             COUNT(DISTINCT user_id) AS active_students,
             COUNT(DISTINCT log_date) AS total_reading_days
      FROM reading_logs
      WHERE user_id IN (${inClause}) AND log_date >= ? AND log_date <= ?
    `, startDate, endDate);

    const finishedCount = db.get(`
      SELECT COUNT(*) AS c FROM shelf
      WHERE user_id IN (${inClause}) AND status = 'finished'
        AND finished_at >= ? AND finished_at <= ?
    `, startDate + 'T00:00:00.000Z', endDate + 'T23:59:59.999Z')?.c || 0;

    const compAgg = db.get(`
      SELECT ROUND(AVG(percent)) AS avg_score,
             COUNT(*) AS total_tests
      FROM comprehension_attempts
      WHERE user_id IN (${inClause}) AND created_at >= ? AND created_at <= ?
    `, startDate + 'T00:00:00.000Z', endDate + 'T23:59:59.999Z');

    const studentSummaries = students.map((s) => {
      const sLogs = db.get(`
        SELECT COALESCE(SUM(page), 0) AS pages, COALESCE(SUM(minutes), 0) AS minutes, COUNT(DISTINCT log_date) AS days
        FROM reading_logs WHERE user_id = ? AND log_date >= ? AND log_date <= ?
      `, s.id, startDate, endDate);
      const sFin = db.get(`
        SELECT COUNT(*) AS c FROM shelf WHERE user_id = ? AND status = 'finished' AND finished_at >= ? AND finished_at <= ?
      `, s.id, startDate + 'T00:00:00.000Z', endDate + 'T23:59:59.999Z')?.c || 0;
      const sComp = db.get(`
        SELECT ROUND(AVG(percent)) AS avg_score, COUNT(*) AS count
        FROM comprehension_attempts WHERE user_id = ? AND created_at >= ? AND created_at <= ?
      `, s.id, startDate + 'T00:00:00.000Z', endDate + 'T23:59:59.999Z');
      const tree = computeStudentTreeStage(db, s.id);
      const sXp = totalXp(db, s.id);

      let status = 'Тұрақты оқырман';
      if ((sLogs.pages >= 80 || sFin >= 2) && (sComp?.avg_score || 0) >= 80) status = 'Үздік оқырман 🌟';
      else if (sLogs.days < 3 && sLogs.pages < 20) status = 'Қолдауды қажет етеді ⚠️';

      return {
        id: s.id,
        nickname: s.nickname,
        avatar: s.avatar,
        pages: sLogs.pages,
        minutes: sLogs.minutes,
        reading_days: sLogs.days,
        finished_books: sFin,
        comprehension_avg: sComp?.avg_score ?? null,
        comprehension_tests: sComp?.count || 0,
        tree_stage_no: tree.stage,
        tree_stage_name: tree.name,
        xp: sXp,
        status,
      };
    });

    const treeDistribution = [
      { stage: 1, name: 'Тұқым', count: studentSummaries.filter(s => s.tree_stage_no === 1).length },
      { stage: 2, name: 'Өскін', count: studentSummaries.filter(s => s.tree_stage_no === 2).length },
      { stage: 3, name: 'Жас өркен', count: studentSummaries.filter(s => s.tree_stage_no === 3).length },
      { stage: 4, name: 'Жас ағаш', count: studentSummaries.filter(s => s.tree_stage_no === 4).length },
      { stage: 5, name: 'Жапырақты ағаш', count: studentSummaries.filter(s => s.tree_stage_no === 5).length },
      { stage: 6, name: 'Гүлдеген ағаш', count: studentSummaries.filter(s => s.tree_stage_no === 6).length },
      { stage: 7, name: 'Жемісті ағаш', count: studentSummaries.filter(s => s.tree_stage_no === 7).length },
    ];

    return {
      meta: {
        school: '№290 орта мектеп',
        teacher_name: user.nickname,
        class_name: c.name,
        class_id: c.id,
        period,
        period_title: periodTitle,
        start_date: startDate,
        end_date: endDate,
        academic_year: `${startYear}-${endYear}`,
        generated_at: nowIso(),
      },
      totals: {
        total_students: students.length,
        active_students: logsAgg.active_students,
        total_pages: logsAgg.total_pages,
        total_minutes: logsAgg.total_minutes,
        finished_books: finishedCount,
        avg_pages_per_student: students.length ? Math.round(logsAgg.total_pages / students.length) : 0,
        avg_minutes_per_student: students.length ? Math.round(logsAgg.total_minutes / students.length) : 0,
        comprehension_avg: compAgg?.avg_score ?? null,
        comprehension_tests_count: compAgg?.total_tests || 0,
      },
      tree_distribution: treeDistribution,
      students: studentSummaries,
    };
  });

  // ---------- Сыныптарды өзара салыстыру ----------
  r.get('/api/teacher/classes-comparison', T, ({ user }) => {
    const teacherClasses = db.all('SELECT * FROM classes WHERE teacher_id = ? ORDER BY name ASC', user.id);
    const since7 = addDays(localDate(), -6);

    const comparison = teacherClasses.map((cls) => {
      const studs = members(db, cls.id);
      const inClause = studs.length ? studs.map((s) => s.id).join(',') : '0';

      const totalPages = db.get(`SELECT COALESCE(SUM(page), 0) AS p FROM reading_logs WHERE user_id IN (${inClause})`).p;
      const totalMinutes = db.get(`SELECT COALESCE(SUM(minutes), 0) AS m FROM reading_logs WHERE user_id IN (${inClause})`).m;
      const finishedBooks = db.get(`SELECT COUNT(*) AS c FROM shelf WHERE user_id IN (${inClause}) AND status = 'finished'`).c;
      const active7 = db.get(`SELECT COUNT(DISTINCT user_id) AS c FROM reading_logs WHERE user_id IN (${inClause}) AND log_date >= ?`, since7).c;
      const compAvg = db.get(`SELECT ROUND(AVG(percent)) AS a FROM comprehension_attempts WHERE user_id IN (${inClause})`).a;

      let totalClassXp = 0;
      for (const s of studs) totalClassXp += totalXp(db, s.id);
      const avgXp = studs.length ? Math.round(totalClassXp / studs.length) : 0;

      return {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        invite_code: cls.invite_code,
        total_students: studs.length,
        active_students_7: active7,
        activity_percent_7: studs.length ? Math.round((active7 / studs.length) * 100) : 0,
        total_pages: totalPages,
        avg_pages: studs.length ? Math.round(totalPages / studs.length) : 0,
        total_minutes: totalMinutes,
        finished_books: finishedBooks,
        comprehension_avg: compAvg ?? null,
        avg_xp: avgXp,
      };
    });

    return { classes: comparison };
  });

  // ---------- Шолу: негізгі көрсеткіштер ----------
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
    const tree_distribution_7 = [
      { stage: 1, name: 'Тұқым', icon: '🌱', count: students.filter((s) => s.tree_stage_no === 1).length },
      { stage: 2, name: 'Өскін', icon: '🌿', count: students.filter((s) => s.tree_stage_no === 2).length },
      { stage: 3, name: 'Жас өркен', icon: '🎋', count: students.filter((s) => s.tree_stage_no === 3).length },
      { stage: 4, name: 'Жас ағаш', icon: '🌳', count: students.filter((s) => s.tree_stage_no === 4).length },
      { stage: 5, name: 'Жапырақты ағаш', icon: '🌲', count: students.filter((s) => s.tree_stage_no === 5).length },
      { stage: 6, name: 'Гүлдеген ағаш', icon: '🌸', count: students.filter((s) => s.tree_stage_no === 6).length },
      { stage: 7, name: 'Жемісті ағаш', icon: '🍎', count: students.filter((s) => s.tree_stage_no === 7).length },
    ];
    const at_risk_count = students.filter((s) => !s.last_log || s.goal_pct < 30 || (s.comprehension_avg !== null && s.comprehension_avg < 50)).length;
    return {
      class: { id: c.id, name: c.name, level: c.level, invite_code: c.invite_code, is_demo: !!c.is_demo },
      activity, books, tasks, pending, students, stage_distribution, tree_distribution_7, at_risk_count,
    };
  });

  // Сыныптық Smart Analytics API
  r.get('/api/teacher/classes/:id/analytics', T, ({ user, params }) => {
    const c = ownClass(db, user, params.id);
    const today = localDate();
    const ws = weekStart(today);
    const lastWs = addDays(ws, -7);

    const students = studentRows(db, c.id);
    const memberIds = students.map((s) => s.id);
    if (!memberIds.length) {
      return {
        class_name: c.name,
        total_students: 0,
        this_week: { pages: 0, minutes: 0, days: 0 },
        last_week: { pages: 0, minutes: 0, days: 0 },
        comparison: { delta_pages: 0, is_growth: true },
        daily_bar: [],
        genre_distribution: [],
        top_readers: [],
        recommendations: ['Сыныпқа оқушыларды қосып, оқу саяхатын бастаңыз.']
      };
    }

    const inClause = memberIds.join(',');

    const thisWeek = db.get(`SELECT COALESCE(SUM(page),0) as pages, COALESCE(SUM(minutes),0) as minutes, COUNT(DISTINCT log_date) as days FROM reading_logs WHERE user_id IN (${inClause}) AND log_date >= ?`, ws);
    const lastWeek = db.get(`SELECT COALESCE(SUM(page),0) as pages, COALESCE(SUM(minutes),0) as minutes, COUNT(DISTINCT log_date) as days FROM reading_logs WHERE user_id IN (${inClause}) AND log_date >= ? AND log_date < ?`, lastWs, ws);

    const deltaPages = thisWeek.pages - lastWeek.pages;

    const weekLabels = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'];
    const dailyBar = weekLabels.map((label, idx) => {
      const d = addDays(ws, idx);
      const row = db.get(`SELECT COALESCE(SUM(page),0) as pages, COUNT(DISTINCT user_id) as active_students FROM reading_logs WHERE user_id IN (${inClause}) AND log_date = ?`, d);
      return { date: d, label, pages: row.pages, active_students: row.active_students, isToday: d === today };
    });

    const genres = db.all(`
      SELECT COALESCE(NULLIF(b.genre, ''), 'Басқа') AS genre, COUNT(DISTINCT s.book_id) as books_count, COALESCE(SUM(l.page), 0) as pages
      FROM shelf s JOIN books b ON b.id = s.book_id LEFT JOIN reading_logs l ON l.book_id = b.id AND l.user_id = s.user_id
      WHERE s.user_id IN (${inClause}) GROUP BY genre ORDER BY pages DESC
    `);

    const topReaders = [...students].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);

    const recommendations = [];
    if (thisWeek.pages > lastWeek.pages) {
      recommendations.push(`Сыныптың оқу белсенділігі өткен аптамен салыстырғанда ${deltaPages} бетке артты! Керемет педагогикалық қарқын. 📈`);
    } else if (thisWeek.pages < lastWeek.pages && lastWeek.pages > 0) {
      recommendations.push(`Осы аптадағы оқылым өткен аптадан сәл бәсеңдеді. Оқушыларға қысқа ойын миссиясын беру арқылы қызығушылықты қайта жандандыру ұсынылады. 💡`);
    } else {
      recommendations.push(`Сынып тұрақты қарқынмен оқып келеді. Ортақ «Білім бағы» миссиясын толықтыруға назар аударыңыз. 🌳`);
    }

    return {
      class_name: c.name,
      total_students: students.length,
      this_week: thisWeek,
      last_week: lastWeek,
      comparison: { delta_pages: deltaPages, is_growth: deltaPages >= 0 },
      daily_bar: dailyBar,
      genre_distribution: genres,
      top_readers: topReaders,
      recommendations
    };
  });

  r.get('/api/teacher/classes/:id/export.csv', T, ({ user, params, res }) => {
    const c = ownClass(db, user, params.id);
    const rows = studentRows(db, c.id);
    const head = ['Бүркеншік ат', 'Оқып жатқан кітап', 'Прогресс, %', 'Кітап ағашының сатысы', 'Түсіну нәтижесі, %', 'Оқу мақсаты, %', 'Аяқталған кітаптар', 'Оқу күндері (барлығы)', 'Оқу күндері (7 күн)', 'Белгіленген минут', 'Орындалған ойындар', 'Қабылданған жауаптар', 'Тексеруді күтетін', 'Күнделік жазбалары', 'XP (баға емес)', 'Соңғы жазба'];
    const lines = [head, ...rows.map((s) => [s.nickname, s.current_book, s.percent, s.tree_stage_name || s.stage_name, s.comprehension_avg ?? '-', s.goal_pct + '%', s.finished_books, s.reading_days, s.reading_days_7, s.minutes, s.games_done, s.accepted, s.pending, s.diary_notes, s.xp, s.last_log])];
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
      const extra = parseJson(resp.extra, {});
      if (extra.comprehension_analysis_id) {
        db.run(
          'UPDATE comprehension_analyses SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = ?, seen_feedback = 0 WHERE id = ?',
          decision === 'accept' ? 'accepted' : 'returned', feedback, user.id, nowIso(), extra.comprehension_analysis_id
        );
      }
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
