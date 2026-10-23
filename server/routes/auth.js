// Кіру, тіркелу, профиль.
import { hashSecret, verifySecret, startSession, endSession } from '../auth.js';
import { fail, nowIso, V } from '../lib/util.js';
import { AVATARS, bookOr404, upsertShelf } from '../lib/access.js';
import { classOf, parseRules, totalXp } from '../lib/xp.js';
import { REWARD_IDS, rewardInfo } from '../lib/rewards.js';

const NICK_RE = /^[\p{L}\p{N} _.-]{2,24}$/u;

export function meView(db, u) {
  if (!u) return null;
  const base = {
    id: u.id,
    role: u.role,
    nickname: u.nickname,
    avatar: u.avatar,
    decor: u.decor,
    scene: u.scene,
    lang: u.lang,
    is_demo: !!u.is_demo,
  };
  if (u.role === 'student') {
    const c = classOf(db, u.id);
    return {
      ...base,
      onboarded: !!u.onboarded,
      tips_seen: !!u.tips_seen,
      daily_minutes: u.daily_minutes,
      weekly_days: u.weekly_days,
      xp: totalXp(db, u.id),
      class: c ? { id: c.id, name: c.name, level: c.level, is_demo: !!c.is_demo, rules: parseRules(c.xp_rules) } : null,
      unseen_feedback: db.get('SELECT COUNT(*) AS n FROM responses WHERE user_id = ? AND seen_feedback = 0', u.id).n,
    };
  }
  if (u.role === 'teacher') {
    return {
      ...base,
      login: u.login,
      classes: db.all('SELECT id, name, level, invite_code FROM classes WHERE teacher_id = ? ORDER BY id', u.id),
    };
  }
  return { ...base, login: u.login };
}

function findClassByCode(db, code) {
  const c = db.get('SELECT * FROM classes WHERE invite_code = ?', String(code || '').trim().toUpperCase());
  if (!c) fail(404, 'class_not_found');
  return c;
}

