// Демо деректер: дерекқор бос болғанда бір рет жасалады.
// БАРЛЫҚ ДЕМО ДЕРЕКТЕР ОЙДАН ШЫҒАРЫЛҒАН (is_demo = 1).
import { hashSecret } from './auth.js';
import { DEMO_BOOK, DEMO_CHAPTERS, DEMO_TASKS } from './content/demo-story.js';
import { buildTask } from './lib/tasks.js';
import { recompute, syncDailyXp } from './lib/progress.js';
import { award } from './lib/xp.js';
import { checkRewards } from './lib/rewards.js';
import { addDays, localDate, nowIso } from './lib/util.js';

// Нақты шығармалар: мектеп оқушылары үшін бай кітапхана қоры (1-11 сыныптар)
export const CATALOG = [
  {
    title: 'Менің атым Қожа',
    author: 'Бердібек Соқпақбаев',
    description: 'Тентек әрі аңқау, бірақ арлы Қожа есімді баланың мектептегі және ауылдағы қызықты оқиғалары туралы повесть.',
    language: 'kk',
    genre: 'Повесть',
    interests: 'мектеп,достық,әзіл',
    grade_min: 5,
    grade_max: 7,
    total_pages: 140,
    cover_color: '#c0392b',
    cover_emoji: '🎒',
    chapters: [
      {
        title: '1-тарау. Менің атым — Қожа',
        body: 'Менің атым — Қожа. Әрине, бұл атымды өзім таңдаған жоқпын. Мен туғанда атам: «Қожа болсын, елге қожалық етсін» деп қойыпты. Бірақ мен әлі ешкімге қожалық етіп жүргенім жоқ. Мектептегі мұғалімдердің көбі мені тентек дейді. Бірақ мен жай ғана әділдікті жақсы көремін.',
        page_start: 1,
        page_end: 15
      },
      {
        title: '2-тарау. Сұлтанмен кездесу',
        body: 'Ауылдың шетінде Сұлтанды жолықтырдым. Сұлтан менен бір-екі жас үлкен, өзі сондай пысық әрі айлакер бала. «Қожа, жүр, өзенге барып шомылайық, балық аулаймыз» деді ол көзін қысып. Мен кітап оқуға уәде бергенімді есіме түсіріп кідірдім...',
        page_start: 16,
        page_end: 30
      }
    ]
  },
  {
    title: 'Кішкентай ханзада',
    author: 'Антуан де Сент-Экзюпери',
    description: 'Өз планетасынан саяхатқа шыққан кішкентай ханзада мен ұшқыштың кездесуі туралы терең философиялық ертегі-повесть.',
    language: 'kk',
    genre: 'Ертегі-повесть',
    interests: 'философия,достық,саяхат',
    grade_min: 4,
    grade_max: 9,
    total_pages: 96,
    cover_color: '#1f4e79',
    cover_emoji: '🌹',
    chapters: [
      {
        title: '1-тарау. Сахара шөліндегі кездесу',
        body: 'Ұшағым бұзылып, Сахара шөлінде жалғыз қалған едім. Бір күні таңертең ерекше нәзік дауыс естідім: «Өтінемін... маған бір қозының суретін салып берші!» Мен селк етіп ұшып түрегелдім. Қарсы алдымда алтын шашты, бекзат жүзді кішкентай бала тұр еді.',
        page_start: 1,
        page_end: 12
      },
      {
        title: '2-тарау. Түлкімен сырласу',
        body: '«Міне, менің құпиям, ол өте қарапайым: тек жүрекпен ғана анық көруге болады. Ең басты нәрсені көзбен көре алмайсың», — деді түлкі. «Өзің қолға үйреткен жандар үшін мәңгі жауаптысың. Сен өз раушаның үшін жауаптысың...»',
        page_start: 13,
        page_end: 25
      }
    ]
  },
  {
    title: 'Алтын сақа',
    author: 'Қазақ халық ертегісі',
    description: 'Ұмытып кеткен алтын сақасын алуға қайтып барған бала мен оның жүйрік тұлпары туралы қазақ халық ертегісі.',
    language: 'kk',
    genre: 'Ертегі',
    interests: 'ертегі,шытырман,батырлық',
    grade_min: 1,
    grade_max: 4,
    total_pages: 24,
    cover_color: '#b7791f',
    cover_emoji: '✨',
    chapters: [
      {
        title: '1-бөлім. Ескі жұрттағы сақа',
        body: 'Баяғыда бір бай болыпты. Оның жалғыз баласы бар екен. Баласы күні бойы алтын сақасымен асық ойнайды екен. Бір күні көш кезінде баласы алтын сақасын ескі жұртта ұмытып кетеді. Әкесінен рұқсат сұрап, сақасын іздеп қайта барады. Ескі жұртқа жетсе, бір төмпешіктің үстінде жалмауыз кемпір алтын сақаны қолына алып отыр екен.',
        page_start: 1,
        page_end: 12
      },
      {
        title: '2-бөлім. Тұлпардың көмегі',
        body: 'Бала астындағы жүйрік тайына: «Жалмауыздың қолындағы алтын сақамды қалай алам?» дейді. Тұлпары тіл бітіп: «Сен жалыма мықтап жабыс, мен оқтың зулағанындай зу етіп өтейін, сен сақаны іліп ал» дейді. Бала сақасын іліп алып, құстай ұшып құтылып кетеді.',
        page_start: 13,
        page_end: 24
      }
    ]
  },
  {
    title: 'Көксерек',
    author: 'Мұхтар Әуезов',
    description: 'Ауыл баласы Құрмаш пен қолға үйретілген түз тағысы — Көксерек қасқырдың күрделі қарым-қатынасы мен табиғат заңы.',
    language: 'kk',
    genre: 'Повесть',
    interests: 'табиғат,жануарлар,ерлік',
    grade_min: 5,
    grade_max: 8,
    total_pages: 64,
    cover_color: '#34495e',
    cover_emoji: '🐺',
    chapters: [
      {
        title: '1-бөлім. Апандағы бөлтіріктер',
        body: 'Қараадырдың терең жырасында қасқырдың апаны бар еді. Ауыл аңшылары қасқырдың ізіне түсіп, апаннан кішкентай көккөз бөлтіріктерді алып шықты. Құрмаш есімді бала солардың ішіндегі ең ірі, қабағы түйіңкі бөлтірікті өзіне қалап алып: «Атын Көксерек қоямын, оны жақсы ит етіп бағамын!» деп үйіне алып қайтты.',
        page_start: 1,
        page_end: 18
      },
      {
        title: '2-бөлім. Түз тағысы қолға үйренбейді',
        body: 'Көксерек күн санап өсіп, іріленді. Бірақ ол ауылдың басқа төбеттеріне ұқсамады: адамға жағынып құйрық бұлғамады, көзінде үнемі жабайы даланың ызғары мен еркіндік оты жанып тұрды. Тек Құрмаштың қолынан ғана тамақ жеп, оның даусын танитын.',
        page_start: 19,
        page_end: 35
      }
    ]
  },
  {
    title: 'Жусан иісі',
    author: 'Сайын Мұратбеков',
    description: 'Соғыс жылдарындағы ауыл өмірі, ерте есейген балалар мен жүрегі жылы Аянның әсерлі хикаясы.',
    language: 'kk',
    genre: 'Повесть',
    interests: 'тарих,достық,адамгершілік',
    grade_min: 5,
    grade_max: 8,
    total_pages: 48,
    cover_color: '#556b2f',
    cover_emoji: '🌾',
    chapters: [
      {
        title: '1-тарау. Аянның келуі',
        body: 'Аян ауылға соғыс жүріп жатқан ауыр жылдардың бірінде келді. Ақсақ, әлжуаз ғана бала еді, бірақ оның көздерінде сондай бір мейірім мен ерекше ұшқын бар еді. Кешқұрым ауыл балалары дөң басына жиналғанда, Аян бізге ешкім естімеген таңғажайып ертегілер айтып беретін.',
        page_start: 1,
        page_end: 20
      },
      {
        title: '2-тарау. Даланың жусан иісі',
        body: '«Жусанның иісін сезесіңдер ме?» деуші еді Аян қолына жусанды үгіп отырып. «Бұл — туған жердің иісі. Адам қайда жүрсе де, осы иісті сағынады. Әкем соғыстан оралғанда, оны осы дөң басында жусанның гүлін ұстап қарсы аламын» дейтін үмітпен.',
        page_start: 21,
        page_end: 48
      }
    ]
  },
  {
    title: 'Бала Тұрар',
    author: 'Шерхан Мұртаза',
    description: 'Қазақтың көрнекті қайраткері Тұрар Рысқұловтың қатал тағдырға мойымаған балалық шағы мен күрескерлік рухы туралы тарихи шығарма.',
    language: 'kk',
    genre: 'Роман-эссе',
    interests: 'тарих,ерлік,білім',
    grade_min: 6,
    grade_max: 9,
    total_pages: 210,
    cover_color: '#8b4513',
    cover_emoji: '🦅'
  },
  {
    title: 'Қара сөздер',
    author: 'Абай Құнанбайұлы',
    description: 'Абайдың адамгершілік, ғылым, еңбек және парасат туралы жазылған ой-толғаулары.',
    language: 'kk',
    genre: 'Философиялық проза',
    interests: 'философия,адамгершілік,ғылым',
    grade_min: 8,
    grade_max: 11,
    total_pages: 120,
    cover_color: '#4a3b2a',
    cover_emoji: '🪶'
  },
  {
    title: 'Абай жолы',
    author: 'Мұхтар Әуезов',
    description: 'Қазақ әдебиетінің шыңы — Абай Құнанбайұлының өмірі мен дәуірін бейнелейтін роман-эпопея.',
    language: 'kk',
    genre: 'Роман-эпопея',
    interests: 'тарих,әдебиет,мәдениет',
    grade_min: 9,
    grade_max: 11,
    total_pages: 380,
    cover_color: '#22543d',
    cover_emoji: '🐎'
  },
  {
    title: 'Балалық шаққа саяхат',
    author: 'Бердібек Соқпақбаев',
    description: 'Жазушының өз балалық шағы, мектеп кезеңі және кітапқа, білімге деген құштарлығы туралы повесть.',
    language: 'kk',
    genre: 'Повесть',
    interests: 'мектеп,білім,шынайы өмір',
    grade_min: 5,
    grade_max: 8,
    total_pages: 160,
    cover_color: '#2980b9',
    cover_emoji: '📖'
  },
  {
    title: 'Ер Төстік',
    author: 'Қазақ халық ертегісі',
    description: 'Ерназардың кенже ұлы Төстіктің жер асты патшалығына сапары және жауыздықты жеңуі туралы ертегі.',
    language: 'kk',
    genre: 'Батырлық ертегі',
    interests: 'ертегі,батырлық,достық',
    grade_min: 1,
    grade_max: 5,
    total_pages: 32,
    cover_color: '#d4ac0d',
    cover_emoji: '🛡️'
  },
  {
    title: 'Қарлығаштың құйрығы неге айыр?',
    author: 'Қазақ аңызы',
    description: 'Адам баласына адал достық танытқан мейірімді қарлығаш пен қаһарлы айдаһар туралы тәрбиелік аңыз.',
    language: 'kk',
    genre: 'Аңыз-ертегі',
    interests: 'табиғат,жануарлар,жақсылық',
    grade_min: 1,
    grade_max: 4,
    total_pages: 16,
    cover_color: '#27ae60',
    cover_emoji: '🕊️',
    chapters: [
      {
        title: '1-бөлім. Айдаһардың бұйрығы',
        body: 'Баяғы өткен заманда айдаһар барлық жануарлар мен құстарға әмір етіпті: «Маған дүниедегі ең тәтті қан қайсы екенін біліп келіңдер!» деп масаны жұмсапты. Маса жер-дүниені кезіп, барлық тіршілік иелерін шағып көріп, адам баласының қаны ең тәтті екенін біледі.',
        page_start: 1,
        page_end: 8
      },
      {
        title: '2-бөлім. Қарлығаштың ерлігі',
        body: 'Мұны естіген кішкентай мейірімді қарлығаш адамға қауіп төнбесін деп масаның тілін жұлып алады. Айдаһар ашуланып қарлығашты ұстамақ болғанда, қарлығаш зу етіп ұшып кетеді де, айдаһардың тырнағы құйрығының ортасын жұлып түседі. Содан бері қарлығаштың құйрығы айыр болыпты.',
        page_start: 9,
        page_end: 16
      }
    ]
  },
  {
    title: 'Шұғаның белгісі',
    author: 'Бейімбет Майлин',
    description: 'Қазақ әдебиетіндегі мөлдір махаббат пен қазақ қызының тағдырын баяндайтын классикалық повесть.',
    language: 'kk',
    genre: 'Повесть',
    interests: 'махаббат,тарих,адамгершілік',
    grade_min: 8,
    grade_max: 11,
    total_pages: 52,
    cover_color: '#9b59b6',
    cover_emoji: '🌸'
  },
  {
    title: 'Көшпенділер: Алмас қылыш',
    author: 'Ілияс Есенберлин',
    description: 'Қазақ хандығының құрылуы, Керей мен Жәнібек хандардың тарихи көрегендігі туралы тарихи роман.',
    language: 'kk',
    genre: 'Тарихи роман',
    interests: 'тарих,батырлық,қазақ елі',
    grade_min: 8,
    grade_max: 11,
    total_pages: 320,
    cover_color: '#795548',
    cover_emoji: '⚔️'
  },
  {
    title: 'Қажымұқан',
    author: 'Қалмақан Әбдіқадыров',
    description: 'Қазақтың әлемге әйгілі тұңғыш кәсіпқой балуаны Қажымұқанның өмірі мен ерліктері.',
    language: 'kk',
    genre: 'Ғұмырнамалық повесть',
    interests: 'спорт,ерлік,тарих',
    grade_min: 5,
    grade_max: 8,
    total_pages: 180,
    cover_color: '#c0392b',
    cover_emoji: '🤼'
  },
  {
    title: 'Том Сойердің басынан кешкендері',
    author: 'Марк Твен',
    description: 'Тентек әрі тапқыр бала Том Сойер мен оның досы Гекльберри Финнің қызықты хикаялары.',
    language: 'kk',
    genre: 'Шытырман повесть',
    interests: 'шытырман,әзіл,достық',
    grade_min: 4,
    grade_max: 7,
    total_pages: 220,
    cover_color: '#e67e22',
    cover_emoji: '⛵'
  },
  {
    title: 'Робинзон Крузо',
    author: 'Даниэль Дефо',
    description: 'Елсіз аралда жалғыз қалып, 28 жыл бойы еңбекпен өмір сүрген теңізші туралы шытырман роман.',
    language: 'kk',
    genre: 'Шытырман роман',
    interests: 'саяхат,ерік-жігер,шытырман',
    grade_min: 5,
    grade_max: 8,
    total_pages: 280,
    cover_color: '#16a085',
    cover_emoji: '🏝️'
  },
  {
    title: 'Ұзыншұлық Пиппи',
    author: 'Астрид Линдгрен',
    description: 'Әлемдегі ең күшті, көңілді және еркін қыз Пиппидің қызықты хикаялары.',
    language: 'kk',
    genre: 'Балалар әдебиеті',
    interests: 'әзіл,ертегі,достық',
    grade_min: 2,
    grade_max: 5,
    total_pages: 150,
    cover_color: '#e91e63',
    cover_emoji: '👧'
  },
  {
    title: 'Гарри Поттер және пәлсапа тас',
    author: 'Дж. К. Роулинг',
    description: 'Өзінің сиқыршы екенін білген бала Гарридің Хогвартс мектебіндегі басынан кешкендері.',
    language: 'kk',
    genre: 'Фэнтези',
    interests: 'сиқыр,достық,шытырман',
    grade_min: 4,
    grade_max: 8,
    total_pages: 330,
    cover_color: '#673ab7',
    cover_emoji: '⚡'
  },
  {
    title: 'Чарли және шоколад фабрикасы',
    author: 'Роальд Даль',
    description: 'Кедей бала Чарлидің Вилли Вонканың ғажайып шоколад фабрикасына алтын билет ұтып алуы.',
    language: 'kk',
    genre: 'Қиял-ғажайып',
    interests: 'ертегі,тәрбие,шытырман',
    grade_min: 3,
    grade_max: 6,
    total_pages: 176,
    cover_color: '#795548',
    cover_emoji: '🍫'
  },
  {
    title: 'Өркениеттің адасуы',
    author: 'Мұхтар Шаханов',
    description: 'Адамзаттың рухани құндылықтары, ар-ұждан және өркениет мәселелері туралы терең ой салатын философиялық поэма.',
    language: 'kk',
    genre: 'Философиялық поэма',
    interests: 'философия,руханият,адамгершілік',
    grade_min: 8,
    grade_max: 11,
    total_pages: 180,
    cover_color: '#2c3e50',
    cover_emoji: '📜',
    chapters: [
      {
        title: '1-бөлім. Рухани тамыр мен ар-ұждан',
        body: 'Өркениет қарыштап дамыған сайын, адам баласы өз жүрегінің үніне жиі құлақ түруі керек. Ар-ождан мен ана тілі — ұлттың мәңгілік өмірлік тірегі. Егер адам рухынан ажыраса, кез келген байлық пен техникалық жетістік мәнін жоғалтады.',
        page_start: 1,
        page_end: 20
      }
    ]
  },
  {
    title: 'Денискины рассказы',
    author: 'Виктор Драгунский',
    description: 'Весёлые и поучительные рассказы о мальчике Дениске и его друге Мишке.',
    language: 'ru',
    genre: 'Рассказы',
    interests: 'әзіл,мектеп,достық',
    grade_min: 1,
    grade_max: 4,
    total_pages: 120,
    cover_color: '#d35400',
    cover_emoji: '😄'
  },
  {
    title: 'Тимур и его команда',
    author: 'Аркадий Гайдар',
    description: 'Повесть о Тимуре и его друзьях, которые тайно помогают семьям фронтовиков.',
    language: 'ru',
    genre: 'Повесть',
    interests: 'достық,көмек,ерлік',
    grade_min: 4,
    grade_max: 6,
    total_pages: 110,
    cover_color: '#2c3e50',
    cover_emoji: '⭐'
  },
  {
    title: 'Капитанская дочка',
    author: 'Александр Пушкин',
    description: 'Историческая повесть о чести, верности слову и любви Петра Гринёва.',
    language: 'ru',
    genre: 'Историческая повесть',
    interests: 'тарих,абырой,махаббат',
    grade_min: 7,
    grade_max: 9,
    total_pages: 160,
    cover_color: '#3f51b5',
    cover_emoji: '🏰'
  }
];

