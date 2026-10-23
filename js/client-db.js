// Client database for Standalone / GitHub Pages execution
import { CLIENT_DATA } from './client-data.js';

const STORAGE_KEY = 'kt_standalone_db_v1';

function getDefaultState() {
  const books = CLIENT_DATA.books || [];
  
  const bKoja = books.find(b => b.title.includes('Қожа')) || books[1];
  const bPrince = books.find(b => b.title.includes('ханзада')) || books[2];
  const bShahanov = books.find(b => b.title.includes('Өркениет')) || books[8];
  const bBulaq = books[0];
  const bAbay = books.find(b => b.title.includes('Абай жолы')) || books[9];

  return {
    currentUser: {
      id: 1,
      role: 'student',
      nickname: 'Құлахметова Аягөз',
      avatar: 'owl',
      decor: null,
      scene: 'scene_steppe',
      lang: 'kk',
      is_demo: false,
      onboarded: true,
      tips_seen: true,
      daily_minutes: 15,
      weekly_days: 5,
      xp: 325,
      crystals: 12,
      streak: { count: 4, active_today: true, next_milestone: 5 },
      class: { id: 1, name: '11А сынып', level: 'senior', is_demo: false }
    },
    reading_logs: [
      { id: 1, book_id: bKoja ? bKoja.id : 2, page: 140, minutes: 25, note: 'Қожаның өзін тәрбиелеуге ұмтылысы өте үлгі боларлық.', created_at: '2026-10-21T14:00:00' },
      { id: 2, book_id: bPrince ? bPrince.id : 3, page: 96, minutes: 20, note: 'Түлкінің сөзі нағыз өмірлік даналық.', created_at: '2026-10-22T16:00:00' },
      { id: 3, book_id: bBulaq ? bBulaq.id : 1, page: 6, minutes: 15, note: 'Картаны тапқан сәт өте қызықты суреттелген.', created_at: '2026-10-23T10:00:00' }
    ],
    shelf: [
      { id: 1, book_id: bKoja ? bKoja.id : 2, status: 'finished', current_page: 140, total_pages: 140, percent: 100 },
      { id: 2, book_id: bPrince ? bPrince.id : 3, status: 'finished', current_page: 96, total_pages: 96, percent: 100 },
      { id: 3, book_id: bShahanov ? bShahanov.id : 9, status: 'finished', current_page: 180, total_pages: 180, percent: 100 },
      { id: 4, book_id: bBulaq ? bBulaq.id : 1, status: 'reading', current_page: 6, total_pages: 10, percent: 60 },
      { id: 5, book_id: bAbay ? bAbay.id : 10, status: 'want', current_page: 0, total_pages: 380, percent: 0 }
    ],
    diary_entries: [
      {
        id: 1,
        book_id: bAbay ? bAbay.id : 10,
        book_title: bAbay ? bAbay.title : 'Абай жолы',
        book_author: bAbay ? bAbay.author : 'Мұхтар Әуезов',
        kind: 'quote',
        text: '«Адам баласына адам баласының бәрі — дос, бауыр.»',
        quote_author: 'Абай Құнанбайұлы',
        page: 45,
        thoughts: 'Абай атамыздың бұл дана сөзі қазіргі қоғамда өте өзекті құндылық.',
        created_at: '2026-10-21T14:00:00'
      },
      {
        id: 2,
        book_id: bPrince ? bPrince.id : 3,
        book_title: bPrince ? bPrince.title : 'Кішкентай ханзада',
        book_author: bPrince ? bPrince.author : 'Антуан де Сент-Экзюпери',
        kind: 'quote',
        text: '«Ақиқатты тек жүрекпен сезінесің. Ең басты құндылық көзге көрінбейді.»',
        quote_author: 'Түлкі (Кішкентай ханзада)',
        page: 68,
        thoughts: 'Шынайы достық пен мейірім тек жүрекпен сезіледі.',
        created_at: '2026-10-22T17:00:00'
      },
      {
        id: 3,
        book_id: bKoja ? bKoja.id : 2,
        book_title: bKoja ? bKoja.title : 'Менің атым Қожа',
        book_author: bKoja ? bKoja.author : 'Бердібек Соқпақбаев',
        kind: 'quote',
        text: '«Мен тентек болсам да, әділдікті жақсы көремін.»',
        quote_author: 'Қожа',
        page: 12,
        thoughts: 'Қожаның бұл сөзі оның шыншыл мінезін көрсетеді.',
        created_at: '2026-10-23T10:00:00'
      }
    ],
    class_entries: [
      {
        id: 101,
        student_nickname: 'Құлахметова Аягөз',
        student_avatar: 'owl',
        book_id: bKoja ? bKoja.id : 2,
        book_title: bKoja ? bKoja.title : 'Менің атым Қожа',
        book_author: bKoja ? bKoja.author : 'Бердібек Соқпақбаев',
        kind: 'quote',
        text: '«Мен тентек болсам да, әділдікті жақсы көремін.»',
        quote_author: 'Қожа',
        page: 12,
        is_own: true,
        created_at: '2026-10-23T10:00:00'
      },
      {
        id: 102,
        student_nickname: 'Дана Серікқызы',
        student_avatar: 'fox',
        book_id: 8,
        book_title: 'Қара сөздер',
        book_author: 'Абай Құнанбайұлы',
        kind: 'quote',
        text: '«Ғылым таппай мақтанба, орын таппай баптанба.»',
        quote_author: 'Абай Құнанбайұлы',
        page: 22,
        is_own: false,
        created_at: '2026-10-23T09:15:00'
      },
      {
        id: 103,
        student_nickname: 'Мирас Нұрланұлы',
        student_avatar: 'horse',
        book_id: 1,
        book_title: 'Ұмытылған бұлақ',
        book_author: 'Қазақ балалар әдебиеті',
        kind: 'quote',
        text: '«Табиғатты аялаған бала — елінің нағыз жанашыры.»',
        quote_author: 'Ақбота',
        page: 9,
        is_own: false,
        created_at: '2026-10-22T18:00:00'
      },
      {
        id: 104,
        student_nickname: 'Әлихан Болатұлы',
        student_avatar: 'wolf',
        book_id: 6,
        book_title: 'Бала Тұрар',
        book_author: 'Шерхан Мұртаза',
        kind: 'quote',
        text: '«Қиындықтан қорықпаған, білімге ұмтылған адам ғана мұратына жетеді.»',
        quote_author: 'Шерхан Мұртаза',
        page: 112,
        is_own: false,
        created_at: '2026-10-22T15:20:00'
      },
      {
        id: 105,
        student_nickname: 'Әлихан Болатұлы',
        student_avatar: 'wolf',
        book_id: 9,
        book_title: 'Өркениеттің адасуы',
        book_author: 'Мұхтар Шаханов',
        kind: 'quote',
        text: '«Төрт анасын сыйламаған халықтың тамыры шіриді: Туған жері, туған тілі, салт-дәстүрі және тарихы.»',
        quote_author: 'Мұхтар Шаханов',
        page: 54,
        is_own: false,
        created_at: '2026-10-20T11:30:00'
      }
    ],
    leaderboard: [
      {
        rank: 1,
        nickname: 'Әлихан Болатұлы',
        avatar: 'wolf',
        xp: 440,
        crystals: 16,
        reading_days: 7,
        streak: 7,
        tree: { level: 4, name: 'Жемісті Бәйтерек', icon: '🍎🌳' }
      },
      {
        rank: 2,
        nickname: 'Құлахметова Аягөз',
        avatar: 'owl',
        xp: 325,
        crystals: 12,
        reading_days: 4,
        streak: 4,
        tree: { level: 3, name: 'Жасыл Бәйтерек', icon: '🌳' },
        is_me: true
      },
      {
        rank: 3,
        nickname: 'Дана Серікқызы',
        avatar: 'fox',
        xp: 160,
        crystals: 8,
        reading_days: 4,
        streak: 4,
        tree: { level: 3, name: 'Жасыл Бәйтерек', icon: '🌳' }
      },
      {
        rank: 4,
        nickname: 'Мирас Нұрланұлы',
        avatar: 'horse',
        xp: 150,
        crystals: 6,
        reading_days: 3,
        streak: 3,
        tree: { level: 3, name: 'Жасыл Бәйтерек', icon: '🌳' }
      },
      {
        rank: 5,
        nickname: 'Айзере Мұратқызы',
        avatar: 'cat',
        xp: 20,
        crystals: 2,
        reading_days: 1,
        streak: 1,
        tree: { level: 1, name: 'Жас өскін', icon: '🌱' }
      },
      {
        rank: 6,
        nickname: 'Нұрсұлтан Қанатұлы',
        avatar: 'bear',
        xp: 10,
        crystals: 0,
        reading_days: 0,
        streak: 0,
        tree: { level: 1, name: 'Жас өскін', icon: '🌱' }
      }
    ]
  };
}

