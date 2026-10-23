// Дерекқор: Node.js кірістірілген SQLite (node:sqlite). Сыртқы тәуелділік жоқ.
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),
  nickname TEXT NOT NULL,
  login TEXT UNIQUE,
  secret_hash TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'fox',
  decor TEXT,
  scene TEXT NOT NULL DEFAULT 'scene_steppe',
  lang TEXT NOT NULL DEFAULT 'kk',
  onboarded INTEGER NOT NULL DEFAULT 0,
  tips_seen INTEGER NOT NULL DEFAULT 0,
  daily_minutes INTEGER NOT NULL DEFAULT 10,
  weekly_days INTEGER NOT NULL DEFAULT 3,
  crystals INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS classes(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL DEFAULT 'junior' CHECK(level IN ('junior','senior')),
  xp_rules TEXT NOT NULL DEFAULT '{}',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS class_members(
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL,
  PRIMARY KEY(class_id, user_id)
);
CREATE TABLE IF NOT EXISTS books(
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'kk',
  genre TEXT NOT NULL DEFAULT '',
  interests TEXT NOT NULL DEFAULT '',
  grade_min INTEGER NOT NULL DEFAULT 1,
  grade_max INTEGER NOT NULL DEFAULT 11,
  total_pages INTEGER,
  stage_pages TEXT,
  cover_color TEXT NOT NULL DEFAULT '#2e7d5b',
  cover_emoji TEXT NOT NULL DEFAULT '📘',
  is_demo INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','class','private')),
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chapters(
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  UNIQUE(book_id, idx)
);
CREATE TABLE IF NOT EXISTS shelf(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('want','reading','finished')),
  total_pages INTEGER,
  stage_pages TEXT,
  current_page INTEGER NOT NULL DEFAULT 0,
  goal_text TEXT,
  goal_set INTEGER NOT NULL DEFAULT 0,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  started_at TEXT,
  finished_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, book_id)
);
CREATE TABLE IF NOT EXISTS reading_logs(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  minutes INTEGER,
  note TEXT,
  log_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_logs_user_book ON reading_logs(user_id, book_id);
CREATE INDEX IF NOT EXISTS ix_logs_date ON reading_logs(log_date);
CREATE TABLE IF NOT EXISTS tasks(
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  stage_no INTEGER NOT NULL DEFAULT 2,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  example TEXT NOT NULL DEFAULT '',
  source_excerpt TEXT NOT NULL DEFAULT '',
  source_chapter INTEGER,
  spec TEXT NOT NULL DEFAULT '{}',
  payload TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '{}',
  hints TEXT NOT NULL DEFAULT '[]',
  explanation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts(
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  correct INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS task_progress(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tries INTEGER NOT NULL DEFAULT 0,
  wrong_streak INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY(user_id, task_id)
);
CREATE TABLE IF NOT EXISTS responses(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('open','reflection','sentence')),
  text TEXT NOT NULL,
  extra TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','returned')),
  feedback TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  seen_feedback INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_resp_task ON responses(user_id, task_id) WHERE task_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_resp_reflection ON responses(user_id, book_id) WHERE kind = 'reflection';
CREATE TABLE IF NOT EXISTS xp_events(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, kind, ref)
);
CREATE TABLE IF NOT EXISTS user_rewards(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  PRIMARY KEY(user_id, reward_id)
);
CREATE TABLE IF NOT EXISTS missions(
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metric TEXT NOT NULL CHECK(metric IN ('reflections','reading_days','distinct_books')),
  target INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS diary_entries(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('quote','audio','reflection','note')),
  text TEXT NOT NULL,
  extra TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS character_quizzes(
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  character_avatar TEXT NOT NULL DEFAULT '🦊',
  character_intro TEXT NOT NULL,
  questions TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 15,
  crystals_reward INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quiz_attempts(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER NOT NULL REFERENCES character_quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  crystals_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, quiz_id)
);
`;

export function openDb(file) {
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') raw.exec('PRAGMA journal_mode = WAL;');
  raw.exec(SCHEMA);
  try { raw.exec('ALTER TABLE users ADD COLUMN crystals INTEGER NOT NULL DEFAULT 0;'); } catch {}
  return wrap(raw);
}

function wrap(raw) {
  const cache = new Map();
  const st = (sql) => {
    let s = cache.get(sql);
    if (!s) { s = raw.prepare(sql); cache.set(sql, s); }
    return s;
  };
  const clean = (p) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
  let depth = 0;
  return {
    raw,
    all: (sql, ...p) => st(sql).all(...clean(p)),
    get: (sql, ...p) => st(sql).get(...clean(p)),
    run: (sql, ...p) => st(sql).run(...clean(p)),
    exec: (sql) => raw.exec(sql),
    tx(fn) {
      if (depth > 0) return fn();
      depth++;
      raw.exec('BEGIN');
      try {
        const r = fn();
        raw.exec('COMMIT');
        return r;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
    close: () => raw.close(),
  };
}
