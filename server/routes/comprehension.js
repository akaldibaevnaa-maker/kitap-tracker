// ==============================================================================
// Reading Comprehension — Кітапты түсіну және талдау роутерлері
// Мазмұндық тесттер (5-10 сұрақ), 6 бағыттық талдау, автоматты бағалау,
// қателерді дәйектеу және мұғалімнің тексеруі
// ==============================================================================
import { fail, nowIso, parseJson } from '../lib/util.js';
import { bookOr404, ownClass, ownStudent } from '../lib/access.js';
import { award } from '../lib/xp.js';
import { DEFAULT_COMPREHENSION_TESTS } from '../comprehension-data.js';

const ANALYSIS_TYPES = [
  'character_analysis',
  'main_idea',
  'event_sequence',
  'personal_opinion',
  'favorite_quote',
  'annotation'
];

export const ANALYSIS_NAMES = {
  character_analysis: 'Кейіпкерлерді сипаттау',
  main_idea: 'Шығарманың негізгі идеясы',
  event_sequence: 'Оқиғалардың ретін орналастыру',
  personal_opinion: 'Өз пікірім мен ой-толғау',
  favorite_quote: 'Ең ұнаған үзінді (дәйексөз)',
  annotation: 'Қысқаша аннотация (аңдатпа)'
};

export function getComprehensionLevel(percent) {
  if (percent >= 90) return { code: 'master', name: 'Терең түсінген мұқият оқырман 🌟', badge: 'Өте жоғары' };
  if (percent >= 75) return { code: 'good', name: 'Жақсы түсінген оқырман 👍', badge: 'Жоғары' };
  if (percent >= 50) return { code: 'medium', name: 'Орташа деңгей 📖', badge: 'Орташа' };
  return { code: 'needs_review', name: 'Қайта оқу ұсынылады 💡', badge: 'Қайта қарау' };
}