class ClientDb {
  constructor() {
    this.books = CLIENT_DATA.books || [];
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.state = raw ? JSON.parse(raw) : getDefaultState();
    } catch {
      this.state = getDefaultState();
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {}
  }

  handle(method, url, body) {
    const u = new URL(url, 'http://localhost');
    const path = u.pathname;

    if (path === '/api/me') {
      return { user: this.state.currentUser };
    }

    if (path === '/api/auth/demo') {
      const role = body?.role || 'student';
      if (role === 'teacher') {
        this.state.currentUser = {
          id: 99,
          role: 'teacher',
          nickname: 'Сәуле Маратқызы',
          login: 'demo.mugalim',
          avatar: 'owl',
          lang: 'kk',
          is_demo: false,
          classes: [{ id: 1, name: '11А сынып', level: 'senior', invite_code: 'DEMO25' }]
        };
      } else {
        this.state.currentUser = getDefaultState().currentUser;
      }
      this.save();
      return { user: this.state.currentUser };
    }

    if (path === '/api/auth/logout') {
      this.state.currentUser = null;
      this.save();
      return { ok: true };
    }

    if (path === '/api/world') {
      const curShelf = this.state.shelf.find(s => s.status === 'reading') || this.state.shelf[0];
      const curBook = curShelf ? this.books.find(b => b.id === curShelf.book_id) : (this.books[0] || null);
      return {
        current: curBook ? { book: curBook, shelf: curShelf } : null,
        journey: { current: 3, stages: [1, 2, 3, 4, 5].map(i => ({ no: i, status: i < 3 ? 'done' : (i === 3 ? 'current' : 'locked') })) },
        next: { kind: 'read', page: 8, title: 'Кітапты оқу' },
        today: { minutes: this.state.currentUser?.daily_minutes || 15, logged: true },
        week: {
          target: this.state.currentUser?.weekly_days || 5,
          done: 4,
          days: [
            { date: '2026-10-19', read: true, today: false, future: false },
            { date: '2026-10-20', read: true, today: false, future: false },
            { date: '2026-10-21', read: true, today: false, future: false },
            { date: '2026-10-22', read: true, today: false, future: false },
            { date: '2026-10-23', read: true, today: true, future: false },
            { date: '2026-10-24', read: false, today: false, future: true },
            { date: '2026-10-25', read: false, today: false, future: true }
          ]
        },
        streak: this.state.currentUser?.streak || { count: 4, active_today: true, next_milestone: 5 },
        xp: this.state.currentUser?.xp || 325,
        crystals: this.state.currentUser?.crystals || 12,
        has_quiz: true,
        last_reward: { name: 'Дала пейзажы', emoji: '🌾', earned_at: '2026-10-20T10:00:00' },
        feedback: null,
        motivations: ['Күнделікті 10 минут оқу — үлкен жетістіктің бастауы!'],
        scene: this.state.currentUser?.scene || 'scene_steppe'
      };
    }

    if (path === '/api/shelf') {
      const reading = [];
      const finished = [];
      const want = [];

      for (const item of this.state.shelf) {
        const b = this.books.find(x => x.id === item.book_id);
        if (!b) continue;
        const entry = { ...b, ...item };
        if (item.status === 'finished') finished.push(entry);
        else if (item.status === 'reading') reading.push(entry);
        else want.push(entry);
      }
      return { reading, finished, want };
    }

    const shelfItemMatch = path.match(/^\/api\/shelf\/(\d+)$/);
    if (shelfItemMatch) {
      const bookId = Number(shelfItemMatch[1]);
      if (method === 'PUT') {
        let item = this.state.shelf.find(s => s.book_id === bookId);
        if (!item) {
          const b = this.books.find(x => x.id === bookId);
          item = { id: Date.now(), book_id: bookId, status: body.status || 'reading', current_page: body.current_page || 0, total_pages: b ? b.total_pages : 100, percent: 0 };
          this.state.shelf.push(item);
        } else {
          Object.assign(item, body);
        }
        this.save();
        return { ok: true, item };
      }
      if (method === 'DELETE') {
        this.state.shelf = this.state.shelf.filter(s => s.book_id !== bookId);
        this.save();
        return { ok: true };
      }
    }

    if (path === '/api/books') {
      let list = this.books;
      const genre = u.searchParams.get('genre');
      const q = u.searchParams.get('q');
      if (genre && genre !== 'all' && genre !== 'Барлығы') {
        list = list.filter(b => b.genre === genre);
      }
      if (q) {
        const query = q.toLowerCase();
        list = list.filter(b => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query));
      }
      return { books: list, total: list.length };
    }

