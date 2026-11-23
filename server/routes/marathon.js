/**
 * KitapTracker — Алтыншы кезең маршруттары:
 * 1. Reading Challenge — Оқырман марафоны
 * 2. Electronic Reading Diary — Электронды оқырман күнделігі
 * 3. QR Book System — QR кітап жүйесі & Кітапхана каталогы
 */
import os from 'os';
import { generateQrSvg, generateQrDataUri } from '../lib/qr.js';
import { localDate, nowIso, fail, V } from '../lib/util.js';
import { totalXp, award, classOf } from '../lib/xp.js';
import { computeStudentTreeStage } from '../lib/progress.js';

function getHost(req) {
  return req?.headers?.host || 'localhost:3000';
}

function computeUserProgress(db, user, chal) {
  const { challenge_type, target_value, start_date, end_date } = chal;
  let progress = 0;

  if (challenge_type === 'days') {
    const r = db.get(
      'SELECT COUNT(DISTINCT log_date) AS c FROM reading_logs WHERE user_id = ? AND log_date >= ? AND log_date <= ?',
      user.id, start_date, end_date
    );
    progress = r?.c || 0;
  } else if (challenge_type === 'pages') {
    const r = db.get(
      'SELECT COALESCE(SUM(page), 0) AS p FROM reading_logs WHERE user_id = ? AND log_date >= ? AND log_date <= ?',
      user.id, start_date, end_date
    );
    progress = r?.p || 0;
  } else if (challenge_type === 'books') {
    const r = db.get(
      `SELECT COUNT(*) AS b FROM shelf
       WHERE user_id = ? AND status = 'finished'
         AND finished_at >= ? AND finished_at <= ?`,
      user.id, start_date + 'T00:00:00.000Z', end_date + 'T23:59:59.999Z'
    );
    progress = r?.b || 0;
  } else if (challenge_type === 'class_competition') {
    const cls = classOf(db, user.id);
    if (cls) {
      const r = db.get(
        `SELECT COALESCE(SUM(l.page), 0) AS p
         FROM reading_logs l
         JOIN class_members cm ON cm.user_id = l.user_id
         WHERE cm.class_id = ? AND l.log_date >= ? AND l.log_date <= ?`,
        cls.id, start_date, end_date
      );
      progress = r?.p || 0;
    } else {
      const r = db.get(
        'SELECT COALESCE(SUM(page), 0) AS p FROM reading_logs WHERE user_id = ? AND log_date >= ? AND log_date <= ?',
        user.id, start_date, end_date
      );
      progress = r?.p || 0;
    }
  }

  return progress;
}