export function ensureCatalog(db) {
  const now = nowIso();
  db.tx(() => {
    for (const b of CATALOG) {
      let existing = db.get('SELECT id FROM books WHERE title = ? AND author = ?', b.title, b.author);
      let bookId;
      if (!existing) {
        bookId = db.run(
          `INSERT INTO books(title, author, description, language, genre, interests, grade_min, grade_max, total_pages, cover_color, cover_emoji, visibility, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,'public',?)`,
          b.title, b.author, b.description, b.language, b.genre, b.interests, b.grade_min, b.grade_max, b.total_pages || null, b.cover_color, b.cover_emoji, now,
        ).lastInsertRowid;
      } else {
        bookId = existing.id;
        db.run(
          `UPDATE books SET description = ?, language = ?, genre = ?, interests = ?, grade_min = ?, grade_max = ?, total_pages = COALESCE(total_pages, ?), cover_color = ?, cover_emoji = ?
           WHERE id = ?`,
          b.description, b.language, b.genre, b.interests, b.grade_min, b.grade_max, b.total_pages || null, b.cover_color, b.cover_emoji, bookId,
        );
      }

      if (b.chapters && b.chapters.length > 0) {
        const chCount = db.get('SELECT COUNT(*) AS c FROM chapters WHERE book_id = ?', bookId).c;
        if (chCount === 0) {
          b.chapters.forEach((c, idx) => {
            db.run(
              'INSERT INTO chapters(book_id, idx, title, body, page_start, page_end) VALUES (?,?,?,?,?,?)',
              bookId, idx + 1, c.title, c.body, c.page_start, c.page_end,
            );
          });
        }
      }
    }
    ensureQuizzes(db);
  });
}

