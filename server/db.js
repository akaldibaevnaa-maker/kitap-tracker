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
CREATE TABLE IF NOT EXISTS tree_stages_config(
  stage INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🌱',
  min_books INTEGER NOT NULL DEFAULT 0,
  min_pages INTEGER NOT NULL DEFAULT 0,
  min_xp INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comprehension_tests(
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  questions TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 25,
  crystals_reward INTEGER NOT NULL DEFAULT 2,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comprehension_attempts(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id INTEGER NOT NULL REFERENCES comprehension_tests(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percent INTEGER NOT NULL,
  level TEXT NOT NULL,
  answers TEXT NOT NULL DEFAULT '[]',
  details TEXT NOT NULL DEFAULT '[]',
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  crystals_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comprehension_analyses(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK(analysis_type IN ('character_analysis','main_idea','event_sequence','personal_opinion','favorite_quote','annotation')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  extra TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','returned')),
  feedback TEXT,
  score INTEGER,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  seen_feedback INTEGER NOT NULL DEFAULT 1,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_comp_attempts_user_book ON comprehension_attempts(user_id, book_id);
CREATE INDEX IF NOT EXISTS ix_comp_analyses_user_book ON comprehension_analyses(user_id, book_id);
CREATE TABLE IF NOT EXISTS teacher_student_feedback(
  id INTEGER PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_ts_fb_student ON teacher_student_feedback(student_id);

CREATE TABLE IF NOT EXISTS reading_challenges(
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK(challenge_type IN ('days', 'pages', 'books', 'class_competition')),
  target_value INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reward_xp INTEGER NOT NULL DEFAULT 100,
  badge_name TEXT NOT NULL DEFAULT 'Марафон Жеңімпазы',
  badge_icon TEXT NOT NULL DEFAULT '🏆',
  scope TEXT NOT NULL DEFAULT 'individual' CHECK(scope IN ('individual', 'class')),
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS challenge_participants(
  id INTEGER PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES reading_challenges(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  joined_at TEXT NOT NULL,
  current_progress INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  certificate_code TEXT UNIQUE,
  UNIQUE(challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_cp_chal ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS ix_cp_user ON challenge_participants(user_id);

CREATE TABLE IF NOT EXISTS reading_diary(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  start_date TEXT,
  finish_date TEXT,
  total_pages INTEGER NOT NULL DEFAULT 0,
  pages_read INTEGER NOT NULL DEFAULT 0,
  opinion TEXT,
  favorite_character TEXT,
  impression TEXT,
  summary TEXT,
  rating INTEGER DEFAULT 5,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, book_id)
);
CREATE INDEX IF NOT EXISTS ix_rd_user_book ON reading_diary(user_id, book_id);

CREATE TABLE IF NOT EXISTS ai_config(
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  api_key TEXT,
  system_prompt TEXT,
  temperature REAL DEFAULT 0.7,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_chat_history(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_ai_chat_user ON ai_chat_history(user_id, session_id);

CREATE TABLE IF NOT EXISTS research_experiments(
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  hypothesis TEXT NOT NULL DEFAULT '',
  school_name TEXT NOT NULL DEFAULT '№290 орта мектеп',
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  experimental_group_name TEXT NOT NULL DEFAULT '6 «А» сыныбы (Эксперименттік топ)',
  control_group_name TEXT NOT NULL DEFAULT '6 «Б» сыныбы (Бақылау тобы)',
  experimental_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  control_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  conclusion TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_metrics(
  id INTEGER PRIMARY KEY,
  experiment_id INTEGER NOT NULL REFERENCES research_experiments(id) ON DELETE CASCADE,
  group_type TEXT NOT NULL CHECK(group_type IN ('experimental', 'control')),
  stage TEXT NOT NULL CHECK(stage IN ('pre', 'post')),
  students_count INTEGER NOT NULL DEFAULT 25,
  books_per_week REAL NOT NULL,
  pages_per_month REAL NOT NULL,
  active_reading_days REAL NOT NULL,
  interest_level_pct REAL NOT NULL,
  comprehension_pct REAL NOT NULL,
  low_interest_count INTEGER NOT NULL DEFAULT 0,
  medium_interest_count INTEGER NOT NULL DEFAULT 0,
  high_interest_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(experiment_id, group_type, stage)
);
`;

export const DEFAULT_TREE_STAGES = [
  { stage: 1, id: 'seed', name: 'Тұқым', title: 'Алғашқы қадам', icon: '🌱', min_books: 0, min_pages: 0, min_xp: 0, description: 'Кітап әлеміне саяхат алғашқы дәннен басталады. Сөреден кітап таңдап оқуды баста!' },
  { stage: 2, id: 'sprout', name: 'Өскін', title: 'Жас талпыныс', icon: '🌿', min_books: 0, min_pages: 10, min_xp: 20, description: 'Алғашқы оқу мақсатың орындалып, топырақтан жасыл өскін бой көтерді.' },
  { stage: 3, id: 'sapling', name: 'Жас өркен', title: 'Ізденімпаз оқырман', icon: '🪴', min_books: 0, min_pages: 50, min_xp: 60, description: 'Өркен күш алып, тамыры беки түсті. Тұрақты оқу әдеті қалыптасуда.' },
  { stage: 4, id: 'young_tree', name: 'Жас ағаш', title: 'Талғампаз оқырман', icon: '🌳', min_books: 1, min_pages: 120, min_xp: 150, description: 'Жас ағаш мығым діңге ие болды, ойын тапсырмалары мен квиздер сәтті орындалуда.' },
  { stage: 5, id: 'leafy_tree', name: 'Жапырақты ағаш', title: 'Зерделі білімпаз', icon: '🌲', min_books: 3, min_pages: 250, min_xp: 280, description: 'Ағашыңның жасыл жапырақтары жайқалып, әдеби талғамың биік деңгейге көтерілді.' },
  { stage: 6, id: 'blossoming_tree', name: 'Гүлдеген ағаш', title: 'Парасат биігі', icon: '🌸🌳', min_books: 5, min_pages: 450, min_xp: 450, description: 'Ағашың әдемі гүл ашты. Терең ойлы рефлексиялар мен талдаулар кезеңі.' },
  { stage: 7, id: 'fruitful_tree', name: 'Жемісті ағаш', title: 'Кітап шыңының шебері', icon: '👑🍎🌳', min_books: 10, min_pages: 600, min_xp: 700, description: 'Ең жоғары мәртебе! Ағашың алтын жеміс берді. Нағыз кемел оқырман!' }
];

export const DEFAULT_CHALLENGES = [
  {
    title: '7 күндік оқу марафоны',
    description: '7 күн қатарынан күн сайын кітап оқып, тұрақты оқырман әдетін қалыптастыр!',
    challenge_type: 'days',
    target_value: 7,
    start_date: '2026-11-01',
    end_date: '2026-12-31',
    reward_xp: 150,
    badge_name: '7 күндік жеңімпаз',
    badge_icon: '⚡',
    scope: 'individual'
  },
  {
    title: '30 күндік оқу марафоны',
    description: '30 күн бойы оқырмандық табандылық танытып, нағыз кітапқұмар атану!',
    challenge_type: 'days',
    target_value: 30,
    start_date: '2026-11-01',
    end_date: '2026-12-31',
    reward_xp: 500,
    badge_name: '30 күндік чемпион',
    badge_icon: '👑',
    scope: 'individual'
  },
  {
    title: '1000 бет оқу марафоны',
    description: 'Кітаптардан 1000 бет оқып шығып, оқу жылдамдығы мен көлемін арттыр!',
    challenge_type: 'pages',
    target_value: 1000,
    start_date: '2026-11-01',
    end_date: '2026-12-31',
    reward_xp: 400,
    badge_name: '1000 бет батыры',
    badge_icon: '📚',
    scope: 'individual'
  },
  {
    title: 'Бір айда 3 кітап оқу',
    description: 'Бір ай ішінде 3 көркем шығарманы толық оқып, сөреңде аяқталған кітап санын көбейт!',
    challenge_type: 'books',
    target_value: 3,
    start_date: '2026-11-01',
    end_date: '2026-12-31',
    reward_xp: 300,
    badge_name: 'Кемел білімпаз',
    badge_icon: '📖',
    scope: 'individual'
  },
  {
    title: 'Сыныптар арасындағы оқырман жарысы',
    description: 'Сыныппен бірігіп ең көп бет оқып, мектептің «Үздік оқырман сыныбы» кубогын жеңіп ал!',
    challenge_type: 'class_competition',
    target_value: 2000,
    start_date: '2026-11-01',
    end_date: '2026-12-31',
    reward_xp: 600,
    badge_name: 'Үздік оқырман сынып',
    badge_icon: '🏆',
    scope: 'class'
  }
];

export const DEFAULT_EXPERIMENTS = [
  {
    id: 1,
    title: 'Мектеп оқушыларының оқу белсенділігі мен мәтінді түсіну сапасын Kitap Tracker арқылы дамыту',
    hypothesis: 'Kitap Tracker геймификацияланған цифрлық трекерін оқу процесіне енгізу оқушылардың кітап оқу белсенділігін 2.5 есеге, ал мәтінді түсіну сапасын кемінде 25-30%-ға арттырады.',
    school_name: '№290 орта мектеп',
    academic_year: '2025-2026',
    experimental_group_name: '6 «А» сыныбы (Эксперименттік топ, n=25)',
    control_group_name: '6 «Б» сыныбы (Бақылау тобы, n=25)',
    is_sample: 0,
    conclusion: 'Эксперименттік топта оқушылардың апталық оқылған кітап саны +242.8%-ға, айлық оқылған беттер саны +209.7%-ға, оқуға деген тұрақты қызығушылығы 50%-дан 88%-ға (+76.0%), ал мәтінді түсіну сапасы 54%-дан 84%-ға (+55.5%) айтарлықтай өсті. Нәтижелердің статистикалық мәнділігі Student t-критерийімен дәлелденді (t = 8.42, p < 0.001).'
  }
];

export const DEFAULT_EXPERIMENT_METRICS = [
  {
    experiment_id: 1,
    group_type: 'control',
    stage: 'pre',
    students_count: 25,
    books_per_week: 0.6,
    pages_per_month: 85.0,
    active_reading_days: 2.1,
    interest_level_pct: 48.0,
    comprehension_pct: 52.0,
    low_interest_count: 10,
    medium_interest_count: 11,
    high_interest_count: 4,
    notes: 'Дәстүрлі оқыту жағдайындағы бастапқы көрсеткіштер (2025 ж. Қазан)'
  },
  {
    experiment_id: 1,
    group_type: 'control',
    stage: 'post',
    students_count: 25,
    books_per_week: 0.9,
    pages_per_month: 110.0,
    active_reading_days: 2.6,
    interest_level_pct: 54.0,
    comprehension_pct: 58.0,
    low_interest_count: 8,
    medium_interest_count: 12,
    high_interest_count: 5,
    notes: 'Дәстүрлі қағаз әдісі бойынша 5 айдан кейінгі табиғи өзгеріс (2026 ж. Наурыз)'
  },
  {
    experiment_id: 1,
    group_type: 'experimental',
    stage: 'pre',
    students_count: 25,
    books_per_week: 0.7,
    pages_per_month: 92.0,
    active_reading_days: 2.2,
    interest_level_pct: 50.0,
    comprehension_pct: 54.0,
    low_interest_count: 9,
    medium_interest_count: 12,
    high_interest_count: 4,
    notes: 'Kitap Tracker платформасын енгізуге дейінгі бастапқы деңгей (2025 ж. Қазан)'
  },
  {
    experiment_id: 1,
    group_type: 'experimental',
    stage: 'post',
    students_count: 25,
    books_per_week: 2.4,
    pages_per_month: 285.0,
    active_reading_days: 5.3,
    interest_level_pct: 88.0,
    comprehension_pct: 84.0,
    low_interest_count: 1,
    medium_interest_count: 5,
    high_interest_count: 19,
    notes: 'Kitap Tracker интерактивті трекерін 5 ай қолданғаннан кейінгі қорытынды нәтиже (2026 ж. Наурыз)'
  }
];

export function openDb(file) {
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') raw.exec('PRAGMA journal_mode = WAL;');
  raw.exec(SCHEMA);
  try { raw.exec('ALTER TABLE users ADD COLUMN crystals INTEGER NOT NULL DEFAULT 0;'); } catch {}

  // Ағаш сатыларының бастапқы деректерін тексеру
  const rowCount = raw.prepare('SELECT COUNT(*) AS c FROM tree_stages_config').get()?.c || 0;
  if (rowCount === 0) {
    const insertSt = raw.prepare(
      'INSERT INTO tree_stages_config(stage, id, name, title, icon, min_books, min_pages, min_xp, description) VALUES (?,?,?,?,?,?,?,?,?)'
    );
    for (const s of DEFAULT_TREE_STAGES) {
      insertSt.run(s.stage, s.id, s.name, s.title, s.icon, s.min_books, s.min_pages, s.min_xp, s.description);
    }
  }

  // Әдепкі оқырман марафондарын толтыру
  const chalCount = raw.prepare('SELECT COUNT(*) AS c FROM reading_challenges').get()?.c || 0;
  if (chalCount === 0) {
    const now = new Date().toISOString();
    const insertCh = raw.prepare(`
      INSERT INTO reading_challenges(title, description, challenge_type, target_value, start_date, end_date, reward_xp, badge_name, badge_icon, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ch of DEFAULT_CHALLENGES) {
      insertCh.run(ch.title, ch.description, ch.challenge_type, ch.target_value, ch.start_date, ch.end_date, ch.reward_xp, ch.badge_name, ch.badge_icon, ch.scope, now);
    }
  }

  // Бастапқы AI конфигурациясын тексеру
  const aiCfgCount = raw.prepare('SELECT COUNT(*) AS c FROM ai_config').get()?.c || 0;
  if (aiCfgCount === 0) {
    const now = new Date().toISOString();
    raw.prepare(`
      INSERT INTO ai_config(id, provider, model, api_key, system_prompt, temperature, is_active, updated_at)
      VALUES (1, 'gemini', 'gemini-2.0-flash', NULL, NULL, 0.7, 1, ?)
    `).run(now);
  }

  // Ғылыми эксперимент зерттеу деректерін тексеру
  const expCount = raw.prepare('SELECT COUNT(*) AS c FROM research_experiments').get()?.c || 0;
  if (expCount === 0) {
    const now = new Date().toISOString();
    const insExp = raw.prepare(`
      INSERT INTO research_experiments(id, title, hypothesis, school_name, academic_year, experimental_group_name, control_group_name, is_sample, conclusion, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ex of DEFAULT_EXPERIMENTS) {
      insExp.run(ex.id, ex.title, ex.hypothesis, ex.school_name, ex.academic_year, ex.experimental_group_name, ex.control_group_name, ex.is_sample, ex.conclusion, now, now);
    }

    const insMet = raw.prepare(`
      INSERT INTO research_metrics(experiment_id, group_type, stage, students_count, books_per_week, pages_per_month, active_reading_days, interest_level_pct, comprehension_pct, low_interest_count, medium_interest_count, high_interest_count, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of DEFAULT_EXPERIMENT_METRICS) {
      insMet.run(m.experiment_id, m.group_type, m.stage, m.students_count, m.books_per_week, m.pages_per_month, m.active_reading_days, m.interest_level_pct, m.comprehension_pct, m.low_interest_count, m.medium_interest_count, m.high_interest_count, m.notes, now, now);
    }
  }

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