    const quizMatch = path.match(/^\/api\/books\/(\d+)\/quiz$/);
    if (quizMatch) {
      const bookId = Number(quizMatch[1]);
      const book = this.books.find(b => b.id === bookId);
      if (method === 'POST') {
        const answers = body.answers || [];
        const quiz = book ? book.quiz : null;
        let correctCount = 0;
        if (quiz && quiz.questions) {
          quiz.questions.forEach((q, idx) => {
            if (answers[idx] === q.correct) correctCount++;
          });
        }
        const passed = correctCount >= (quiz ? Math.ceil(quiz.questions.length * 0.6) : 1);
        const xpAwarded = passed ? (quiz ? quiz.xp_reward : 15) : 5;
        const crystalsAwarded = passed ? (quiz ? quiz.crystals_reward : 2) : 0;
        if (this.state.currentUser) {
          this.state.currentUser.xp = (this.state.currentUser.xp || 0) + xpAwarded;
          this.state.currentUser.crystals = (this.state.currentUser.crystals || 0) + crystalsAwarded;
        }
        this.save();
        return {
          ok: true,
          passed,
          correct_count: correctCount,
          total_count: quiz ? quiz.questions.length : answers.length,
          xp_awarded: xpAwarded,
          crystals_awarded: crystalsAwarded,
          feedback: passed ? 'Жарайсың! Кейіпкердің сұрақтарына керемет жауап бердің!' : 'Жақсы талпыныс! Тағы бір рет оқып көр.'
        };
      }
      return { quiz: book ? (book.quiz || null) : null };
    }