export default function registerMarathon(r, db) {
  // =========================================================================
  // 1. READING CHALLENGE — ОҚЫРМАН МАРАФОНЫ
  // =========================================================================

  // Марафондар тізімі (қатысу мәртебесі, жеке прогресс және рейтинг)
  r.get('/api/challenges', null, ({ user, req }) => {
    const challenges = db.all('SELECT * FROM reading_challenges ORDER BY id ASC');
    const host = getHost(req);

    const out = challenges.map((chal) => {
      let participant = null;
      if (user) {
        participant = db.get(
          'SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?',
          chal.id, user.id
        );

        if (participant) {
          const rawProgress = computeUserProgress(db, user, chal);
          const isDone = rawProgress >= chal.target_value;

          if (isDone && !participant.completed) {
            const certCode = `CERT-CHAL-${chal.id}-U${user.id}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
            db.run(
              `UPDATE challenge_participants
               SET current_progress = ?, completed = 1, completed_at = ?, certificate_code = ?
               WHERE id = ?`,
              rawProgress, nowIso(), certCode, participant.id
            );
            award(db, user.id, 'challenge', chal.id, chal.reward_xp);
            participant.completed = 1;
            participant.completed_at = nowIso();
            participant.certificate_code = certCode;
          } else if (rawProgress !== participant.current_progress) {
            db.run(
              'UPDATE challenge_participants SET current_progress = ? WHERE id = ?',
              rawProgress, participant.id
            );
          }
          participant.current_progress = rawProgress;
        }
      }

      // Қатысушылар саны және үздіктер тізімі (Leaderboard)
      const participantsCount = db.get(
        'SELECT COUNT(*) AS c FROM challenge_participants WHERE challenge_id = ?',
        chal.id
      )?.c || 0;

      const winnersCount = db.get(
        'SELECT COUNT(*) AS c FROM challenge_participants WHERE challenge_id = ? AND completed = 1',
        chal.id
      )?.c || 0;

      const leaderboard = db.all(
        `SELECT cp.user_id, cp.current_progress, cp.completed, cp.completed_at, u.nickname, u.avatar
         FROM challenge_participants cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.challenge_id = ?
         ORDER BY cp.completed DESC, cp.current_progress DESC, cp.joined_at ASC
         LIMIT 10`,
        chal.id
      );

      const percent = participant
        ? Math.min(100, Math.round((participant.current_progress / chal.target_value) * 100))
        : 0;

      return {
        ...chal,
        is_joined: !!participant,
        my_progress: participant ? participant.current_progress : 0,
        my_percent: percent,
        is_completed: participant ? !!participant.completed : false,
        certificate_code: participant?.certificate_code || null,
        participants_count: participantsCount,
        winners_count: winnersCount,
        leaderboard,
        share_url: `http://${host}/#/challenges?id=${chal.id}`
      };
    });

    return { challenges: out };
  });

  // Жеке марафон мәліметі
  r.get('/api/challenges/:id', null, ({ user, params, req }) => {
    const id = Number(params.id);
    const chal = db.get('SELECT * FROM reading_challenges WHERE id = ?', id);
    if (!chal) fail(404, 'challenge_not_found');

    const host = getHost(req);
    let participant = null;
    if (user) {
      participant = db.get('SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?', id, user.id);
      if (participant) {
        const rawProgress = computeUserProgress(db, user, chal);
        if (rawProgress >= chal.target_value && !participant.completed) {
          const certCode = `CERT-CHAL-${chal.id}-U${user.id}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
          db.run(
            'UPDATE challenge_participants SET current_progress = ?, completed = 1, completed_at = ?, certificate_code = ? WHERE id = ?',
            rawProgress, nowIso(), certCode, participant.id
          );
          award(db, user.id, 'challenge', chal.id, chal.reward_xp);
          participant.completed = 1;
          participant.completed_at = nowIso();
          participant.certificate_code = certCode;
        }
        participant.current_progress = rawProgress;
      }
    }

    const leaderboard = db.all(
      `SELECT cp.user_id, cp.current_progress, cp.completed, cp.completed_at, u.nickname, u.avatar
       FROM challenge_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.challenge_id = ?
       ORDER BY cp.completed DESC, cp.current_progress DESC, cp.joined_at ASC
       LIMIT 25`,
      id
    );

    const winners = leaderboard.filter(p => p.completed);

    return {
      challenge: chal,
      participant,
      percent: participant ? Math.min(100, Math.round((participant.current_progress / chal.target_value) * 100)) : 0,
      leaderboard,
      winners,
      share_url: `http://${host}/#/challenges?id=${chal.id}`
    };
  });

  // Марафонға тіркелу (Join)
  r.post('/api/challenges/:id/join', ['student'], ({ user, params }) => {
    const id = Number(params.id);
    const chal = db.get('SELECT * FROM reading_challenges WHERE id = ?', id);
    if (!chal) fail(404, 'challenge_not_found');

    const existing = db.get('SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?', id, user.id);
    if (existing) return { ok: true, message: 'already_joined', id: existing.id };

    const cls = classOf(db, user.id);
    const now = nowIso();
    const rawProgress = computeUserProgress(db, user, chal);
    const isCompleted = rawProgress >= chal.target_value ? 1 : 0;
    const certCode = isCompleted ? `CERT-CHAL-${id}-U${user.id}-${Math.random().toString(36).slice(2, 7).toUpperCase()}` : null;

    const rowId = db.run(
      `INSERT INTO challenge_participants(challenge_id, user_id, class_id, joined_at, current_progress, completed, completed_at, certificate_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id, user.id, cls?.id || null, now, rawProgress, isCompleted, isCompleted ? now : null, certCode
    ).lastInsertRowid;

    if (isCompleted) {
      award(db, user.id, 'challenge', id, chal.reward_xp);
    }

    return {
      ok: true,
      participant_id: rowId,
      current_progress: rawProgress,
      completed: !!isCompleted,
      certificate_code: certCode
    };
  });

  // Мұғалім немесе әкімші жаңа марафон құруы
  r.post('/api/challenges', ['teacher', 'admin'], ({ user, body }) => {
    const title = V.str(body.title, 'title', { min: 3, max: 120 });
    const description = V.str(body.description, 'description', { min: 5, max: 1000 });
    const challengeType = V.oneOf(body.challenge_type || 'days', 'challenge_type', ['days', 'pages', 'books', 'class_competition']);
    const targetValue = V.int(body.target_value, 'target_value', { min: 1, max: 100000 });
    const startDate = V.date(body.start_date || localDate(), 'start_date');
    const endDate = V.date(body.end_date, 'end_date');
    if (endDate < startDate) fail(400, 'end_date_before_start');

    const rewardXp = V.int(body.reward_xp ?? 150, 'reward_xp', { min: 10, max: 5000 });
    const badgeName = V.str(body.badge_name || 'Марафон Жеңімпазы', 'badge_name', { max: 60 });
    const badgeIcon = V.str(body.badge_icon || '🏆', 'badge_icon', { max: 10 });
    const scope = V.oneOf(body.scope || 'individual', 'scope', ['individual', 'class']);
    const classId = body.class_id ? Number(body.class_id) : null;

    const chalId = db.run(
      `INSERT INTO reading_challenges(title, description, challenge_type, target_value, start_date, end_date, reward_xp, badge_name, badge_icon, scope, class_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      title, description, challengeType, targetValue, startDate, endDate, rewardXp, badgeName, badgeIcon, scope, classId, user.id, nowIso()
    ).lastInsertRowid;

    return { ok: true, id: chalId };
  });

  // Ресми сертификат қалыптастыру және көру
  r.get('/api/challenges/:id/certificate', ['student', 'teacher', 'admin'], ({ user, params, query, req }) => {
    const id = Number(params.id);
    const chal = db.get('SELECT * FROM reading_challenges WHERE id = ?', id);
    if (!chal) fail(404, 'challenge_not_found');

    const targetUserId = (query.user_id && user.role !== 'student') ? Number(query.user_id) : user.id;
    const targetUser = db.get('SELECT id, nickname, avatar FROM users WHERE id = ?', targetUserId);
    if (!targetUser) fail(404, 'user_not_found');

    const part = db.get(
      'SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?',
      id, targetUser.id
    );

    if (!part || !part.completed) {
      fail(400, 'challenge_not_completed', { message: 'Марафон мақсаты әлі орындалмаған.' });
    }

    const host = getHost(req);
    const verifyUrl = `http://${host}/#/challenges?id=${chal.id}&cert=${part.certificate_code}`;
    const qrSvg = generateQrSvg(verifyUrl, { size: 120, title: 'Сертификатты растау' });

    return {
      certificate: {
        school: '№290 орта мектеп',
        ministry: 'Қазақстан Республикасы Оқу-ағарту министрлігі',
        title: 'ОҚЫРМАН МАРАФОНЫНЫҢ ЖЕҢІМПАЗ СЕРТИФИКАТЫ',
        student_id: targetUser.id,
        student_name: targetUser.nickname,
        avatar: targetUser.avatar,
        challenge_id: chal.id,
        challenge_title: chal.title,
        challenge_type: chal.challenge_type,
        target_value: chal.target_value,
        achieved_value: part.current_progress,
        badge_name: chal.badge_name,
        badge_icon: chal.badge_icon,
        reward_xp: chal.reward_xp,
        completed_at: (part.completed_at || nowIso()).slice(0, 10),
        certificate_code: part.certificate_code,
        verification_url: verifyUrl,
        qr_svg: qrSvg
      }
    };
  });

  // =========================================================================
  // 2. ELECTRONIC READING DIARY — ЭЛЕКТРОНДЫ ОҚЫРМАН КҮНДЕЛІГІ
  // =========================================================================

  // Оқушының электронды күнделік кітаптарының тізімі
  r.get('/api/diary/books', ['student', 'teacher'], ({ user, query }) => {
    const targetUserId = (query.user_id && user.role !== 'student') ? Number(query.user_id) : user.id;

    // Сөредегі және күнделікке тіркелген барлық кітаптар
    const diaryRows = db.all(
      `SELECT b.id AS book_id, b.title, b.author, b.genre, b.total_pages AS book_total_pages, b.cover_color, b.cover_emoji,
              rd.id AS diary_id, rd.start_date, rd.finish_date, rd.total_pages AS diary_total_pages, rd.pages_read,
              rd.opinion, rd.favorite_character, rd.impression, rd.summary, rd.rating, rd.created_at, rd.updated_at,
              sh.status AS shelf_status, sh.current_page AS shelf_current_page, sh.started_at AS shelf_added_at, sh.finished_at AS shelf_finished_at
       FROM books b
       LEFT JOIN reading_diary rd ON rd.book_id = b.id AND rd.user_id = ?
       LEFT JOIN shelf sh ON sh.book_id = b.id AND sh.user_id = ?
       WHERE rd.id IS NOT NULL OR sh.book_id IS NOT NULL
       ORDER BY COALESCE(rd.updated_at, sh.updated_at, rd.created_at) DESC`,
      targetUserId, targetUserId
    );

    const entries = diaryRows.map((row) => {
      // Соңғы оқылым журналынан деректерді нақтылау
      const logAgg = db.get(
        'SELECT COALESCE(SUM(page), 0) AS total_logged, MIN(log_date) AS first_log, MAX(log_date) AS last_log FROM reading_logs WHERE user_id = ? AND book_id = ?',
        targetUserId, row.book_id
      );

      const hasDiaryEntry = row.diary_id != null;
      return {
        id: row.diary_id || null,
        book_id: row.book_id,
        title: row.title,
        author: row.author,
        genre: row.genre,
        cover_color: row.cover_color,
        cover_emoji: row.cover_emoji,
        start_date: row.start_date || logAgg?.first_log || (row.shelf_added_at ? row.shelf_added_at.slice(0, 10) : localDate()),
        finish_date: row.finish_date || (row.shelf_finished_at ? row.shelf_finished_at.slice(0, 10) : null),
        total_pages: row.diary_total_pages || row.book_total_pages || 100,
        pages_read: row.pages_read || row.shelf_current_page || logAgg?.total_logged || 0,
        opinion: row.opinion || '',
        favorite_character: row.favorite_character || '',
        impression: row.impression || '',
        summary: row.summary || '',
        rating: row.rating ?? 5,
        has_diary_entry: hasDiaryEntry,
        status: row.shelf_status || (row.finish_date ? 'finished' : 'reading'),
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    return { entries };
  });

  // Нақты бір кітап бойынша электронды күнделік парағын алу
  r.get('/api/diary/books/:bookId', ['student', 'teacher'], ({ user, params, query }) => {
    const bookId = Number(params.bookId);
    const book = db.get('SELECT * FROM books WHERE id = ?', bookId);
    if (!book) fail(404, 'book_not_found');

    const targetUserId = (query.user_id && user.role !== 'student') ? Number(query.user_id) : user.id;
    const rd = db.get('SELECT * FROM reading_diary WHERE user_id = ? AND book_id = ?', targetUserId, bookId);
    const sh = db.get('SELECT * FROM shelf WHERE user_id = ? AND book_id = ?', targetUserId, bookId);
    const logAgg = db.get(
      'SELECT COALESCE(SUM(page), 0) AS total_logged, MIN(log_date) AS first_log, MAX(log_date) AS last_log FROM reading_logs WHERE user_id = ? AND book_id = ?',
      targetUserId, bookId
    );

    return {
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        genre: book.genre,
        total_pages: book.total_pages,
        cover_color: book.cover_color,
        cover_emoji: book.cover_emoji,
      },
      diary: {
        id: rd?.id || null,
        book_id: bookId,
        start_date: rd?.start_date || logAgg?.first_log || (sh?.started_at ? sh.started_at.slice(0, 10) : localDate()),
        finish_date: rd?.finish_date || (sh?.finished_at ? sh.finished_at.slice(0, 10) : null),
        total_pages: rd?.total_pages || sh?.total_pages || book.total_pages || 100,
        pages_read: rd?.pages_read || sh?.current_page || logAgg?.total_logged || 0,
        opinion: rd?.opinion || '',
        favorite_character: rd?.favorite_character || '',
        impression: rd?.impression || '',
        summary: rd?.summary || '',
        rating: rd?.rating ?? 5,
        created_at: rd?.created_at || null,
        updated_at: rd?.updated_at || null
      }
    };
  });

  // Электронды күнделік парағын сақтау немесе жаңарту
  r.post('/api/diary/books/:bookId', ['student'], ({ user, params, body }) => {
    const bookId = Number(params.bookId);
    const book = db.get('SELECT * FROM books WHERE id = ?', bookId);
    if (!book) fail(404, 'book_not_found');

    const startDate = body.start_date ? V.date(body.start_date, 'start_date') : localDate();
    const finishDate = body.finish_date ? V.date(body.finish_date, 'finish_date') : null;
    const totalPages = V.int(body.total_pages || book.total_pages || 100, 'total_pages', { min: 1, max: 100000 });
    const pagesRead = V.int(body.pages_read || 0, 'pages_read', { min: 0, max: 100000 });
    const opinion = V.str(body.opinion || '', 'opinion', { max: 3000, required: false });
    const favoriteCharacter = V.str(body.favorite_character || '', 'favorite_character', { max: 200, required: false });
    const impression = V.str(body.impression || '', 'impression', { max: 3000, required: false });
    const summary = V.str(body.summary || '', 'summary', { max: 3000, required: false });
    const rating = V.int(body.rating ?? 5, 'rating', { min: 1, max: 5 });

    const now = nowIso();
    db.run(
      `INSERT INTO reading_diary(user_id, book_id, start_date, finish_date, total_pages, pages_read, opinion, favorite_character, impression, summary, rating, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, book_id) DO UPDATE SET
         start_date = excluded.start_date,
         finish_date = excluded.finish_date,
         total_pages = excluded.total_pages,
         pages_read = excluded.pages_read,
         opinion = excluded.opinion,
         favorite_character = excluded.favorite_character,
         impression = excluded.impression,
         summary = excluded.summary,
         rating = excluded.rating,
         updated_at = excluded.updated_at`,
      user.id, bookId, startDate, finishDate, totalPages, pagesRead, opinion, favoriteCharacter, impression, summary, rating, now, now
    );

    // Күнделікті толтырғаны үшін 25 XP ынталандыру
    award(db, user.id, 'reflection', `diary_card_${bookId}`, 25);

    return { ok: true, message: 'diary_saved' };
  });

  // Оқушының толық электронды күнделік портфолиосы (PDF / Басып шығаруға дайын)
  r.get('/api/diary/portfolio', ['student', 'teacher'], ({ user, query, req }) => {
    const targetUserId = (query.user_id && user.role !== 'student') ? Number(query.user_id) : user.id;
    const targetUser = db.get('SELECT id, nickname, avatar FROM users WHERE id = ?', targetUserId);
    if (!targetUser) fail(404, 'user_not_found');

    const cls = classOf(db, targetUser.id);
    const host = getHost(req);

    const diaryEntries = db.all(
      `SELECT rd.*, b.title, b.author, b.genre, b.total_pages AS book_total_pages, b.cover_color, b.cover_emoji
       FROM reading_diary rd
       JOIN books b ON b.id = rd.book_id
       WHERE rd.user_id = ?
       ORDER BY rd.updated_at DESC`,
      targetUser.id
    );

    // Әр кітапқа QR-код генерациялау (басып шығарылған күнделіктен тікелей сканерлеу үшін)
    const cardsWithQr = diaryEntries.map((e) => {
      const bookUrl = `http://${host}/#/book/${e.book_id}`;
      return {
        ...e,
        qr_svg: generateQrSvg(bookUrl, { size: 100, title: e.title }),
        book_url: bookUrl
      };
    });

    const totalPages = db.get('SELECT COALESCE(SUM(page), 0) AS p FROM reading_logs WHERE user_id = ?', targetUser.id)?.p || 0;
    const totalMinutes = db.get('SELECT COALESCE(SUM(minutes), 0) AS m FROM reading_logs WHERE user_id = ?', targetUser.id)?.m || 0;
    const finishedBooks = db.get("SELECT COUNT(*) AS c FROM shelf WHERE user_id = ? AND status = 'finished'", targetUser.id)?.c || 0;
    const tree = computeStudentTreeStage(db, targetUser.id);

    return {
      portfolio: {
        school: '№290 орта мектеп',
        student_id: targetUser.id,
        student_name: targetUser.nickname,
        avatar: targetUser.avatar,
        class_name: cls?.name || '5 «А» сыныбы',
        stats: {
          total_pages: totalPages,
          total_minutes: totalMinutes,
          finished_books: finishedBooks,
          tree_stage: tree.stage,
          tree_name: tree.name,
          tree_icon: tree.icon,
          xp: totalXp(db, targetUser.id)
        },
        entries: cardsWithQr,
        generated_at: nowIso().slice(0, 10)
      }
    };
  });

  // =========================================================================
  // 3. QR BOOK SYSTEM — QR КІТАП ЖҮЙЕСІ & МЕКТЕП КІТАПХАНАСЫ КАТАЛОГЫ
  // =========================================================================

  // Кітаптың QR-кодын SVG форматында қайтару
  r.get('/api/books/:id/qr.svg', null, ({ params, req, res }) => {
    const id = Number(params.id);
    const book = db.get('SELECT id, title FROM books WHERE id = ?', id);
    if (!book) fail(404, 'book_not_found');

    const host = getHost(req);
    const bookUrl = `http://${host}/#/book/${book.id}`;
    const svg = generateQrSvg(bookUrl, { size: 240, title: book.title });

    res.writeHead(200, {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(svg);
  });

  // Кітаптың толық QR-карточкасы (кітапхана жапсырмасы үшін)
  r.get('/api/books/:id/qr-card', null, ({ params, req }) => {
    const id = Number(params.id);
    const book = db.get('SELECT * FROM books WHERE id = ?', id);
    if (!book) fail(404, 'book_not_found');

    const host = getHost(req);
    const bookUrl = `http://${host}/#/book/${book.id}`;
    const qrSvg = generateQrSvg(bookUrl, { size: 160, title: book.title });
    const qrDataUri = generateQrDataUri(bookUrl, { size: 160, title: book.title });

    return {
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        genre: book.genre,
        total_pages: book.total_pages,
        cover_color: book.cover_color,
        cover_emoji: book.cover_emoji,
      },
      school: '№290 орта мектеп',
      library_code: `№290-КИТ-${String(book.id).padStart(3, '0')}`,
      qr_url: bookUrl,
      qr_svg: qrSvg,
      qr_data_uri: qrDataUri
    };
  });

  // Мектеп кітапханасына арналған толық QR-каталог
  r.get('/api/library/qr-catalog', null, ({ req }) => {
    const books = db.all('SELECT * FROM books ORDER BY id ASC');
    const host = getHost(req);

    const catalog = books.map((b) => {
      const bookUrl = `http://${host}/#/book/${b.id}`;
      return {
        id: b.id,
        title: b.title,
        author: b.author,
        genre: b.genre,
        total_pages: b.total_pages,
        cover_color: b.cover_color,
        cover_emoji: b.cover_emoji,
        library_code: `№290-КИТ-${String(b.id).padStart(3, '0')}`,
        qr_url: bookUrl,
        qr_svg: generateQrSvg(bookUrl, { size: 130, title: b.title })
      };
    });

    return {
      school: '№290 орта мектеп кітапханасы',
      title: 'МЕКТЕП КІТАПХАНАСЫНЫҢ ИНТЕРАКТИВТІ QR-КАТАЛОГЫ',
      total_books: catalog.length,
      generated_at: nowIso().slice(0, 10),
      catalog
    };
  });

  // Кез келген мәтінге/сілтемеге арналған динамикалық QR-код генераторы
  r.get('/api/qr', null, ({ query, req, res }) => {
    const text = query.text || `http://${getHost(req)}/#/world`;
    const size = Math.min(600, Math.max(80, Number(query.size) || 200));
    const svg = generateQrSvg(text, { size, title: 'QR Code' });

    res.writeHead(200, {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(svg);
  });
}
