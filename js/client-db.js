// Client database for Standalone / GitHub Pages execution
import { CLIENT_DATA } from './client-data.js';

const STORAGE_KEY = 'kt_standalone_db_v2';

function getDefaultState() {
  const books = CLIENT_DATA.books || [];
  
  const bKoja = books.find(b => b?.title?.includes('Қожа')) || books[1] || books[0];
  const bPrince = books.find(b => b?.title?.includes('ханзада')) || books[2] || books[0];
  const bShahanov = books.find(b => b?.title?.includes('Өркениет')) || books[8] || books[0];
  const bBulaq = books[0] || { id: 1, title: 'Ұмытылған бұлақ', author: 'Қазақ балалар әдебиеті', cover_color: '#2e7d5b', cover_emoji: '💧', total_pages: 10 };
  const bAbay = books.find(b => b?.title?.includes('Абай жолы')) || books[9] || books[0];

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
    this.tasks = CLIENT_DATA.tasks || [];
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.state = raw ? JSON.parse(raw) : getDefaultState();
      if (!this.state || !this.state.currentUser || !Array.isArray(this.state.shelf) || this.state.shelf.length === 0) {
        this.state = getDefaultState();
      }
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

    if (path === '/api/auth/login' && method === 'POST') {
      const login = (body?.login || '').trim().toLowerCase();
      const password = (body?.password || '').trim();
      if ((login === 'demo.mugalim' || login === 'mugalim' || login === 'teacher') && (password === 'demo1234' || password === 'demo' || password === '1234' || password === '12345678')) {
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
        this.save();
        return { user: this.state.currentUser };
      }
      throw new Error('Логин немесе құпиясөз қате! Дұрыс логин: demo.mugalim, құпиясөз: demo1234');
    }

    if (path === '/api/auth/student/login' && method === 'POST') {
      const nickname = (body?.nickname || '').trim() || 'Құлахметова Аягөз';
      this.state.currentUser = {
        ...getDefaultState().currentUser,
        nickname
      };
      this.save();
      return { user: this.state.currentUser };
    }

    if (path === '/api/auth/student/register' && method === 'POST') {
      const nickname = (body?.nickname || '').trim() || 'Жаңа оқушы';
      this.state.currentUser = {
        ...getDefaultState().currentUser,
        id: Date.now(),
        nickname,
        avatar: body?.avatar || 'owl'
      };
      this.save();
      return { user: this.state.currentUser };
    }

    if (path === '/api/auth/teacher/register' && method === 'POST') {
      const nickname = (body?.name || '').trim() || 'Мұғалім';
      this.state.currentUser = {
        id: 99,
        role: 'teacher',
        nickname,
        login: (body?.login || 'demo.mugalim').trim().toLowerCase(),
        avatar: 'owl',
        lang: 'kk',
        is_demo: false,
        classes: [{ id: 1, name: '11А сынып', level: 'senior', invite_code: 'DEMO25' }]
      };
      this.save();
      return { user: this.state.currentUser };
    }

    if (path === '/api/teacher/classes' && method === 'GET') {
      return {
        classes: [
          { id: 1, name: '11А сынып', level: 'senior', invite_code: 'DEMO25' }
        ]
      };
    }

    const overviewMatch = path.match(/^\/api\/teacher\/classes\/(\d+)\/overview$/);
    if (overviewMatch) {
      const classId = Number(overviewMatch[1]);
      const students = [
        {
          id: 1,
          nickname: 'Құлахметова Аягөз',
          avatar: 'owl',
          current_book: 'Ұмытылған бұлақ',
          percent: 60,
          stage_no: 3,
          stage_name: '3. Оқиғалар жолы',
          finished_books: 3,
          reading_days: 4,
          reading_days_7: 4,
          minutes: 70,
          games_done: 2,
          accepted: 2,
          pending: 0,
          diary_notes: 3,
          xp: 325,
          last_log: '2026-10-23'
        },
        {
          id: 2,
          nickname: 'Әлихан Болатұлы',
          avatar: 'owl',
          current_book: 'Абай жолы',
          percent: 80,
          stage_no: 4,
          stage_name: '4. Ой қазынасы',
          finished_books: 4,
          reading_days: 7,
          reading_days_7: 7,
          minutes: 120,
          games_done: 4,
          accepted: 4,
          pending: 0,
          diary_notes: 5,
          xp: 440,
          last_log: '2026-10-23'
        },
        {
          id: 3,
          nickname: 'Дана Серікқызы',
          avatar: 'fox',
          current_book: 'Менің атым Қожа',
          percent: 50,
          stage_no: 2,
          stage_name: '2. Кейіпкерлер мекені',
          finished_books: 1,
          reading_days: 4,
          reading_days_7: 3,
          minutes: 45,
          games_done: 1,
          accepted: 1,
          pending: 0,
          diary_notes: 2,
          xp: 160,
          last_log: '2026-10-22'
        },
        {
          id: 4,
          nickname: 'Мирас Нұрланұлы',
          avatar: 'owl',
          current_book: 'Кішкентай ханзада',
          percent: 40,
          stage_no: 2,
          stage_name: '2. Кейіпкерлер мекені',
          finished_books: 1,
          reading_days: 3,
          reading_days_7: 3,
          minutes: 40,
          games_done: 1,
          accepted: 1,
          pending: 0,
          diary_notes: 1,
          xp: 150,
          last_log: '2026-10-21'
        },
        {
          id: 5,
          nickname: 'Айзере Мұратқызы',
          avatar: 'fox',
          current_book: 'Қажымұқан',
          percent: 20,
          stage_no: 1,
          stage_name: '1. Бастау қақпасы',
          finished_books: 0,
          reading_days: 1,
          reading_days_7: 1,
          minutes: 15,
          games_done: 0,
          accepted: 0,
          pending: 0,
          diary_notes: 0,
          xp: 20,
          last_log: '2026-10-20'
        },
        {
          id: 6,
          nickname: 'Нұрсұлтан Қанатұлы',
          avatar: 'owl',
          current_book: 'Том Сойер',
          percent: 10,
          stage_no: 1,
          stage_name: '1. Бастау қақпасы',
          finished_books: 0,
          reading_days: 0,
          reading_days_7: 0,
          minutes: 0,
          games_done: 0,
          accepted: 0,
          pending: 0,
          diary_notes: 0,
          xp: 10,
          last_log: null
        }
      ];

      return {
        class: { id: classId, name: '11А сынып', level: 'senior', invite_code: 'DEMO25', is_demo: false },
        activity: {
          students: students.length,
          active_students_7: 5,
          reading_days_7: 19,
          minutes_7: 290,
          days: [
            { date: '2026-10-17', readers: 2 },
            { date: '2026-10-18', readers: 3 },
            { date: '2026-10-19', readers: 4 },
            { date: '2026-10-20', readers: 3 },
            { date: '2026-10-21', readers: 4 },
            { date: '2026-10-22', readers: 5 },
            { date: '2026-10-23', readers: 5 }
          ]
        },
        books: [
          { id: 1, title: 'Ұмытылған бұлақ', cover_color: '#2e7d5b', cover_emoji: '💧', readers: 4, not_started: 1, finished: 1, avg_percent: 65 },
          { id: 2, title: 'Менің атым Қожа', cover_color: '#3498db', cover_emoji: '🎒', readers: 3, not_started: 0, finished: 3, avg_percent: 100 },
          { id: 3, title: 'Кішкентай ханзада', cover_color: '#9b59b6', cover_emoji: '🌹', readers: 2, not_started: 1, finished: 2, avg_percent: 95 }
        ],
        tasks: (this.tasks || []).map(t => ({
          id: t.id,
          title: t.title,
          type: t.type,
          stage_no: t.stage_no,
          book_title: 'Ұмытылған бұлақ',
          completed: 4,
          attempted: 5,
          avg_tries: 1.2,
          submitted: 2,
          accepted: 2
        })),
        pending: 0,
        students,
        stage_distribution: [
          { stage: 1, name: 'Бастау қақпасы', count: 2 },
          { stage: 2, name: 'Кейіпкерлер мекені', count: 2 },
          { stage: 3, name: 'Оқиғалар жолы', count: 1 },
          { stage: 4, name: 'Ой қазынасы', count: 1 },
          { stage: 5, name: 'Кітап шыңы', count: 0 }
        ]
      };
    }

    if (path === '/api/teacher/reviews') {
      return { reviews: [] };
    }

    if (path.startsWith('/api/teacher/classes/') && path.endsWith('/missions')) {
      return { missions: [] };
    }

    const resetPinMatch = path.match(/^\/api\/teacher\/students\/(\d+)\/reset-pin$/);
    if (resetPinMatch && method === 'POST') {
      return { pin: '1234' };
    }

    const assignMatch = path.match(/^\/api\/teacher\/classes\/(\d+)\/assign$/);
    if (assignMatch && method === 'POST') {
      return { ok: true };
    }

    if (path === '/api/auth/logout') {
      this.state.currentUser = null;
      this.save();
      return { ok: true };
    }

    if (path === '/api/world') {
      const curShelf = (this.state.shelf || []).find(s => s.status === 'reading') || (this.state.shelf || [])[0] || null;
      const foundBook = curShelf ? this.books.find(b => Number(b.id) === Number(curShelf.book_id)) : null;
      const curBook = foundBook || this.books[0] || {
        id: 1,
        title: 'Ұмытылған бұлақ',
        author: 'Қазақ балалар әдебиеті',
        cover_color: '#2e7d5b',
        cover_emoji: '💧',
        total_pages: 10,
        has_text: true
      };
      const safeShelf = curShelf || { current_page: 6, total_pages: curBook.total_pages || 10, percent: 60 };
      return {
        current: { book: curBook, shelf: safeShelf },
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
      const grade = u.searchParams.get('grade');
      const lang = u.searchParams.get('lang');

      const allGenres = [...new Set(this.books.map(b => b.genre).filter(Boolean))].sort();
      const allInterests = [...new Set(this.books.flatMap(b => (b.interests || '').split(',')).filter(Boolean))].sort();
      const allLangs = [...new Set(this.books.map(b => b.language).filter(Boolean))];

      if (genre && genre !== 'all' && genre !== 'Барлығы') {
        list = list.filter(b => b.genre === genre);
      }
      if (grade) {
        const g = Number(grade);
        list = list.filter(b => (!b.grade_min || b.grade_min <= g) && (!b.grade_max || b.grade_max >= g));
      }
      if (lang) {
        list = list.filter(b => b.language === lang);
      }
      if (q) {
        const query = q.toLowerCase();
        list = list.filter(b => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query));
      }

      const mapped = list.map(b => {
        const sh = this.state.shelf.find(s => s.book_id === b.id);
        return {
          ...b,
          interests: typeof b.interests === 'string' ? b.interests.split(',').filter(Boolean) : (b.interests || []),
          has_text: Array.isArray(b.chapters) && b.chapters.length > 0,
          shelf: sh ? {
            status: sh.status,
            percent: sh.percent || (sh.total_pages ? Math.min(100, Math.round(((sh.current_page || 0) / sh.total_pages) * 100)) : 0),
            assigned: false
          } : null
        };
      });

      return {
        books: mapped,
        filters: {
          genres: allGenres,
          interests: allInterests,
          languages: allLangs
        },
        total: this.books.length
      };
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

    if (path === '/api/play') {
      const readingShelf = (this.state.shelf || []).find(s => s.status === 'reading') || (this.state.shelf || [])[0] || null;
      const foundBook = readingShelf ? this.books.find(b => Number(b.id) === Number(readingShelf.book_id)) : null;
      const curBook = foundBook || this.books[0] || {
        id: 1,
        title: 'Ұмытылған бұлақ',
        author: 'Қазақ балалар әдебиеті',
        cover_color: '#2e7d5b',
        cover_emoji: '💧'
      };
      const tasks = this.tasks || [];
      const prog = this.state.task_progress || {};

      const mappedTasks = tasks.map((t) => {
        const p = prog[t.id] || {};
        const isDone = !!p.completed;
        const isUnlocked = t.stage_no <= 3 || isDone;
        return {
          id: t.id,
          type: t.type,
          title: t.title || 'Ойын тапсырмасы',
          stage_no: t.stage_no,
          unlocked: isUnlocked,
          done: isDone,
          lock: !isUnlocked ? { reason: 'stage' } : null,
          response_status: null
        };
      });

      return {
        books: [
          {
            book: {
              id: curBook.id,
              title: curBook.title || 'Ұмытылған бұлақ',
              author: curBook.author || 'Қазақ балалар әдебиеті',
              cover_color: curBook.cover_color || '#2e7d5b',
              cover_emoji: curBook.cover_emoji || '💧'
            },
            started: true,
            current_stage: 3,
            next: { kind: 'task', title: 'Оқиғалар тізбегі' },
            tasks: mappedTasks
          }
        ],
        no_task_books: []
      };
    }

    const taskMatch = path.match(/^\/api\/tasks\/(\d+)$/);
    if (taskMatch && method === 'GET') {
      const taskId = Number(taskMatch[1]);
      const task = (this.tasks || []).find(t => t.id === taskId) || (this.tasks || [])[0];
      if (!task) throw new Error('task_not_found');
      const curBook = this.books.find(b => Number(b.id) === Number(task.book_id)) || this.books[0] || { id: 1, title: 'Ұмытылған бұлақ' };
      const prog = (this.state.task_progress || {})[taskId] || { tries: 0, completed: 0, wrong_streak: 0 };
      const resp = (this.state.task_responses || {})[taskId] || null;

      return {
        task: {
          id: task.id,
          book_id: task.book_id,
          type: task.type,
          stage_no: task.stage_no,
          title: task.title || 'Ойын тапсырмасы',
          instruction: task.instruction || '',
          example: task.example || '',
          source_chapter: task.source_chapter || null,
          source_excerpt: task.source_excerpt || null,
          payload: task.payload || {},
          status: 'published'
        },
        book: {
          id: curBook.id,
          title: curBook.title || 'Ұмытылған бұлақ',
          is_demo: false
        },
        state: {
          unlocked: true,
          done: !!prog.completed
        },
        progress: prog,
        response: resp,
        next: null
      };
    }

    const attemptMatch = path.match(/^\/api\/tasks\/(\d+)\/attempt$/);
    if (attemptMatch && method === 'POST') {
      const taskId = Number(attemptMatch[1]);
      const task = (this.tasks || []).find(t => t.id === taskId);
      if (!task) throw new Error('task_not_found');

      const ans = body.answer || {};
      const answer = task.answer || {};
      let isCorrect = false;
      let correctCount = 0;

      if (task.type === 'sequence') {
        const order = Array.isArray(ans.order) ? ans.order : [];
        const targetOrder = answer.order || [];
        isCorrect = order.length === targetOrder.length && order.every((id, i) => id === targetOrder[i]);
        correctCount = order.filter((id, i) => id === targetOrder[i]).length;
      } else if (['character', 'who_said', 'vocab', 'evidence'].includes(task.type)) {
        const choices = ans.choices || {};
        const keys = Object.keys(answer);
        correctCount = keys.filter(k => choices[k] === answer[k]).length;
        isCorrect = keys.length > 0 && correctCount === keys.length;
      }

      if (!this.state.task_progress) this.state.task_progress = {};
      const prev = this.state.task_progress[taskId] || { tries: 0, completed: 0, wrong_streak: 0 };
      prev.tries += 1;
      if (isCorrect) {
        prev.completed = 1;
        prev.wrong_streak = 0;
      } else {
        prev.wrong_streak += 1;
      }
      this.state.task_progress[taskId] = prev;

      let xpAwarded = 0;
      if (isCorrect && this.state.currentUser) {
        xpAwarded = 10;
        this.state.currentUser.xp = (this.state.currentUser.xp || 0) + xpAwarded;
      }
      this.save();

      const hints = task.hints || [];
      const feedback = isCorrect ? {
        status: 'correct',
        explanation: task.explanation || 'Керемет! Тапсырманы қатесіз орындап шықтың!'
      } : {
        status: 'retry',
        streak: prev.wrong_streak,
        hint: hints.length ? hints[Math.min(prev.wrong_streak - 1, hints.length - 1)] : 'Мәтінді мұқият оқып, қайта ойланып көр!',
        explanation: prev.wrong_streak >= 2 ? task.explanation : null,
        correct_count: correctCount
      };

      return {
        feedback,
        state: { unlocked: true, done: !!prev.completed },
        xp_awarded: xpAwarded
      };
    }

    const responseMatch = path.match(/^\/api\/tasks\/(\d+)\/response$/);
    if (responseMatch && method === 'POST') {
      const taskId = Number(responseMatch[1]);
      if (!this.state.task_responses) this.state.task_responses = {};
      this.state.task_responses[taskId] = {
        id: Date.now(),
        task_id: taskId,
        kind: body.kind || 'open',
        position: body.position || null,
        text: body.text || '',
        created_at: new Date().toISOString()
      };
      if (this.state.currentUser) {
        this.state.currentUser.xp = (this.state.currentUser.xp || 0) + 15;
      }
      this.save();
      return {
        ok: true,
        feedback: 'Жауабың қабылданды және мұғалімнің тексеруіне жіберілді! +15 XP'
      };
    }

    if (path === '/api/responses') {
      const responses = Object.values(this.state.task_responses || {});
      return { responses };
    }

    const reflMatch = path.match(/^\/api\/books\/(\d+)\/reflection$/);
    if (reflMatch && method === 'POST') {
      if (this.state.currentUser) {
        this.state.currentUser.xp = (this.state.currentUser.xp || 0) + 20;
      }
      this.save();
      return { ok: true, xp_awarded: 20 };
    }

    if (path === '/api/responses/seen' && method === 'POST') {
      return { ok: true };
    }

    return { ok: true };
  }
}

export const clientDb = new ClientDb();