    const bookMatch = path.match(/^\/api\/books\/(\d+)$/);
    if (bookMatch) {
      const bookId = Number(bookMatch[1]);
      const book = this.books.find(b => b.id === bookId);
      if (!book) throw new Error('book_not_found');
      const shelf = this.state.shelf.find(s => s.book_id === bookId) || null;
      return {
        book,
        shelf,
        chapters: book.chapters || [],
        quiz: book.quiz || null
      };
    }

    if (path === '/api/diary') {
      const entries = this.state.diary_entries || [];
      const classEntries = this.state.class_entries || [];
      return {
        entries,
        class_entries: classEntries,
        stats: {
          total: entries.length,
          quotes: entries.filter(e => e.kind === 'quote').length,
          audio: entries.filter(e => e.kind === 'audio').length,
          notes: entries.filter(e => e.kind !== 'quote' && e.kind !== 'audio').length,
          class_total: classEntries.length
        }
      };
    }

    if (path === '/api/mission' || path === '/api/missions') {
      return {
        class: { id: 1, name: '11А сынып', invite_code: 'DEMO25' },
        missions: [
          {
            id: 1,
            title: 'Білім бағы: 20 оқу күні',
            description: 'Әрбір оқу күні сынып бағына бір жаңа жеміс пен көшет сыйлайды.',
            progress: 17,
            target: 20,
            percent: 85,
            mine: 4
          }
        ]
      };
    }

