// «Менің әлемім», «Ортақ миссия», «Жетістіктерім», «Оқырман күнделігі».
import { addDays, fail, localDate, nowIso, weekStart } from '../lib/util.js';
import { computeJourney } from '../lib/journey.js';
import { shelfView } from '../lib/progress.js';
import { REWARDS, rewardInfo, userStats } from '../lib/rewards.js';
import { award, classOf, parseRules, totalXp } from '../lib/xp.js';
import { missionView } from '../lib/missions.js';
import { nextStep } from './games.js';
function computeStreak(db, userId) {
  const logs = db.all(
    'SELECT DISTINCT log_date FROM reading_logs WHERE user_id = ? ORDER BY log_date DESC',
    userId,
  ).map((r) => r.log_date);

  if (logs.length === 0) return { count: 0, active_today: false, next_milestone: 3 };

  const today = localDate();
  const yesterday = addDays(today, -1);
  const activeToday = logs.includes(today);

  // Егер бүгін де, кеше де оқымаған болса — серия үзілген
  if (!activeToday && !logs.includes(yesterday)) {
    return { count: 0, active_today: false, next_milestone: 3 };
  }

  let count = 0;
  let checkDate = activeToday ? today : yesterday;

  for (const d of logs) {
    if (d === checkDate) {
      count++;
      checkDate = addDays(checkDate, -1);
    } else if (d < checkDate) {
      break;
    }
  }

  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find((m) => m > count) || (count + 10);
  return { count, active_today: activeToday, next_milestone: nextMilestone };
}