export default function register(r, db) {
  r.get('/api/me', null, ({ user }) => ({ user: meView(db, user) }));

  r.post('/api/auth/demo', null, ({ body, res }) => {
    const role = V.oneOf(body.role, 'role', ['student', 'teacher', 'admin']);
    const u =
      role === 'student'
        ? db.get("SELECT u.* FROM users u JOIN class_members m ON m.user_id = u.id JOIN classes c ON c.id = m.class_id WHERE (u.nickname = 'Құлахметова Аягөз' OR u.nickname = 'Айсұлу') AND c.invite_code = 'DEMO25' ORDER BY (u.nickname = 'Құлахметова Аягөз') DESC LIMIT 1")
        : db.get('SELECT * FROM users WHERE (login = ? OR login = ?) ORDER BY id LIMIT 1', role === 'teacher' ? 'demo.mugalim' : 'admin', role === 'teacher' ? 'mugalim' : 'admin');
    if (!u) fail(404, 'demo_missing');
    startSession(db, res, u.id);
    return { user: meView(db, u) };
  });

  r.post('/api/auth/student/register', null, ({ body, res }) => {
    const nickname = V.str(body.nickname, 'nickname', { min: 2, max: 24 });
    if (!NICK_RE.test(nickname)) fail(400, 'invalid_input', { field: 'nickname' });
    const avatar = V.oneOf(body.avatar, 'avatar', AVATARS);
    const pin = String(body.pin || '');
    if (!/^\d{4}$/.test(pin)) fail(400, 'invalid_input', { field: 'pin' });
    const cls = body.demo ? findClassByCode(db, 'DEMO25') : findClassByCode(db, body.classCode);
    const taken = db.get(
      'SELECT 1 AS x FROM users u JOIN class_members m ON m.user_id = u.id WHERE m.class_id = ? AND lower(u.nickname) = lower(?)',
      cls.id, nickname,
    );
    if (taken) fail(409, 'nickname_taken');
    const id = db.tx(() => {
      const uid = db.run(
        `INSERT INTO users(role, nickname, secret_hash, avatar, onboarded, is_demo, created_at) VALUES ('student',?,?,?,0,?,?)`,
        nickname, hashSecret(pin), avatar, body.demo ? 1 : 0, nowIso(),
      ).lastInsertRowid;
      db.run('INSERT INTO class_members(class_id, user_id, joined_at) VALUES (?,?,?)', cls.id, uid, nowIso());
      db.run("INSERT INTO user_rewards(user_id, reward_id, earned_at) VALUES (?, 'scene_steppe', ?)", uid, nowIso());
      return uid;
    });
    startSession(db, res, id);
    return { user: meView(db, db.get('SELECT * FROM users WHERE id = ?', id)) };
  });

  r.post('/api/auth/student/login', null, ({ body, res }) => {
    const cls = db.get('SELECT * FROM classes WHERE invite_code = ?', String(body.classCode || '').trim().toUpperCase());
    const u = cls
      ? db.get(
          'SELECT u.* FROM users u JOIN class_members m ON m.user_id = u.id WHERE m.class_id = ? AND lower(u.nickname) = lower(?)',
          cls.id, String(body.nickname || '').trim(),
        )
      : null;
    if (!u || !verifySecret(String(body.pin || ''), u.secret_hash)) fail(401, 'invalid_credentials');
    startSession(db, res, u.id);
    return { user: meView(db, u) };
  });

  r.post('/api/auth/teacher/register', null, ({ body, res }) => {
    const name = V.str(body.name, 'name', { min: 2, max: 60 });
    const login = V.str(body.login, 'login', { min: 3, max: 32 }).toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(login)) fail(400, 'invalid_input', { field: 'login' });
    const password = String(body.password || '');
    if (password.length < 8) fail(400, 'too_short', { field: 'password', min: 8 });
    if (db.get('SELECT 1 AS x FROM users WHERE login = ?', login)) fail(409, 'login_taken');
    const id = db.run(
      `INSERT INTO users(role, nickname, login, secret_hash, avatar, onboarded, created_at) VALUES ('teacher',?,?,?,'owl',1,?)`,
      name, login, hashSecret(password), nowIso(),
    ).lastInsertRowid;
    startSession(db, res, id);
    return { user: meView(db, db.get('SELECT * FROM users WHERE id = ?', id)) };
  });

  r.post('/api/auth/login', null, ({ body, res }) => {
    const u = db.get("SELECT * FROM users WHERE login = ? AND role IN ('teacher','admin')", String(body.login || '').trim().toLowerCase());
    if (!u || !verifySecret(String(body.password || ''), u.secret_hash)) fail(401, 'invalid_credentials');
    startSession(db, res, u.id);
    return { user: meView(db, u) };
  });

  r.post('/api/auth/logout', null, ({ req, res }) => {
    endSession(db, req, res);
    return { ok: true };
  });

  r.patch('/api/me', 'any', ({ body, user }) => {
    const sets = [];
    const vals = [];
    if (body.lang !== undefined) { sets.push('lang = ?'); vals.push(V.oneOf(body.lang, 'lang', ['kk', 'ru'])); }
    if (body.avatar !== undefined) { sets.push('avatar = ?'); vals.push(V.oneOf(body.avatar, 'avatar', AVATARS)); }
    for (const [field, type] of [['decor', 'decor'], ['scene', 'scene']]) {
      if (body[field] === undefined) continue;
      const v = body[field];
      if (v === null && field === 'decor') { sets.push('decor = NULL'); continue; }
      if (!REWARD_IDS.has(v) || rewardInfo(v).type !== type) fail(400, 'invalid_input', { field });
      if (!db.get('SELECT 1 AS x FROM user_rewards WHERE user_id = ? AND reward_id = ?', user.id, v)) fail(403, 'reward_locked');
      sets.push(`${field} = ?`);
      vals.push(v);
    }
    if (sets.length) db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...vals, user.id);
    return { user: meView(db, db.get('SELECT * FROM users WHERE id = ?', user.id)) };
  });

  r.post('/api/me/tips-seen', ['student'], ({ user }) => {
    db.run('UPDATE users SET tips_seen = 1 WHERE id = ?', user.id);
    return { ok: true };
  });

  // Алғашқы кірудің 3-қадамы: кітап таңдау және шағын мақсат
  r.post('/api/me/onboarding', ['student'], ({ body, user }) => {
    const book = bookOr404(db, user, body.bookId);
    const goalText = V.str(body.goalText, 'goalText', { min: 2, max: 160 });
    const dailyMinutes = V.int(body.dailyMinutes ?? 10, 'dailyMinutes', { min: 5, max: 60 });
    const weeklyDays = V.int(body.weeklyDays ?? 3, 'weeklyDays', { min: 1, max: 7 });
    db.tx(() => {
      upsertShelf(db, user.id, book, { status: 'reading', totalPages: body.totalPages, goalText });
      db.run('UPDATE users SET onboarded = 1, daily_minutes = ?, weekly_days = ? WHERE id = ?', dailyMinutes, weeklyDays, user.id);
    });
    return { user: meView(db, db.get('SELECT * FROM users WHERE id = ?', user.id)) };
  });

  r.patch('/api/goal', ['student'], ({ body, user }) => {
    const dailyMinutes = V.int(body.dailyMinutes, 'dailyMinutes', { min: 5, max: 60 });
    const weeklyDays = V.int(body.weeklyDays, 'weeklyDays', { min: 1, max: 7 });
    db.run('UPDATE users SET daily_minutes = ?, weekly_days = ? WHERE id = ?', dailyMinutes, weeklyDays, user.id);
    return { ok: true, daily_minutes: dailyMinutes, weekly_days: weeklyDays };
  });
}