    if (path === '/api/leaderboard') {
      return {
        class_name: '11А сынып',
        leaderboard: this.state.leaderboard || []
      };
    }

    if (path === '/api/achievements') {
      const user = this.state.currentUser || { xp: 325, crystals: 12 };
      const finished = this.state.shelf
        .filter(s => s.status === 'finished')
        .map(s => {
          const b = this.books.find(x => x.id === s.book_id) || {};
          return { id: s.book_id, title: b.title || 'Кітап', cover_color: b.cover_color, cover_emoji: b.cover_emoji };
        });

      return {
        xp: user.xp || 325,
        crystals: user.crystals || 12,
        streak: user.streak || { count: 4, active_today: true, next_milestone: 5 },
        badges: [
          {
            id: 'first_book',
            title: 'Алғашқы кітап',
            icon: '📖',
            color: '#3b82f6',
            desc: 'Кемінде 1 кітапты басынан аяғына дейін толық оқып бітіру',
            unlocked: finished.length >= 1,
            progress: `${Math.min(1, finished.length)}/1 кітап`
          },
          {
            id: 'streak_reader',
            title: 'Тұрақты оқырман',
            icon: '🔥',
            color: '#ef4444',
            desc: '3 күн немесе одан көп күн қатарынан кітап оқу сериясын сақтау',
            unlocked: true,
            progress: '4/3 күн'
          },
          {
            id: 'page_marathon',
            title: '100 беттік марафоншы',
            icon: '🏃‍♂️',
            color: '#10b981',
            desc: 'Кітаптардан жалпы 100 беттен астам оқып шығу',
            unlocked: true,
            progress: '416/100 бет'
          },
          {
            id: 'word_master',
            title: 'Сөз зергері',
            icon: '✍️',
            color: '#8b5cf6',
            desc: 'Оқырман күнделігіне кемінде 3 дәйексөз не жазба қалдыру',
            unlocked: (this.state.diary_entries || []).length >= 3,
            progress: `${Math.min(3, (this.state.diary_entries || []).length)}/3 жазба`
          },
          {
            id: 'quiz_master',
            title: 'Кейіпкер досы',
            icon: '🧠',
            color: '#f59e0b',
            desc: 'Кейіпкерлердің интерактивті квиз-сұрақтарынан сәтті өту',
            unlocked: true,
            progress: '1/1 квиз'
          },
          {
            id: 'tree_peak',
            title: 'Бәйтерек шыңы',
            icon: '🌳',
            color: '#16a34a',
            desc: '«Бәйтерек — Білім ағашының» 3-деңгейіне («Жасыл Бәйтерек») жету',
            unlocked: (user.xp || 325) >= 250,
            progress: '3/3 деңгей'
          }
        ],
        stats: {
          xp: user.xp || 325,
          finishedBooks: finished.length,
          totalPages: 416,
          streak: 4,
          maxStages: 5,
          responses: 3,
          logs: (this.state.reading_logs || []).length
        },
        rules: {
          log_per_day: 10,
          book_finish: 50,
          sentence: 5,
          quiz_reward: 15
        },
        rewards: [
          { id: 'badge_first_book', type: 'badge', emoji: '📖', owned: true, earned_at: '2026-10-20T10:00:00' },
          { id: 'badge_streak', type: 'badge', emoji: '🔥', owned: true, earned_at: '2026-10-21T10:00:00' },
          { id: 'decor_feather', type: 'decor', emoji: '🪶', owned: true, earned_at: '2026-10-22T10:00:00' },
          { id: 'item_dombyra', type: 'shelf_item', emoji: '🪕', owned: true, earned_at: '2026-10-22T12:00:00' },
          { id: 'scene_steppe', type: 'scene', emoji: '🌾', owned: true, earned_at: '2026-10-20T10:00:00' }
        ],
        equipped: {
          decor: user.decor || null,
          scene: user.scene || 'scene_steppe',
          avatar: user.avatar || 'owl'
        },
        history: [
          { kind: 'book_finished', label: '«Менің атым Қожа» кітабын аяқтады', amount: 50, created_at: '2026-10-21T14:00:00' },
          { kind: 'daily_log', label: 'Күнделікті 20 минут оқу', amount: 10, created_at: '2026-10-22T16:00:00' },
          { kind: 'quiz', label: '«Ақбота» кейіпкер сұрақтары (+15 XP, +2 💎)', amount: 15, created_at: '2026-10-23T10:00:00' }
        ],
        finished_books: finished,
        stages_reached: 3
      };
    }