export default function register(r, db) {
  r.get('/api/world', ['student'], ({ user }) => {
    const cur =
      db.get(
        `SELECT s.*, b.title, b.author, b.cover_color, b.cover_emoji, b.is_demo,
                (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id) AS chapters_n
         FROM shelf s JOIN books b ON b.id = s.book_id
         WHERE s.user_id = ? AND s.status = 'reading' ORDER BY s.updated_at DESC LIMIT 1`,
        user.id,
      ) ||
      db.get(
        `SELECT s.*, b.title, b.author, b.cover_color, b.cover_emoji, b.is_demo,
                (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id) AS chapters_n
         FROM shelf s JOIN books b ON b.id = s.book_id
         WHERE s.user_id = ? AND s.status = 'want' ORDER BY (s.assigned_by IS NOT NULL) DESC, s.updated_at DESC LIMIT 1`,
        user.id,
      );
    const today = localDate();
    const ws = weekStart(today);
    const days = db.all('SELECT DISTINCT log_date FROM reading_logs WHERE user_id = ? AND log_date >= ?', user.id, ws).map((x) => x.log_date);
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i);
      return { date: d, read: days.includes(d), today: d === today, future: d > today };
    });
    const loggedToday = days.includes(today);

    let current = null;
    let journey = null;
    let next = null;
    if (cur) {
      journey = cur.status === 'want' ? null : computeJourney(db, user.id, cur.book_id);
      next = nextStep(db, user.id, cur.book_id, journey);
      current = {
        book: { id: cur.book_id, title: cur.title, author: cur.author, cover_color: cur.cover_color, cover_emoji: cur.cover_emoji, is_demo: !!cur.is_demo, has_text: cur.chapters_n > 0 },
        shelf: shelfView(cur),
      };
    }

    const lastReward = db.get('SELECT reward_id, earned_at FROM user_rewards WHERE user_id = ? AND reward_id != ? ORDER BY earned_at DESC, rowid DESC LIMIT 1', user.id, 'scene_steppe');
    const feedback = db.get(
      `SELECT r.id, r.status, r.feedback, r.kind, t.title AS task_title, b.title AS book_title
       FROM responses r LEFT JOIN tasks t ON t.id = r.task_id JOIN books b ON b.id = r.book_id
       WHERE r.user_id = ? AND r.seen_feedback = 0 ORDER BY r.reviewed_at DESC LIMIT 1`,
      user.id,
    );

    // Өз нәтижесімен салыстыратын ынталандыру хабарламалары
    const week7 = addDays(today, -6);
    const motivations = [];
    if (days.length) motivations.push({ key: 'mot_week_days', params: { n: days.length } });
    if (db.get("SELECT 1 AS x FROM responses WHERE user_id = ? AND kind = 'sentence' AND substr(created_at,1,10) >= ?", user.id, week7))
      motivations.push({ key: 'mot_sentence' });
    if (db.get("SELECT 1 AS x FROM task_progress p JOIN tasks t ON t.id = p.task_id WHERE p.user_id = ? AND t.type = 'evidence' AND p.completed = 1 AND substr(p.completed_at,1,10) >= ?", user.id, week7))
      motivations.push({ key: 'mot_evidence' });
    if (db.get("SELECT 1 AS x FROM responses WHERE user_id = ? AND status = 'accepted' AND substr(reviewed_at,1,10) >= ?", user.id, week7))
      motivations.push({ key: 'mot_accepted' });

    const streak = computeStreak(db, user.id);
    const userRow = db.get('SELECT COALESCE(crystals, 0) AS crystals FROM users WHERE id = ?', user.id);
    const hasQuiz = cur ? !!db.get('SELECT id FROM character_quizzes WHERE book_id = ?', cur.book_id) : false;

    return {
      current,
      journey,
      next,
      today: { minutes: user.daily_minutes, logged: loggedToday },
      week: { target: user.weekly_days, done: days.length, days: week },
      xp: totalXp(db, user.id),
      crystals: userRow ? userRow.crystals : 0,
      streak,
      has_quiz: hasQuiz,
      last_reward: lastReward ? { ...rewardInfo(lastReward.reward_id), earned_at: lastReward.earned_at } : null,
      feedback: feedback || null,
      motivations: motivations.slice(0, 3),
      scene: user.scene,
    };
  });

  r.get('/api/mission', ['student'], ({ user }) => {
    const c = classOf(db, user.id);
    if (!c) return { class: null, missions: [] };
    const ms = db.all('SELECT * FROM missions WHERE class_id = ? AND active = 1 ORDER BY id', c.id);
    const members = db.get('SELECT COUNT(*) AS n FROM class_members WHERE class_id = ?', c.id).n;
    return {
      class: { name: c.name, members, is_demo: !!c.is_demo },
      missions: ms.map((m) => missionView(db, m, user.id)),
    };
  });

  // Сынып рейтингі (Leaderboard)
  r.get('/api/leaderboard', ['student'], ({ user }) => {
    const c = classOf(db, user.id);
    if (!c) return { class_name: null, leaderboard: [] };
    const since = addDays(localDate(), -6);
    const members = db.all(
      `SELECT u.id, u.nickname, u.avatar, COALESCE(u.crystals, 0) as crystals
       FROM users u
       JOIN class_members m ON m.user_id = u.id
       WHERE m.class_id = ? AND u.role = 'student'`,
      c.id,
    );
    const list = members.map((m) => {
      const xp = totalXp(db, m.id);
      const str = computeStreak(db, m.id);
      const weekly_minutes = db.get(
        'SELECT COALESCE(SUM(minutes), 0) AS s FROM reading_logs WHERE user_id = ? AND log_date >= ?',
        m.id, since,
      ).s;
      const weekly_pages = db.get(
        'SELECT COALESCE(MAX(page), 0) AS p FROM reading_logs WHERE user_id = ? AND log_date >= ?',
        m.id, since,
      ).p;
      const treeLevel = xp >= 1000 ? 5 : (xp >= 500 ? 4 : (xp >= 250 ? 3 : (xp >= 100 ? 2 : 1)));
      const treeIcons = ['', '🌱', '🌿', '🌳', '🍎', '🌟'];
      const treeNames = ['', 'Жас өскін', 'Жас шыбық', 'Жасыл Бәйтерек', 'Жемісті Бәйтерек', 'Алтын Бәйтерек'];
      const baiterek = { level: treeLevel, name: treeNames[treeLevel], icon: treeIcons[treeLevel] };
      return {
        id: m.id,
        nickname: m.nickname,
        avatar: m.avatar,
        crystals: m.crystals,
        xp,
        streak: str.count,
        weekly_minutes,
        weekly_pages,
        tree: baiterek,
        baiterek,
        is_current: m.id === user.id,
      };
    }).sort((a, b) => b.xp - a.xp).map((item, idx) => ({ ...item, rank: idx + 1 }));

    return { class_name: c.name, leaderboard: list };
  });

  r.get('/api/achievements', ['student'], ({ user }) => {
    const owned = new Map(db.all('SELECT reward_id, earned_at FROM user_rewards WHERE user_id = ?', user.id).map((x) => [x.reward_id, x.earned_at]));
    const stats = userStats(db, user.id);
    const streak = computeStreak(db, user.id);
    const userRow = db.get('SELECT COALESCE(crystals, 0) AS crystals FROM users WHERE id = ?', user.id);
    const events = db.all(
      'SELECT kind, ref, amount, created_at FROM xp_events WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 30',
      user.id,
    );
    const label = (e) => {
      if (e.ref.startsWith('task:')) return db.get('SELECT title FROM tasks WHERE id = ?', Number(e.ref.slice(5)))?.title ?? null;
      if (e.kind === 'book_finished' || e.ref.startsWith('book:')) {
        const id = Number(e.ref.replace('book:', ''));
        return db.get('SELECT title FROM books WHERE id = ?', id)?.title ?? null;
      }
      return e.kind === 'daily_log' ? e.ref : null;
    };
    const finished = db.all(
      "SELECT b.id, b.title, b.cover_color, b.cover_emoji FROM shelf s JOIN books b ON b.id = s.book_id WHERE s.user_id = ? AND s.status = 'finished'",
      user.id,
    );
    const finishedCount = finished.length;
    const totalPages = db.get('SELECT COALESCE(MAX(page), 0) AS p FROM reading_logs WHERE user_id = ?', user.id).p;
    const hasFantasy = db.get(
      `SELECT 1 FROM shelf s JOIN books b ON b.id = s.book_id
       WHERE s.user_id = ? AND (b.genre LIKE '%ертегі%' OR b.genre LIKE '%фэнтези%' OR b.interests LIKE '%сиқыр%') LIMIT 1`,
      user.id,
    );
    const diaryCount = db.get('SELECT COUNT(*) AS c FROM diary_entries WHERE user_id = ?', user.id).c;
    const quizCount = db.get('SELECT COUNT(*) AS c FROM quiz_attempts WHERE user_id = ?', user.id).c;
    const treeLevel = stats.xp >= 1000 ? 5 : (stats.xp >= 500 ? 4 : (stats.xp >= 250 ? 3 : (stats.xp >= 100 ? 2 : 1)));

    const badges = [
      {
        id: 'first_book',
        title: 'Алғашқы кітап',
        icon: '📖',
        color: '#3b82f6',
        desc: 'Кемінде 1 кітапты басынан аяғына дейін толық оқып бітіру',
        unlocked: finishedCount >= 1,
        progress: `${Math.min(1, finishedCount)}/1 кітап`,
      },
      {
        id: 'streak_reader',
        title: 'Тұрақты оқырман',
        icon: '🔥',
        color: '#ef4444',
        desc: '3 күн немесе одан көп күн қатарынан кітап оқу сериясын сақтау',
        unlocked: streak.count >= 3,
        progress: `${streak.count}/3 күн`,
      },
      {
        id: 'page_marathon',
        title: '100 беттік марафоншы',
        icon: '🏃‍♂️',
        color: '#10b981',
        desc: 'Кітаптардан жалпы 100 беттен астам оқып шығу',
        unlocked: totalPages >= 100,
        progress: `${Math.min(100, totalPages)}/100 бет`,
      },
      {
        id: 'fantasy_lover',
        title: 'Фантастика әуесқойы',
        icon: '🚀',
        color: '#8b5cf6',
        desc: 'Қиял-ғажайып, ертегі немесе фэнтези жанрындағы кітапты оқу',
        unlocked: !!hasFantasy,
        progress: hasFantasy ? '1/1' : '0/1',
      },
      {
        id: 'word_master',
        title: 'Сөз шебері',
        icon: '💬',
        color: '#f59e0b',
        desc: 'Оқырман күнделігіне 3 немесе одан көп дәйексөз бен жазба сақтау',
        unlocked: diaryCount >= 3,
        progress: `${Math.min(3, diaryCount)}/3 жазба`,
      },
      {
        id: 'quiz_expert',
        title: 'Кітап білгірі',
        icon: '🧠',
        color: '#06b6d4',
        desc: 'Кейіпкерлердің интерактивті квиз-сұрақтарынан сәтті өту',
        unlocked: quizCount >= 1,
        progress: `${Math.min(1, quizCount)}/1 квиз`,
      },
      {
        id: 'tree_peak',
        title: 'Бәйтерек шыңы',
        icon: '🌳',
        color: '#16a34a',
        desc: '«Бәйтерек — Білім ағашының» 3-деңгейіне («Жасыл Бәйтерек») жету',
        unlocked: treeLevel >= 3,
        progress: `${treeLevel}/3 деңгей`,
      },
    ];

    return {
      xp: stats.xp,
      crystals: userRow ? userRow.crystals : 0,
      streak,
      badges,
      stats,
      rules: parseRules(classOf(db, user.id)?.xp_rules),
      rewards: REWARDS.map((r) => ({ id: r.id, type: r.type, emoji: r.emoji, owned: owned.has(r.id), earned_at: owned.get(r.id) || null })),
      equipped: { decor: user.decor, scene: user.scene, avatar: user.avatar },
      history: events.map((e) => ({ ...e, label: label(e) })),
      finished_books: finished,
      stages_reached: stats.maxStages,
    };
  });

  // -------------------------------------------------------------
  // Кейіпкерлердің интерактивті квиздері (Character Quizzes)
  // -------------------------------------------------------------
  r.get('/api/books/:id/quiz', ['student'], ({ user, params }) => {
    const bookId = Number(params.id);
    const quiz = db.get('SELECT * FROM character_quizzes WHERE book_id = ?', bookId);
    if (!quiz) return { quiz: null };
    const attempt = db.get('SELECT * FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?', user.id, quiz.id);
    const quizData = {
      id: quiz.id,
      book_id: quiz.book_id,
      character_name: quiz.character_name,
      character_avatar: quiz.character_avatar,
      character_intro: quiz.character_intro,
      questions: JSON.parse(quiz.questions || '[]'),
      xp_reward: quiz.xp_reward,
      crystals_reward: quiz.crystals_reward,
      completed: !!attempt,
      is_completed: !!attempt,
      last_score: attempt?.score ?? null,
      last_total: attempt?.total ?? null,
    };
    return {
      quiz: quizData,
      ...quizData,
    };
  });

  r.post('/api/books/:id/quiz/submit', ['student'], ({ user, params, body }) => {
    const bookId = Number(params.id);
    const quiz = db.get('SELECT * FROM character_quizzes WHERE book_id = ?', bookId);
    if (!quiz) fail(404, 'quiz_not_found');
    const questions = JSON.parse(quiz.questions || '[]');
    const rawAnswers = body.answers;
    let answers = [];
    if (Array.isArray(rawAnswers)) {
      answers = rawAnswers;
    } else if (rawAnswers && typeof rawAnswers === 'object') {
      answers = questions.map((q, idx) => {
        if (rawAnswers[q.id] !== undefined) return rawAnswers[q.id];
        if (rawAnswers[idx] !== undefined) return rawAnswers[idx];
        return null;
      });
    }
    let score = 0;
    questions.forEach((q, idx) => {
      const ans = answers[idx];
      if (ans === null || ans === undefined) return;
      if (typeof ans === 'number' && ans === q.correct) score++;
      else if (String(ans) === String(q.correct)) score++;
      else if (typeof ans === 'string' && ans === q.options[q.correct]) score++;
    });
    const total = questions.length;
    const passed = score >= Math.ceil(total * 0.6);
    let xpAwarded = 0;
    let crystalsAwarded = 0;
    const now = nowIso();

    if (passed) {
      xpAwarded = award(db, user.id, 'game', 'quiz:' + quiz.id, quiz.xp_reward);
      if (xpAwarded > 0) {
        crystalsAwarded = quiz.crystals_reward;
        db.run('UPDATE users SET crystals = crystals + ? WHERE id = ?', crystalsAwarded, user.id);
      }
    }

    db.run(
      `INSERT INTO quiz_attempts(user_id, quiz_id, score, total, xp_awarded, crystals_awarded, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, quiz_id) DO UPDATE SET score = excluded.score, total = excluded.total`,
      user.id, quiz.id, score, total, xpAwarded, crystalsAwarded, now,
    );

    return {
      ok: true,
      passed,
      score,
      total,
      xp_awarded: xpAwarded,
      crystals_awarded: crystalsAwarded,
      message: passed ? 'Жарайсың! Кейіпкердің сұрақтарынан сүрінбей өттің!' : 'Тағы бір қайталап оқып, байқап көр!',
    };
  });

  // -------------------------------------------------------------
  // Оқырман күнделігі: Дәйексөздер, аудио-рефлексиялар және ойлар
  // -------------------------------------------------------------
  r.get('/api/diary', ['student'], ({ user }) => {
    const logNotes = db.all(
      `SELECT l.id, 'note' AS kind, l.note AS text, NULL AS quote_author, l.page,
              l.log_date, l.created_at, b.id AS book_id, b.title AS book_title,
              b.author AS book_author, b.cover_color, b.cover_emoji, NULL AS audio_url
       FROM reading_logs l
       JOIN books b ON b.id = l.book_id
       WHERE l.user_id = ? AND l.note IS NOT NULL AND length(trim(l.note)) > 0
       ORDER BY l.created_at DESC`,
      user.id,
    );

    const diaryEntries = db.all(
      `SELECT d.id, d.kind, d.text, d.extra, d.created_at,
              b.id AS book_id, b.title AS book_title, b.author AS book_author,
              b.cover_color, b.cover_emoji
       FROM diary_entries d
       JOIN books b ON b.id = d.book_id
       WHERE d.user_id = ?
       ORDER BY d.created_at DESC`,
      user.id,
    ).map((d) => {
      let extra = {};
      try { extra = JSON.parse(d.extra || '{}'); } catch {}
      return {
        id: d.id,
        kind: d.kind,
        text: d.text,
        quote_author: extra.quote_author || null,
        page: extra.page || null,
        audio_url: extra.audio_url || null,
        thoughts: extra.thoughts || null,
        created_at: d.created_at,
        book_id: d.book_id,
        book_title: d.book_title,
        book_author: d.book_author,
        cover_color: d.cover_color,
        cover_emoji: d.cover_emoji,
      };
    });

    const acceptedReflections = db.all(
      `SELECT r.id, r.kind, r.text, r.extra, r.created_at,
              b.id AS book_id, b.title AS book_title, b.author AS book_author,
              b.cover_color, b.cover_emoji
       FROM responses r
       JOIN books b ON b.id = r.book_id
       WHERE r.user_id = ? AND r.kind IN ('reflection', 'open') AND r.status = 'accepted'
       ORDER BY r.created_at DESC`,
      user.id,
    ).map((r) => {
      let extra = {};
      try { extra = JSON.parse(r.extra || '{}'); } catch {}
      return {
        id: r.id,
        kind: 'reflection',
        text: r.text,
        quote_author: null,
        page: null,
        audio_url: null,
        thoughts: null,
        created_at: r.created_at,
        book_id: r.book_id,
        book_title: r.book_title,
        book_author: r.book_author,
        cover_color: r.cover_color,
        cover_emoji: r.cover_emoji,
      };
    });

    const all = [...diaryEntries, ...acceptedReflections, ...logNotes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const c = classOf(db, user.id);
    let classEntries = [];
    if (c) {
      const cDiary = db.all(
        `SELECT d.id, d.kind, d.text, d.extra, d.created_at,
                u.nickname AS student_nickname, u.avatar AS student_avatar,
                b.id AS book_id, b.title AS book_title, b.author AS book_author,
                b.cover_color, b.cover_emoji
         FROM diary_entries d
         JOIN users u ON u.id = d.user_id
         JOIN class_members m ON m.user_id = u.id
         JOIN books b ON b.id = d.book_id
         WHERE m.class_id = ?
         ORDER BY d.created_at DESC LIMIT 30`,
        c.id,
      ).map((d) => {
        let extra = {};
        try { extra = JSON.parse(d.extra || '{}'); } catch {}
        return {
          id: d.id,
          kind: d.kind,
          text: d.text,
          student_nickname: d.student_nickname,
          student_avatar: d.student_avatar,
          quote_author: extra.quote_author || null,
          page: extra.page || null,
          thoughts: extra.thoughts || null,
          audio_url: extra.audio_url || null,
          created_at: d.created_at,
          book_id: d.book_id,
          book_title: d.book_title,
          book_author: d.book_author,
          cover_color: d.cover_color,
          cover_emoji: d.cover_emoji,
          is_own: d.student_nickname === user.nickname,
        };
      });

      const cReflect = db.all(
        `SELECT r.id, 'reflection' AS kind, r.text, r.created_at,
                u.nickname AS student_nickname, u.avatar AS student_avatar,
                b.id AS book_id, b.title AS book_title, b.author AS book_author,
                b.cover_color, b.cover_emoji
         FROM responses r
         JOIN users u ON u.id = r.user_id
         JOIN class_members m ON m.user_id = u.id
         JOIN books b ON b.id = r.book_id
         WHERE m.class_id = ? AND r.status = 'accepted'
         ORDER BY r.created_at DESC LIMIT 20`,
        c.id,
      ).map((r) => ({
        id: r.id,
        kind: 'reflection',
        text: r.text,
        student_nickname: r.student_nickname,
        student_avatar: r.student_avatar,
        quote_author: null,
        page: null,
        thoughts: null,
        audio_url: null,
        created_at: r.created_at,
        book_id: r.book_id,
        book_title: r.book_title,
        book_author: r.book_author,
        cover_color: r.cover_color,
        cover_emoji: r.cover_emoji,
        is_own: r.student_nickname === user.nickname,
      }));

      classEntries = [...cDiary, ...cReflect].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return {
      entries: all,
      class_entries: classEntries,
      stats: {
        total: all.length,
        quotes: all.filter((x) => x.kind === 'quote').length,
        audio: all.filter((x) => x.kind === 'audio').length,
        notes: all.filter((x) => x.kind === 'note' || x.kind === 'reflection').length,
        class_total: classEntries.length,
      },
    };
  });

  r.post('/api/diary', ['student'], ({ user, body }) => {
    const bookId = Number(body.book_id);
    const book = db.get('SELECT * FROM books WHERE id = ?', bookId);
    if (!book) fail(404, 'book_not_found');

    const kind = (body.kind || body.entry_type) === 'audio' ? 'audio' : ((body.kind || body.entry_type) === 'quote' ? 'quote' : 'reflection');
    const text = String(body.text || body.quote_text || body.student_thoughts || '').trim();
    if (!text && kind !== 'audio') fail(400, 'text_required');

    const extra = {
      quote_author: (body.quote_author || body.author) ? String(body.quote_author || body.author).trim().slice(0, 100) : null,
      page: (body.page || body.page_number) ? Number(body.page || body.page_number) : null,
      audio_url: body.audio_url ? String(body.audio_url) : null,
      thoughts: body.student_thoughts ? String(body.student_thoughts).trim() : null,
    };

    const now = nowIso();
    const id = db.run(
      `INSERT INTO diary_entries(user_id, book_id, kind, text, extra, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      user.id, bookId, kind, text || 'Дауыстық рефлексия', JSON.stringify(extra), now,
    ).lastInsertRowid;

    // Күнделікке жаңа жазба қосқаны үшін +5 XP марапаты
    const xpAwarded = award(db, user.id, 'diary', 'diary:' + id, 5);

    return {
      ok: true,
      id,
      xp_awarded: xpAwarded,
      message: 'Күнделікке сақталды!',
    };
  });
}