export function ensureQuizzes(db) {
  const now = nowIso();
  const quizzes = [
    {
      bookTitle: 'Ұмытылған бұлақ',
      character_name: 'Ақбота',
      character_avatar: '👧',
      character_intro: 'Сәлем! Мен Ақботамын. Атамның ескі картасы арқылы ұмытылған бұлақты іздеген саяхатымыз жайлы сұрақтарыма жауап беріп көрші!',
      xp_reward: 15,
      crystals_reward: 2,
      questions: [
        {
          question: 'Ақбота ескі картаны қайдан тауып алды?',
          options: ['Әжесінің ескі сандығынан', 'Мектеп кітапханасынан', 'Ерасылдың сөмкесінен', 'Ауыл дүкенінен'],
          correct: 0,
          explanation: 'Ақбота жазғы демалыста әжесінің ескі сандығынан атасы салған картаны тауып алды.'
        },
        {
          question: 'Ақбота мен Ерасылға бұлақты іздеуге еріп шыққан иттің аты кім?',
          options: ['Ақтөс', 'Бөрібасар', 'Құтжол', 'Таймас'],
          correct: 0,
          explanation: 'Олармен бірге серік болған адал дос — Ақтөс атты ит еді.'
        },
        {
          question: 'Олардың саяхатының басты мақсаты не болды?',
          options: ['Ұмытылған бұлақты тауып, ауыл бақшасын құрғақшылықтан құтқару', 'Алтын қазына табу', 'Тауға жай серуендеу', 'Жаңа үй салу'],
          correct: 0,
          explanation: 'Басты мақсат — суы тартылған арықтар мен алма ағаштарын құтқару үшін бұлақ көзін ашу болды.'
        }
      ]
    },
    {
      bookTitle: 'Менің атым Қожа',
      character_name: 'Қожа',
      character_avatar: '🎒',
      character_intro: 'Сәлем, дос! Мен Қожамын. Менің мектептегі қызықтарым мен тентектіктерім туралы оқыған боларсың? Мені қаншалықты жақсы танығаныңды байқап көрейікші!',
      xp_reward: 15,
      crystals_reward: 2,
      questions: [
        {
          question: 'Қожаның шын аты кімнің құрметіне немесе қандай мағынада қойылған еді?',
          options: ['Атасы: «Елге қожалық етсін» деп қойған', 'Әкесінің аты болған соң қойған', 'Мұғалімі Майқанова қойған', 'Өзі таңдап алған'],
          correct: 0,
          explanation: 'Қожаның атасы: «Қожа болсын, елге қожалық етсін» деген ізгі ниетпен қойған.'
        },
        {
          question: 'Сұлтан Қожаны ауыл шетінде қайда баруға үгіттеді?',
          options: ['Кітапханаға кітап алуға', 'Өзенге балық аулауға және шомылуға', 'Алма бағына баруға', 'Мектепке сабаққа баруға'],
          correct: 1,
          explanation: 'Сұлтан пысықтық танытып, Қожаны өзенге барып шомылуға және балық аулауға шақырды.'
        },
        {
          question: 'Қожа өзін тентек десе де, бойындағы ең басты қасиеті ретінде нені бағалайды?',
          options: ['Айлакерлікті', 'Әділдікті жақсы көруді және өтірік айтпауды', 'Үнемі тығылып жүруді', 'Барлық сабақтан бестік алуды'],
          correct: 1,
          explanation: 'Қожа тентек болса да, жаны таза, әділдікті сүйетін ашық бала.'
        }
      ]
    },
    {
      bookTitle: 'Абай жолы',
      character_name: 'Жас Абай',
      character_avatar: '📖',
      character_intro: 'Ассалаумағалейкүм, жас дос! Мен бала Абаймын. Семейдегі медреседен ауылға қайтып келе жатқандағы сағынышым есіңде ме?',
      xp_reward: 15,
      crystals_reward: 2,
      questions: [
        {
          question: 'Абай қаладан ауылға қайтып келе жатып, ең алдымен кімдерді сағынышпен еске алды?',
          options: ['Зере әжесі мен Ұлжан анасын', 'Ауылдағы құрдастарын', 'Көрші ауылдағы балуандарды', 'Семейдегі саудагерлерді'],
          correct: 0,
          explanation: 'Абайдың бала жүрегіне ең жақын, мейірім төккен — асыл Зере әжесі мен Ұлжан анасы еді.'
        },
        {
          question: 'Абайға ертегілер мен шежіре-аңыздарды ерекше мәнермен айтып беретін кім еді?',
          options: ['Құнанбай әкесі', 'Зере әжесі', 'Байсал би', 'Майбасар болыс'],
          correct: 1,
          explanation: 'Зере әжесі Абайға ел аузындағы ертегілер мен шежірелерді тамсана жеткізетін дана ана болды.'
        },
        {
          question: '«Абай жолы» роман-эпопеясы қазақ әдебиетіндегі қандай шығарма болып саналады?',
          options: ['Төрт томдық ұлы роман-эпопея', 'Шағын фантастикалық әңгіме', 'Детективтік повесть', 'Өлеңдер жинағы'],
          correct: 0,
          explanation: 'Мұхтар Әуезовтің «Абай жолы» — дүниежүзіне танымал, қазақ халқының өмірін бейнелейтін төрт томдық роман-эпопея.'
        }
      ]
    },
    {
      bookTitle: 'Кішкентай ханзада',
      character_name: 'Кішкентай ханзада',
      character_avatar: '🌹',
      character_intro: 'Сәлем! Мен алыс астероидтан саяхаттап келген Кішкентай ханзадамын. Сахарадағы кездесуіміз жайлы сұрақтарыма жауап бере аласың ба?',
      xp_reward: 15,
      crystals_reward: 2,
      questions: [
        {
          question: 'Кішкентай ханзада ұшқышпен кездескенде ең бірінші ненің суретін салып беруін өтінді?',
          options: ['Қозының (қошақанның)', 'Әдемі раушан гүлінің', 'Ғарыш кемесінің', 'Алтын тәждің'],
          correct: 0,
          explanation: 'Кішкентай ханзада ұшқыштан өз планетасындағы баобабтарды жейтін қозының суретін сұрады.'
        },
        {
          question: 'Түлкінің Кішкентай ханзадаға айтқан ең атақты даналық сөзі қандай?',
          options: ['«Тек жүрекпен ғана ең басты нәрсені көруге болады, көз ең бастысын көрмейді»', '«Көп оқыған көп біледі»', '«Саяхаттаған адамның досы болмайды»', '«Гүлдерге су құюдың қажеті жоқ»'],
          correct: 0,
          explanation: 'Түлкінің сыры: «Ақиқатты тек жүрекпен сезінесің. Ең басты құндылық көзге көрінбейді.»'
        },
        {
          question: 'Кішкентай ханзада өз планетасындағы кімді ерекше жақсы көріп, сағынды?',
          options: ['Раушан гүлін', 'Үлкен арыстанды', 'Алтын сағатты', 'Темір жолды'],
          correct: 0,
          explanation: 'Ол өзінің нәзік, ерке әрі сүйікті Раушан гүлі үшін жауапты екенін ұғынды.'
        }
      ]
    },
    {
      bookTitle: 'Өркениеттің адасуы',
      character_name: 'Ақын Мұхтар',
      character_avatar: '✍️',
      character_intro: 'Құрметті жас оқырман! Мен ақын Мұхтар Шахановпын. Адамгершілік, адалдық пен рухани байлық туралы жырларымды бірге талдайық!',
      xp_reward: 15,
      crystals_reward: 2,
      questions: [
        {
          question: 'Мұхтар Шаханов поэзиясындағы ең басты құндылық ретінде нені жырлайды?',
          options: ['Шыншылдықты, ар-ождан мен ана тілін сүюді', 'Тек материалдық байлықты', 'Табиғатты бақыламауды', 'Қарапайым еріншектікті'],
          correct: 0,
          explanation: 'Мұхтар Шаханов әрқашан адамның рухын, намысын, ар-ұжданы мен ұлттық қадір-қасиетін биік қояды.'
        },
        {
          question: 'Ақынның пікірінше, адамның адаспайтын өмірлік компасы не болуы керек?',
          options: ['Адал еңбек пен таза жүрек', 'Сәттілікке сену', 'Көп демалу', 'Өзгенің сөзіне ғана еру'],
          correct: 0,
          explanation: 'Адал еңбек пен парасатты жүрек — адам баласының дұрыс жолдан таймауының кепілі.'
        },
        {
          question: '«Өркениеттің адасуы» шығармасы қандай жанрға және тақырыпқа жатады?',
          options: ['Философиялық толғау, руханият пен өркениет мәселелері', 'Көңілді ертегі', 'Фантастикалық роман', 'Тарихи хроника'],
          correct: 0,
          explanation: 'Бұл — адамзат қоғамындағы рухани құндылықтардың жоғалмауы жайлы терең ой салатын философиялық поэма.'
        }
      ]
    }
  ];

  for (const q of quizzes) {
    const book = db.get('SELECT id FROM books WHERE title = ?', q.bookTitle);
    if (book) {
      const existing = db.get('SELECT id FROM character_quizzes WHERE book_id = ?', book.id);
      if (!existing) {
        db.run(
          `INSERT INTO character_quizzes(book_id, character_name, character_avatar, character_intro, questions, xp_reward, crystals_reward, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          book.id, q.character_name, q.character_avatar, q.character_intro, JSON.stringify(q.questions), q.xp_reward, q.crystals_reward, now
        );
      }
    }
  }
}

export function seedIfEmpty(db) {
  const topXp = db.get("SELECT COALESCE(MAX(s), 0) as m FROM (SELECT SUM(amount) as s FROM xp_events GROUP BY user_id)").m;
  const hasAyagoz = db.get("SELECT id FROM users WHERE nickname = 'Құлахметова Аягөз'");
  const classmateQuotesCount = db.get("SELECT COUNT(*) AS c FROM diary_entries WHERE user_id != (SELECT id FROM users WHERE nickname = 'Құлахметова Аягөз')")?.c || 0;
  if (!hasAyagoz || topXp < 500 || classmateQuotesCount === 0) {
    db.tx(() => {
      db.run('DELETE FROM users');
      db.run('DELETE FROM classes');
      db.run('DELETE FROM class_members');
      db.run('DELETE FROM shelf');
      db.run('DELETE FROM reading_logs');
      db.run('DELETE FROM task_progress');
      db.run('DELETE FROM responses');
      db.run('DELETE FROM missions');
      db.run('DELETE FROM user_rewards');
      db.run('DELETE FROM xp_events');
      db.run('DELETE FROM diary_entries');
      db.run('DELETE FROM quiz_attempts');
      ensureCatalog(db);
      seed(db);
    });
    return true;
  }
  ensureCatalog(db);
  return false;
}

function seed(db) {
  const now = nowIso();
  const today = localDate();
  const user = (role, nickname, secret, extra = {}) =>
    db.run(
      `INSERT INTO users(role, nickname, login, secret_hash, avatar, onboarded, tips_seen, is_demo, crystals, created_at)
       VALUES (?,?,?,?,?,?,?,0,?,?)`,
      role, nickname, extra.login ?? null, hashSecret(secret), extra.avatar ?? 'fox', extra.onboarded ?? 1, extra.tips ?? 1, extra.crystals ?? 0, now,
    ).lastInsertRowid;

  const admin = user('admin', 'Әкімшілік', 'admin1234', { login: 'admin', avatar: 'eagle' });
  const teacher = user('teacher', 'Сәуле Маратқызы', 'demo1234', { login: 'demo.mugalim', avatar: 'owl' });
  const teacher2 = user('teacher', 'Айгүл Бақытқызы', 'demo1234', { login: 'baska.mugalim', avatar: 'bear' });
  void admin;

  const cls = db.run(
    'INSERT INTO classes(name, teacher_id, invite_code, level, is_demo, created_at) VALUES (?,?,?,?,0,?)',
    '11А сынып', teacher, 'DEMO25', 'senior', now,
  ).lastInsertRowid;
  const cls2 = db.run(
    'INSERT INTO classes(name, teacher_id, invite_code, level, is_demo, created_at) VALUES (?,?,?,?,0,?)',
    '9Ә сынып', teacher2, 'BASKA7', 'senior', now,
  ).lastInsertRowid;

  const member = (classId, userId) => db.run('INSERT INTO class_members(class_id, user_id, joined_at) VALUES (?,?,?)', classId, userId, now);

  // Оқушылар (Құлахметова Аягөз + 5 сыныптасы түрлі нәтижелермен)
  const ayagoz = user('student', 'Құлахметова Аягөз', '1234', { avatar: 'owl', tips: 0, crystals: 12 });
  const alikhan = user('student', 'Әлихан Болатұлы', '1111', { avatar: 'wolf', crystals: 16 });
  const dana = user('student', 'Дана Серікқызы', '1111', { avatar: 'fox', crystals: 8 });
  const miras = user('student', 'Мирас Нұрланұлы', '1111', { avatar: 'horse', crystals: 6 });
  const aizere = user('student', 'Айзере Мұратқызы', '1111', { avatar: 'cat', crystals: 2 });
  const nursultan = user('student', 'Нұрсұлтан Қанатұлы', '1111', { avatar: 'bear', crystals: 0 });

  for (const u of [ayagoz, alikhan, dana, miras, aizere, nursultan]) member(cls, u);

  const erlan = user('student', 'Ерлан Бауыржанұлы', '1111', { avatar: 'bear' });
  member(cls2, erlan);

  // Негізгі оқу әңгімесі: Ұмытылған бұлақ
  const b = DEMO_BOOK;
  let bookRow = db.get('SELECT id FROM books WHERE title = ?', b.title);
  let book = bookRow ? bookRow.id : null;
  if (!book) {
    book = db.run(
      `INSERT INTO books(title, author, description, language, genre, interests, grade_min, grade_max, total_pages, stage_pages, cover_color, cover_emoji, is_demo, visibility, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,'public',?)`,
      b.title, b.author, b.description, b.language, b.genre, b.interests, b.grade_min, b.grade_max, b.total_pages, JSON.stringify(b.stage_pages), b.cover_color, b.cover_emoji, now,
    ).lastInsertRowid;
    DEMO_CHAPTERS.forEach((c, i) =>
      db.run('INSERT INTO chapters(book_id, idx, title, body, page_start, page_end) VALUES (?,?,?,?,?,?)', book, i + 1, c.title, c.body, c.pages[0], c.pages[1]),
    );
  }

  // Тапсырмалар
  const taskIds = {};
  for (const t of DEMO_TASKS) {
    const existingT = db.get('SELECT id FROM tasks WHERE book_id = ? AND type = ?', book, t.type);
    if (existingT) {
      taskIds[t.type] = existingT.id;
    } else {
      const built = buildTask(t.type, t.spec);
      taskIds[t.type] = db.run(
        `INSERT INTO tasks(book_id, class_id, created_by, type, stage_no, title, instruction, example, source_excerpt, source_chapter, spec, payload, answer, hints, explanation, status, is_demo, created_at, updated_at)
         VALUES (?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,'published',0,?,?)`,
        book, teacher, t.type, t.stage_no, t.title, t.instruction, t.example, t.source_excerpt, t.source_chapter,
        JSON.stringify(t.spec), JSON.stringify(built.payload), JSON.stringify(built.answer), JSON.stringify(t.hints), t.explanation, now, now,
      ).lastInsertRowid;
    }
  }

  const shelf = (userId, bookId, status, totalPages, curPage, by) =>
    db.run(
      `INSERT INTO shelf(user_id, book_id, status, total_pages, current_page, goal_text, goal_set, assigned_by, started_at, updated_at)
       VALUES (?,?,?,?,?,?,1,?,?,?)`,
      userId, bookId, status, totalPages, curPage, 'Күніне 15 минут оқу', by, now, now,
    );

  const log = (userId, bookId, page, daysAgo, note = null, minutes = 15) => {
    const d = addDays(today, -daysAgo);
    db.run(
      'INSERT INTO reading_logs(user_id, book_id, page, minutes, note, log_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      userId, bookId, page, minutes, note, d, d + 'T16:00:00', d + 'T16:00:00',
    );
    syncDailyXp(db, userId, d);
    recompute(db, userId, bookId);
  };

  const complete = (userId, type, tries = 1) => {
    if (!taskIds[type]) return;
    db.run('INSERT INTO task_progress(user_id, task_id, tries, wrong_streak, completed, completed_at) VALUES (?,?,?,0,1,?)', userId, taskIds[type], tries, now);
    award(db, userId, 'game', 'task:' + taskIds[type]);
  };

  const respond = (userId, bookId, type, kind, text, extra, status, feedback, daysAgo = 1) => {
    const at = addDays(today, -daysAgo) + 'T18:00:00';
    const id = db.run(
      `INSERT INTO responses(user_id, book_id, task_id, kind, text, extra, status, feedback, reviewed_by, reviewed_at, seen_feedback, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)`,
      userId, bookId, type ? taskIds[type] : null, kind, text, JSON.stringify(extra || {}), status, feedback,
      status === 'pending' ? null : teacher, status === 'pending' ? null : at, at, at,
    ).lastInsertRowid;
    if (status === 'accepted') award(db, userId, 'reflection', type ? 'task:' + taskIds[type] : 'book:' + bookId);
    return id;
  };

  // Каталогтағы кітаптарды тауып алу
  const koja = db.get("SELECT id FROM books WHERE title = 'Менің атым Қожа'");
  const prince = db.get("SELECT id FROM books WHERE title = 'Кішкентай ханзада'");
  const abay = db.get("SELECT id FROM books WHERE title = 'Абай жолы'");
  const shahanov = db.get("SELECT id FROM books WHERE title = 'Өркениеттің адасуы'");
  const turar = db.get("SELECT id FROM books WHERE title = 'Бала Тұрар'");
  const seitekov = db.get("SELECT id FROM books WHERE title = 'Қара сөздер'");

  // -------------------------------------------------------------
  // 1. ҚҰЛАХМЕТОВА АЯГӨЗ — Бірнеше кітап оқыған, жетістіктері мол
  // -------------------------------------------------------------
  // Ағымдағы оқып бастаған кітабы (Ұмытылған бұлақ, 10 бет)
  shelf(ayagoz, book, 'reading', b.total_pages, 0, teacher);

  // Аяқталған кітап 1: Менің атым Қожа (140/140 бет)
  if (koja) {
    shelf(ayagoz, koja.id, 'finished', 140, 140, teacher);
    log(ayagoz, koja.id, 50, 4, 'Қожаның тентек болса да, жаны таза бала екені байқалады.', 20);
    log(ayagoz, koja.id, 100, 3, 'Сұлтанмен бірге өткізген күндері өте қызықты суреттелген.', 20);
    log(ayagoz, koja.id, 140, 2, 'Повесть өте ғибратты. Қожаның өзін тәрбиелеуге ұмтылысы үлгі.', 25);
    award(db, ayagoz, 'book_finished', 'book:' + koja.id, 30);
    const qK = db.get('SELECT id FROM character_quizzes WHERE book_id = ?', koja.id);
    if (qK) {
      db.run('INSERT OR REPLACE INTO quiz_attempts(user_id, quiz_id, score, total, xp_awarded, crystals_awarded, created_at) VALUES (?, ?, 3, 3, 15, 2, ?)', ayagoz, qK.id, now);
      award(db, ayagoz, 'game', 'quiz:' + qK.id, 15);
    }
  }

  // Аяқталған кітап 2: Кішкентай ханзада (96/96 бет)
  if (prince) {
    shelf(ayagoz, prince.id, 'finished', 96, 96, teacher);
    log(ayagoz, prince.id, 45, 3, 'Ханзаданың өз раушан гүліне деген адалдығы қатты толғандырады.', 20);
    log(ayagoz, prince.id, 96, 2, 'Түлкінің сөзі нағыз өмірлік даналық: «Ақиқатты тек жүрекпен сезінесің».', 25);
    award(db, ayagoz, 'book_finished', 'book:' + prince.id, 30);
    const qP = db.get('SELECT id FROM character_quizzes WHERE book_id = ?', prince.id);
    if (qP) {
      db.run('INSERT OR REPLACE INTO quiz_attempts(user_id, quiz_id, score, total, xp_awarded, crystals_awarded, created_at) VALUES (?, ?, 3, 3, 15, 2, ?)', ayagoz, qP.id, now);
      award(db, ayagoz, 'game', 'quiz:' + qP.id, 15);
    }
  }

  // Аяқталған кітап 3: Өркениеттің адасуы (180/180 бет)
  if (shahanov) {
    shelf(ayagoz, shahanov.id, 'finished', 180, 180, teacher);
    log(ayagoz, shahanov.id, 60, 4, 'Руханият пен намыс туралы толғау.', 25);
    log(ayagoz, shahanov.id, 120, 3, 'Ана тілі мен елдік мұрат жайлы.', 30);
    log(ayagoz, shahanov.id, 180, 1, 'Мұхтар Шахановтың өлеңдері өте терең мағыналы.', 35);
    award(db, ayagoz, 'book_finished', 'book:' + shahanov.id, 30);
  }

  // Қалаулылар тізіміне қосқан кітап: Абай жолы
  if (abay) {
    shelf(ayagoz, abay.id, 'want', 380, 0, teacher);
  }

  // Оқырман күнделігіндегі қанатты сөздер
  db.run(
    `INSERT INTO diary_entries(user_id, book_id, kind, text, extra, created_at) VALUES (?, ?, 'quote', ?, ?, ?)`,
    ayagoz, abay ? abay.id : book,
    '«Адам баласына адам баласының бәрі — дос, бауыр.»',
    JSON.stringify({ page: 45, quote_author: 'Абай Құнанбайұлы', thoughts: 'Абай атамыздың бұл дана сөзі қазіргі қоғамда өте өзекті құндылық.' }),
    addDays(today, -2) + 'T14:00:00'
  );
  award(db, ayagoz, 'daily_log', 'diary:quote1', 5);

  db.run(
    `INSERT INTO diary_entries(user_id, book_id, kind, text, extra, created_at) VALUES (?, ?, 'quote', ?, ?, ?)`,
    ayagoz, prince ? prince.id : book,
    '«Ақиқатты тек жүрекпен сезінесің. Ең басты құндылық көзге көрінбейді.»',
    JSON.stringify({ page: 68, quote_author: 'Түлкі (Кішкентай ханзада)', thoughts: 'Шынайы достық пен мейірім тек жүрекпен сезіледі.' }),
    addDays(today, -1) + 'T17:00:00'
  );
  award(db, ayagoz, 'daily_log', 'diary:quote2', 5);

  db.run(
    `INSERT INTO diary_entries(user_id, book_id, kind, text, extra, created_at) VALUES (?, ?, 'quote', ?, ?, ?)`,
    ayagoz, koja ? koja.id : book,
    '«Мен тентек болсам да, әділдікті жақсы көремін.»',
    JSON.stringify({ page: 12, quote_author: 'Қожа', thoughts: 'Қожаның бұл сөзі оның шыншыл мінезін көрсетеді.' }),
    today + 'T10:00:00'
  );
  award(db, ayagoz, 'daily_log', 'diary:quote3', 5);

  // -------------------------------------------------------------
  // 2. ӘЛИХАН БОЛАТҰЛЫ (ЖОҒАРЫ НӘТИЖЕ / СЫНЫП ЛИДЕРІ: ~580 XP, 16 💎, 7 күн 🔥)
  // -------------------------------------------------------------
  if (shahanov) {
    shelf(alikhan, shahanov.id, 'finished', 180, 180, teacher);
    log(alikhan, shahanov.id, 60, 6, 'Рухани құндылықтар жайлы ойлар.', 30);
    log(alikhan, shahanov.id, 120, 5, 'Өркениет пен адамгершілік сабақтастығы.', 30);
    log(alikhan, shahanov.id, 180, 4, 'Кітап маған терең ой салды.', 35);
    award(db, alikhan, 'book_finished', 'book:' + shahanov.id, 30);
  }
  if (turar) {
    shelf(alikhan, turar.id, 'finished', 210, 210, teacher);
    log(alikhan, turar.id, 70, 3, 'Тұрардың қиын балалық шағы.', 30);
    log(alikhan, turar.id, 140, 2, 'Тұрардың қайсарлығы мен білімге құштарлығы.', 30);
    log(alikhan, turar.id, 210, 1, 'Шерхан Мұртазаның шебер тілі.', 35);
    award(db, alikhan, 'book_finished', 'book:' + turar.id, 30);
  }
  if (abay) {
    shelf(alikhan, abay.id, 'reading', 380, 240, teacher);
    log(alikhan, abay.id, 240, 0, 'Абайдың ақындық жолы.', 40);
  }
  for (let i = 0; i < 8; i++) award(db, alikhan, 'game', 'task_ali_' + i, 20);
  award(db, alikhan, 'daily_log', 'log_ali_bonus_1', 15);
  award(db, alikhan, 'daily_log', 'log_ali_bonus_2', 15);
  respond(alikhan, book, 'choice', 'open', 'Рухани тамырымызды сақтау — ең басты міндет.', {}, 'accepted', 'Өте терең ойлы пікір!', 1);

  if (shahanov) {
    db.run(
      `INSERT INTO diary_entries(user_id, book_id, kind, text, extra, created_at) VALUES (?, ?, 'quote', ?, ?, ?)`,
      alikhan, shahanov.id,
      '«Төрт анасын сыйламаған халықтың тамыры шіриді: Туған жері, туған тілі, салт-дәстүрі және тарихы.»',
      JSON.stringify({ page: 54, quote_author: 'Мұхтар Шаханов', thoughts: 'Ана тілі мен тарихымызды қастерлеу — әр оқушының парызы.' }),
      addDays(today, -3) + 'T11:30:00'
    );
    award(db, alikhan, 'daily_log', 'diary:ali_quote1', 5);
  }
  if (turar) {
    db.run(
      `INSERT INTO diary_entries(user_id, book_id, kind, text, extra, created_at) VALUES (?, ?, 'quote', ?, ?, ?)`,
      alikhan, turar.id,
      '«Қиындықтан қорықпаған, білімге ұмтылған адам ғана мұратына жетеді.»',
      JSON.stringify({ page: 112, quote_author: 'Шерхан Мұртаза', thoughts: 'Тұрардың табандылығы мен қайсарлығы бізге үлкен жігер береді.' }),
      addDays(today, -1) + 'T15:20:00'
    );
    award(db, alikhan, 'daily_log', 'diary:ali_quote2', 5);
  }

  // -------------------------------------------------------------
  // 3. ДАНА СЕРІКҚЫЗЫ (ОРТАША НӘТИЖЕ: ~280 XP, 8 💎, 4 күн 🔥)
  // -------------------------------------------------------------
  if (koja) {
    shelf(dana, koja.id, 'finished', 140, 140, teacher);
    log(dana, koja.id, 50, 3, 'Қожа мен Сұлтанның оқиғалары.', 20);
    log(dana, koja.id, 100, 2, 'Майқанова мұғалімнің сабағы.', 20);
    log(dana, koja.id, 140, 1, 'Қожаның өзін-өзі тәрбиелеуі.', 25);
    award(db, dana, 'book_finished', 'book:' + koja.id, 30);
  }
  if (seitekov) {
    shelf(dana, seitekov.id, 'reading', 120, 50, teacher);
    log(dana, seitekov.id, 50, 0, 'Бірінші және екінші қара сөздері.', 25);
  }
  complete(dana, 'character');
  complete(dana, 'sequence');
  respond(dana, book, 'choice', 'open', 'Ақбота қауіпсіздікті ойлап кері қайтты.', {}, 'accepted', 'Дұрыс қорытынды.', 2);

  if (koja) {
    db.run(
      `INSERT INTO diary_entries(user_id, book_id, kind, text, extra, created_at) VALUES (?, ?, 'quote', ?, ?, ?)`,
      dana, koja.id,
      '«Адамның ниеті таза болса, оның болашағы да жарқын болады.»',
      JSON.stringify({ page: 85, quote_author: 'Бердібек Соқпақбаев', thoughts: 'Қожаның өз қателігін түсініп түзелуі маған қатты ұнады.' }),
      addDays(today, -2) + 'T16:45:00'
    );
    award(db, dana, 'daily_log', 'diary:dana_quote1', 5);
  }
  if (seitekov) {
    db.run(
      `INSERT INTO diary_entries(user_id, book_id, kind, text, extra, created_at) VALUES (?, ?, 'quote', ?, ?, ?)`,
      dana, seitekov.id,
      '«Ғылым таппай мақтанба, орын таппай баптанба.»',
      JSON.stringify({ page: 22, quote_author: 'Абай Құнанбайұлы', thoughts: 'Білім алу мен еңбек ету туралы үлкен өсиет.' }),
      today + 'T09:15:00'
    );
    award(db, dana, 'daily_log', 'diary:dana_quote2', 5);
  }

  // -------------------------------------------------------------
  // 4. МИРАС НҰРЛАНҰЛЫ (ОРТАША НӘТИЖЕ: ~190 XP, 6 💎, 3 күн 🔥)
  // -------------------------------------------------------------
  shelf(miras, book, 'finished', 10, 10, teacher);
  log(miras, book, 4, 2, 'Картаны тапқан сәт.', 15);
  log(miras, book, 8, 1, 'Бұлақты іздеу жолы.', 15);
  log(miras, book, 10, 0, 'Бұлақтың көзі ашылды.', 20);
  award(db, miras, 'book_finished', 'book:' + book, 30);
  complete(miras, 'character');
  complete(miras, 'vocab');
  respond(miras, book, 'vocab', 'sentence', 'Биыл жазда ауылда құрғақшылық болды.', {}, 'accepted', 'Сөзді дұрыс қолдандың.', 1);

  db.run(
    `INSERT INTO diary_entries(user_id, book_id, kind, text, extra, created_at) VALUES (?, ?, 'quote', ?, ?, ?)`,
    miras, book,
    '«Табиғатты аялаған бала — елінің нағыз жанашыры.»',
    JSON.stringify({ page: 9, quote_author: 'Ақбота', thoughts: 'Бұлақтың көзін ашу ауыл бақшаларына қайта жан бітірді.' }),
    addDays(today, -1) + 'T18:00:00'
  );
  award(db, miras, 'daily_log', 'diary:miras_quote1', 5);

  // -------------------------------------------------------------
  // 5. АЙЗЕРЕ МҰРАТҚЫЗЫ (БАСТАПҚЫ НӘТИЖЕ: ~80 XP, 2 💎, 1 күн 🔥)
  // -------------------------------------------------------------
  if (prince) {
    shelf(aizere, prince.id, 'reading', 96, 30, teacher);
    log(aizere, prince.id, 30, 0, 'Кішкентай ханзаданың ғаламшары.', 20);
  }
  complete(aizere, 'character');

  // -------------------------------------------------------------
  // 6. НҰРСҰЛТАН ҚАНАТҰЛЫ (АЗ НӘТИЖЕ: ~30 XP, 0 💎, 0 күн)
  // -------------------------------------------------------------
  shelf(nursultan, book, 'reading', 10, 4, teacher);
  log(nursultan, book, 4, 3, 'Әженің сандығы.', 15);

  // Басқа сынып (құпиялықты тексеру үшін)
  shelf(erlan, book, 'reading', 10, 8, teacher2);
  log(erlan, book, 8, 1);
  complete(erlan, 'character');
  complete(erlan, 'sequence');
  respond(erlan, book, 'choice', 'open', 'Ақбота дұрыс істеді, себебі ол қауіпсіздікті ойлады.', {}, 'pending', null);

  for (const u of [ayagoz, dana, alikhan, miras, aizere, nursultan, erlan]) checkRewards(db, u);
  db.run("INSERT OR IGNORE INTO user_rewards(user_id, reward_id, earned_at) VALUES (?, 'scene_steppe', ?)", ayagoz, now);

  // Ортақ миссиялар
  const start = addDays(today, -6);
  const end = addDays(today, 7);
  db.run(
    'INSERT INTO missions(class_id, title, description, metric, target, start_date, end_date, active, created_at) VALUES (?,?,?,?,?,?,?,1,?)',
    cls, 'Білім бағы: 20 оқу күні', 'Әр оқу күні бағымызға бір көшет қосады. Әркім өз мүмкіндігінше үлес қосады.', 'reading_days', 20, start, end, now,
  );
  db.run(
    'INSERT INTO missions(class_id, title, description, metric, target, start_date, end_date, active, created_at) VALUES (?,?,?,?,?,?,?,1,?)',
    cls, '8 мазмұнды пікір', 'Мұғалім қабылдаған әр пікір бақта гүл ашады.', 'reflections', 8, start, end, now,
  );
  db.run(
    'INSERT INTO missions(class_id, title, description, metric, target, start_date, end_date, active, created_at) VALUES (?,?,?,?,?,?,?,1,?)',
    cls2, '9Ә: 15 оқу күні', '', 'reading_days', 15, start, end, now,
  );
}