    const logMatch = path.match(/^\/api\/books\/(\d+)\/logs$/);
    if ((path === '/api/logs' || logMatch) && method === 'POST') {
      const bookId = Number(logMatch ? logMatch[1] : (body.book_id || body.bookId));
      const page = Number(body.page);
      const note = body.note || '';
      
      let s = this.state.shelf.find(x => x.book_id === bookId);
      if (!s) {
        const b = this.books.find(x => x.id === bookId);
        s = { id: Date.now(), book_id: bookId, status: 'reading', current_page: page, total_pages: b ? b.total_pages : 100, percent: 10 };
        this.state.shelf.push(s);
      }
      s.current_page = page;
      s.percent = Math.min(100, Math.round((page / s.total_pages) * 100));
      if (s.percent >= 100) s.status = 'finished';

      if (this.state.currentUser) {
        this.state.currentUser.xp = (this.state.currentUser.xp || 0) + 10;
        if (!this.state.currentUser.streak) this.state.currentUser.streak = { count: 1, active_today: true, next_milestone: 3 };
        this.state.currentUser.streak.active_today = true;
      }
      this.save();
      return { ok: true, xp_awarded: 10 };
    }

    if (path === '/api/diary' && method === 'POST') {
      const bookId = Number(body.book_id);
      const b = this.books.find(x => x.id === bookId);
      const newEntry = {
        id: Date.now(),
        book_id: bookId,
        book_title: b ? b.title : 'Кітап',
        book_author: b ? b.author : '',
        kind: body.kind || 'quote',
        text: body.text || '',
        quote_author: body.quote_author || null,
        page: body.page || null,
        audio_url: body.audio_url || null,
        created_at: new Date().toISOString()
      };
      this.state.diary_entries.unshift(newEntry);
      if (this.state.currentUser) {
        this.state.currentUser.xp = (this.state.currentUser.xp || 0) + 5;
      }
      this.save();
      return { ok: true, xp_awarded: 5, entry: newEntry };
    }

    if (path === '/api/responses/seen' && method === 'POST') {
      return { ok: true };
    }

    return { ok: true };
  }
}

export const clientDb = new ClientDb();