export default function register(r, db) {
  // -------------------------------------------------------------
  // 1. Кітап бойынша түсіну тесттері мен талдау тапсырмаларын алу
  // -------------------------------------------------------------
  r.get('/api/books/:id/comprehension', ['student', 'teacher'], ({ user, params }) => {
    const bookId = Number(params.id);
    const book = db.get('SELECT id, title, author, cover_color, cover_emoji FROM books WHERE id = ?', bookId);
    if (!book) fail(404, 'book_not_found');

    const testRow = db.get('SELECT * FROM comprehension_tests WHERE book_id = ? ORDER BY id DESC LIMIT 1', bookId);
    let testData = null;

    if (testRow) {
      const rawQuestions = parseJson(testRow.questions, []);
      // Оқушыға дұрыс жауапты (correct) және түсіндірмені (explanation) тест тапсырғанға дейін жасырамыз
      const isTeacher = user.role === 'teacher' || user.role === 'admin';
      const attempt = db.get('SELECT * FROM comprehension_attempts WHERE user_id = ? AND test_id = ? ORDER BY id DESC LIMIT 1', user.id, testRow.id);

      const questions = rawQuestions.map((q, idx) => {
        const base = {
          id: q.id ?? idx + 1,
          question: q.question,
          options: q.options || []
        };
        // Мұғалім немесе тест тапсырып болған оқушы дұрыс жауапты көре алады
        if (isTeacher || attempt) {
          base.correct = q.correct;
          base.explanation = q.explanation || '';
        }
        return base;
      });

      testData = {
        id: testRow.id,
        book_id: testRow.book_id,
        title: testRow.title,
        description: testRow.description,
        questions_count: questions.length,
        questions,
        xp_reward: testRow.xp_reward,
        crystals_reward: testRow.crystals_reward,
        is_completed: !!attempt,
        last_attempt: attempt ? {
          score: attempt.score,
          total: attempt.total,
          percent: attempt.percent,
          level: attempt.level,
          level_info: getComprehensionLevel(attempt.percent),
          details: parseJson(attempt.details, []),
          created_at: attempt.created_at
        } : null
      };
    }

    // Оқушының осы кітапқа жазған барлық талдау тапсырмалары
    const analyses = db.all(
      `SELECT * FROM comprehension_analyses WHERE book_id = ? AND user_id = ? ORDER BY id ASC`,
      bookId, user.id
    ).map(a => ({
      id: a.id,
      analysis_type: a.analysis_type,
      analysis_name: ANALYSIS_NAMES[a.analysis_type] || a.analysis_type,
      title: a.title,
      content: a.content,
      extra: parseJson(a.extra, {}),
      status: a.status,
      feedback: a.feedback,
      score: a.score,
      xp_awarded: a.xp_awarded,
      created_at: a.created_at,
      reviewed_at: a.reviewed_at
    }));

    // Бастапқы оқиғалар реті үлгісі (егер кітапқа берілген болса)
    const preset = DEFAULT_COMPREHENSION_TESTS.find(t => t.bookTitle === book.title);
    const defaultSequence = preset?.default_sequence || [];

    return {
      book,
      has_test: !!testData,
      test: testData,
      analyses,
      default_sequence: defaultSequence,
      analysis_types: Object.entries(ANALYSIS_NAMES).map(([code, name]) => ({ code, name }))
    };
  });

  // -------------------------------------------------------------
  // 2. Мазмұндық тест жауаптарын жіберу және автоматты бағалау
  // -------------------------------------------------------------
  r.post('/api/books/:id/comprehension/test/submit', ['student'], ({ user, params, body }) => {
    const bookId = Number(params.id);
    const test = db.get('SELECT * FROM comprehension_tests WHERE book_id = ? ORDER BY id DESC LIMIT 1', bookId);
    if (!test) fail(404, 'test_not_found');

    const questions = parseJson(test.questions, []);
    if (!questions.length) fail(400, 'no_questions_in_test');

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
    const details = [];

    questions.forEach((q, idx) => {
      const ans = answers[idx];
      let isCorrect = false;

      if (ans !== null && ans !== undefined) {
        if (typeof ans === 'number' && ans === q.correct) isCorrect = true;
        else if (String(ans) === String(q.correct)) isCorrect = true;
        else if (typeof ans === 'string' && q.options && ans === q.options[q.correct]) isCorrect = true;
      }

      if (isCorrect) score++;

      details.push({
        id: q.id ?? idx + 1,
        question: q.question,
        options: q.options || [],
        selected: ans !== null && ans !== undefined ? ans : null,
        correct: q.correct,
        correct_text: q.options ? q.options[q.correct] : '',
        is_correct: isCorrect,
        explanation: q.explanation || ''
      });
    });

    const total = questions.length;
    const percent = Math.round((score / total) * 100);
    const levelInfo = getComprehensionLevel(percent);
    const now = nowIso();

    let xpAwarded = 0;
    let crystalsAwarded = 0;

    // Кемінде 50% жинаса XP және Кристалл беріледі
    if (percent >= 50) {
      xpAwarded = award(db, user.id, 'game', `comp_test:${test.id}`, test.xp_reward);
      if (xpAwarded > 0) {
        crystalsAwarded = test.crystals_reward;
        db.run('UPDATE users SET crystals = crystals + ? WHERE id = ?', crystalsAwarded, user.id);
      }
    }

    // Нәтижені жазу
    const attemptId = db.run(
      `INSERT INTO comprehension_attempts(user_id, test_id, book_id, score, total, percent, level, answers, details, xp_awarded, crystals_awarded, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      user.id, test.id, bookId, score, total, percent, levelInfo.code, JSON.stringify(answers), JSON.stringify(details), xpAwarded, crystalsAwarded, now
    ).lastInsertRowid;

    return {
      ok: true,
      attempt_id: attemptId,
      score,
      total,
      percent,
      level: levelInfo.code,
      level_name: levelInfo.name,
      level_badge: levelInfo.badge,
      details,
      xp_awarded: xpAwarded,
      crystals_awarded: crystalsAwarded,
      message: `Мазмұндық тест аяқталды! Нәтиже: ${score}/${total} (${percent}%)`
    };
  });

  // -------------------------------------------------------------
  // 3. Талдау тапсырмасын жіберу (Кейіпкер, идея, реттеу, пікір, үзінді, аннотация)
  // -------------------------------------------------------------
  r.post('/api/books/:id/comprehension/analysis/submit', ['student'], ({ user, params, body }) => {
    const bookId = Number(params.id);
    const book = bookOr404(db, user, bookId);

    const type = String(body.analysis_type || '').trim();
    if (!ANALYSIS_TYPES.includes(type)) {
      fail(400, 'invalid_analysis_type', { allowed: ANALYSIS_TYPES });
    }

    const title = String(body.title || ANALYSIS_NAMES[type] || 'Талдау жұмысы').trim().slice(0, 200);
    const content = String(body.content || '').trim();
    if (!content) fail(400, 'content_required');

    const extra = {
      analysis_type: type,
      analysis_name: ANALYSIS_NAMES[type],
      quote_author: body.quote_author ? String(body.quote_author).trim().slice(0, 100) : null,
      quote_page: body.quote_page ? Number(body.quote_page) : null,
      sequence_items: Array.isArray(body.sequence_items) ? body.sequence_items : null,
      character_name: body.character_name ? String(body.character_name).trim().slice(0, 100) : null
    };

    const now = nowIso();

    // 1. comprehension_analyses кестесіне сақтау
    const analysisId = db.run(
      `INSERT INTO comprehension_analyses(user_id, book_id, analysis_type, title, content, extra, status, seen_feedback, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)`,
      user.id, bookId, type, title, content, JSON.stringify(extra), now, now
    ).lastInsertRowid;

    // 2. Мұғалімнің шолу кезек кестесіне (responses) интеграциялау
    const respId = db.run(
      `INSERT INTO responses(user_id, book_id, task_id, kind, text, extra, status, seen_feedback, created_at, updated_at)
       VALUES (?, ?, NULL, 'open', ?, ?, 'pending', 1, ?, ?)`,
      user.id, bookId, content, JSON.stringify({ ...extra, comprehension_analysis_id: analysisId }), now, now
    ).lastInsertRowid;

    // Жазбаша талдау жібергені үшін оқушыны ынталандыру (+10 XP)
    const xp = award(db, user.id, 'reflection', 'comp_analysis:' + analysisId, 10);

    return {
      ok: true,
      analysis_id: analysisId,
      response_id: respId,
      xp_awarded: xp,
      message: 'Талдау тапсырмасы мұғалімге тексеруге жіберілді!'
    };
  });

  // -------------------------------------------------------------
  // 4. Мұғалім: Сыныптың түсіну тесттері мен талдау көрсеткіштерін алу
  // -------------------------------------------------------------
  r.get('/api/teacher/classes/:id/comprehension', ['teacher'], ({ user, params }) => {
    const c = ownClass(db, user, params.id);
    const members = db.all(
      `SELECT u.id, u.nickname, u.avatar FROM users u
       JOIN class_members m ON m.user_id = u.id
       WHERE m.class_id = ? AND u.role = 'student'
       ORDER BY u.nickname`,
      c.id
    );

    if (!members.length) {
      return { class_id: c.id, class_name: c.name, students: [], books: [] };
    }

    const memberIds = members.map(m => m.id).join(',');

    // Соңғы тест нәтижелері
    const attempts = db.all(`
      SELECT a.*, b.title as book_title, u.nickname as student_name, u.avatar as student_avatar
      FROM comprehension_attempts a
      JOIN books b ON b.id = a.book_id
      JOIN users u ON u.id = a.user_id
      WHERE a.user_id IN (${memberIds})
      ORDER BY a.created_at DESC
    `);

    // Талдау тапсырмалары
    const analyses = db.all(`
      SELECT ca.*, b.title as book_title, u.nickname as student_name, u.avatar as student_avatar
      FROM comprehension_analyses ca
      JOIN books b ON b.id = ca.book_id
      JOIN users u ON u.id = ca.user_id
      WHERE ca.user_id IN (${memberIds})
      ORDER BY ca.created_at DESC
    `);

    return {
      class_id: c.id,
      class_name: c.name,
      students_count: members.length,
      attempts: attempts.map(a => ({
        ...a,
        details: parseJson(a.details, []),
        level_info: getComprehensionLevel(a.percent)
      })),
      analyses: analyses.map(an => ({
        ...an,
        analysis_name: ANALYSIS_NAMES[an.analysis_type] || an.analysis_type,
        extra: parseJson(an.extra, {})
      }))
    };
  });

  // -------------------------------------------------------------
  // 5. Мұғалім: Жаңа мазмұндық тест жасау
  // -------------------------------------------------------------
  r.post('/api/teacher/comprehension/tests', ['teacher'], ({ user, body }) => {
    const bookId = Number(body.book_id);
    const book = db.get('SELECT id, title FROM books WHERE id = ?', bookId);
    if (!book) fail(404, 'book_not_found');

    const title = String(body.title || `«${book.title}» түсіну тесті`).trim().slice(0, 200);
    const description = String(body.description || '').trim().slice(0, 500);
    const questions = Array.isArray(body.questions) ? body.questions : [];

    if (questions.length < 3) {
      fail(400, 'at_least_3_questions_required');
    }

    // Әр сұрақты тексеру
    const cleanQuestions = questions.map((q, idx) => {
      const qText = String(q.question || '').trim();
      if (!qText) fail(400, `question_${idx + 1}_text_required`);
      const options = Array.isArray(q.options) ? q.options.map(o => String(o).trim()).filter(Boolean) : [];
      if (options.length < 2) fail(400, `question_${idx + 1}_needs_at_least_2_options`);
      const correct = Number(q.correct ?? 0);
      if (correct < 0 || correct >= options.length) fail(400, `question_${idx + 1}_invalid_correct_index`);
      return {
        id: idx + 1,
        question: qText,
        options,
        correct,
        explanation: String(q.explanation || '').trim()
      };
    });

    const xpReward = Math.max(15, Math.min(100, Number(body.xp_reward) || 25));
    const crystalsReward = Math.max(1, Math.min(10, Number(body.crystals_reward) || 2));
    const now = nowIso();

    const testId = db.run(
      `INSERT INTO comprehension_tests(book_id, title, description, questions, xp_reward, crystals_reward, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      bookId, title, description, JSON.stringify(cleanQuestions), xpReward, crystalsReward, user.id, now, now
    ).lastInsertRowid;

    return {
      ok: true,
      test_id: testId,
      message: 'Мазмұндық тест сәтті жарияланды!'
    };
  });

  // -------------------------------------------------------------
  // 6. Мұғалім: Оқушының жазбаша талдауын тексеру және бағалау
  // -------------------------------------------------------------
  r.post('/api/teacher/comprehension/analyses/:id/review', ['teacher'], ({ user, params, body }) => {
    const analysisId = Number(params.id);
    const analysis = db.get('SELECT * FROM comprehension_analyses WHERE id = ?', analysisId);
    if (!analysis) fail(404, 'analysis_not_found');

    ownStudent(db, user, analysis.user_id);

    const status = body.status === 'accepted' ? 'accepted' : 'returned';
    const feedback = String(body.feedback || '').trim();
    const score = Number(body.score) || (status === 'accepted' ? 10 : 0);
    const now = nowIso();

    let xpAwarded = 0;
    if (status === 'accepted') {
      xpAwarded = award(db, analysis.user_id, 'reflection', `analysis_approved:${analysis.id}`, 20);
    }

    db.run(
      `UPDATE comprehension_analyses
       SET status = ?, feedback = ?, score = ?, reviewed_by = ?, reviewed_at = ?, xp_awarded = ?, seen_feedback = 0, updated_at = ?
       WHERE id = ?`,
      status, feedback, score, user.id, now, xpAwarded, now, analysisId
    );

    // Сәйкес келетін responses жазбасын да жаңарту
    db.run(
      `UPDATE responses
       SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = ?, seen_feedback = 0, updated_at = ?
       WHERE user_id = ? AND book_id = ? AND extra LIKE ?`,
      status, feedback, user.id, now, now, analysis.user_id, analysis.book_id, `%"comprehension_analysis_id":${analysisId}%`
    );

    return {
      ok: true,
      status,
      score,
      xp_awarded: xpAwarded,
      message: status === 'accepted' ? 'Талдау жұмысы қабылданды (+20 XP берілді)!' : 'Талдау жұмысы қайта өңдеуге қайтарылды.'
    };
  });
}
