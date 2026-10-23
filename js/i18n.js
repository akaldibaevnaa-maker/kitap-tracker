// KitapTracker: Қазақша және Орысша тілдер сөздігі (i18n)
export const translations = {
  kk: {
    app_title: 'KitapTracker — Кітап әлеміне саяхат',
    tagline: 'Мектеп оқушыларының кітап оқуын ойын арқылы қызықтыратын интерактивті веб-платформа',
    demo_badge: 'ДЕМО РЕЖИМІ (Ойдан шығарылған деректер)',
    
    // Мәзір
    nav_world: 'Менің әлемім',
    nav_shelf: 'Кітап сөресі',
    nav_play: 'Ойын алаңы',
    nav_mission: 'Ортақ миссия',
    nav_achievements: 'Жетістіктерім',
    nav_teacher: 'Мұғалім кабинеті',
    nav_admin: 'Әкімшілік',
    nav_logout: 'Шығу',

    // Алғашқы кіру / Авторизация
    auth_welcome: 'Кітап әлеміне қош келдің!',
    auth_student_login: 'Оқушы ретінде кіру',
    auth_teacher_login: 'Мұғалім ретінде кіру',
    auth_quick_demo_student: 'Оқушымен кіру (Құлахметова Аягөз)',
    auth_quick_demo_teacher: 'Мұғаліммен кіру (Сәуле Маратқызы)',
    auth_nickname: 'Оқушының аты-жөні',
    auth_pin: '4 таңбалы PIN-код',
    auth_class_code: 'Сынып коды (мысалы: DEMO25)',
    auth_start_journey: 'Алғашқы саяхатыңды баста!',
    auth_step1_title: '1-қадам. Аватар мен бүркеншік ат таңда',
    auth_step2_title: '2-қадам. Сынып кодын енгіз',
    auth_step3_title: '3-қадам. Кітап таңдап, шағын мақсат қой',
    auth_enter_btn: 'Кіру',
    auth_register_btn: 'Тіркелу',

    // Менің әлемім
    world_q_reading: 'Қазір қандай кітап оқып жатырмын?',
    world_q_today: 'Бүгінгі тапсырма / әрекет',
    world_q_achieve: 'Қандай жетістікке жеттім?',
    world_continue_read: 'Оқуды жалғастыру',
    world_log_today: 'Оқығанымды белгілеу',
    world_daily_mission: 'Бүгінгі тапсырма / әрекет',
    world_weekly_goal: 'Апталық жеке мақсат',
    world_journey_status: 'Саяхат картасының кезеңі',
    world_recent_reward: 'Соңғы жетістік',
    world_teacher_feedback: 'Мұғалімнің жаңа пікірі',

    // Кітап сөресі
    shelf_all: 'Барлық кітаптар',
    shelf_want: 'Оқығым келеді',
    shelf_reading: 'Оқып жатырмын',
    shelf_finished: 'Аяқтадым',
    shelf_add_manual: 'Каталогта жоқ кітапты қосу',
    shelf_search_ph: 'Кітап немесе автор атауы бойынша іздеу...',
    shelf_filter_grade: 'Сынып деңгейі',
    shelf_filter_genre: 'Жанр',
    shelf_filter_lang: 'Тіл',
    shelf_filter_all: 'Барлығы',
    shelf_btn_start_journey: 'Саяхатты бастау',
    shelf_btn_read_chapter: 'Мәтінді оқу',
    shelf_manual_title: 'Кітап атауы',
    shelf_manual_author: 'Авторы',
    shelf_manual_pages: 'Жалпы бет саны (нақты басылым)',
    shelf_manual_save: 'Сөреге қосу',

    // Оқуды белгілеу
    log_modal_title: 'Бүгінгі оқуды белгілеу',
    log_notice: 'Бұл оқушының өзі белгілеген мәліметі (өз бетіңізбен енгізіледі).',
    log_last_page: 'Соңғы оқылған бет',
    log_minutes: 'Оқу уақыты (минут, міндетті емес)',
    log_note: 'Кейіпкер немесе оқиға туралы ойың (қысқа пікір)',
    log_save_btn: 'Сақтау',

    // Ойын алаңы
    game_title: 'Ойын алаңы',
    game_select_instruction: 'Оқылған кітап бойынша тапсырманы таңдаңыз:',
    game_btn_check: 'Жауап беру',
    game_btn_retry: 'Қайта көру',
    game_btn_continue: 'Жалғастыру',
    game_btn_submit_thought: 'Ойымды жіберу',
    game_feedback_correct: 'Керемет! Жауабың толық дұрыс!',
    game_feedback_retry: 'Тағы бір ойланып көр. Сәл назар салсаң, табасың!',
    game_hint_label: 'Көмекші ишара:',
    game_explanation_label: 'Түсіндірме:',
    game_locked_msg: 'Бұл тапсырма әлі құлыптаулы. Алдымен кітапты оқып, алдыңғы кезеңді орында!',

    // Ортақ миссия
    mission_title: 'Ортақ миссия: Сыныптың «Білім бағы»',
    mission_desc: 'Сынып бірлесіп виртуалды бақты өсіреді. Әрбір оқу әрекеті ортақ мақсатқа үлес қосады.',
    mission_target: 'Ортақ мақсат',
    mission_current: 'Орындалғаны',
    mission_remaining: 'Қалғаны',
    mission_my_contrib: 'Менің қосқан үлесім',

    // Жетістіктер
    achieve_title: 'Саяхат картасы және Марапаттар',
    achieve_xp_total: 'Жинаған XP',
    achieve_badges: 'Жетістік белгілері',
    achieve_decor: 'Аватар безендірулері',
    achieve_items: 'Сөреге арналған заттар',
    achieve_scenes: 'Саяхат көріністері',
    achieve_rules_title: 'Ұпай ережелері (қарапайым және ашық):',

    // Мұғалім
    teacher_title: 'Мұғалім кабинеті',
    teacher_tab_overview: 'Шолу (4 көрсеткіш)',
    teacher_tab_classes: 'Сыныптар мен кодтар',
    teacher_tab_builder: 'Тапсырма құрастырушы',
    teacher_tab_reviews: 'Жауаптарды тексеру',
    teacher_tab_missions: 'Ортақ миссиялар',
    teacher_export_csv: 'CSV есеп жүктеу',
    teacher_csv_note: 'Ескертпе: Ойын ұпайы пәндік бағаға автоматты түрде айналдырылмайды.',
    teacher_draft_tool: '«Үзіндіден жоба» (Ереже бойынша жоба жасау, AI емес)',
    teacher_accept_btn: 'Қабылдау (+XP беру)',
    teacher_return_btn: 'Қайтару (түзетуге)',

    // Саяхат картасының 5 кезеңі
    stage_1: 'Бастау қақпасы',
    stage_2: 'Кейіпкерлер мекені',
    stage_3: 'Оқиғалар жолы',
    stage_4: 'Ой қазынасы',
    stage_5: 'Кітап шыңы',
    stage_action_goal: 'Мақсат қою және алғашқы жазба',
    stage_action_char: 'Кейіпкерлермен танысу',
    stage_action_events: 'Оқиғалар ретін анықтау',
    stage_action_treasure: 'Сөздер мен дәлелдерді талдау',
    stage_action_summit: 'Кітапты аяқтау және рефлексия',

    // Оқырман күнделігі (цитаталар және аудио-рефлексия)
    diary_title: 'Оқырман күнделігі',
    diary_subtitle: 'Оқыған кітаптарыңнан түйген ойлар, ұнаған қанатты сөздер және аудио-пікірлер',
    diary_add_quote: 'Дәйексөз (цитата) қосу',
    diary_record_audio: 'Аудио-рефлексия жазу',
    diary_tab_all: 'Барлық жазбалар',
    diary_tab_quotes: 'Қанатты сөздер мен дәйексөздер',
    diary_tab_audio: 'Аудио-рефлексиялар',
    diary_empty: 'Әзірге күнделік жазбалары жоқ. Оқыған кітабыңнан ұнаған сөзді жазып көр немесе дауыспен ойыңды айтып жаз!',
    diary_quote_ph: 'Кітаптан ұнаған сөйлемді немесе цитатаны жазыңыз...',
    diary_quote_author: 'Кейіпкер немесе автор есімі',
    diary_audio_recording: 'Дауыс жазылып жатыр...',
    diary_audio_stop: 'Жазуды тоқтату',
    diary_audio_play: 'Тыңдау',
    diary_audio_save: 'Күнделікке сақтау (+5 XP)',
    diary_saved_success: 'Күнделікке сәтті сақталды! +5 XP',

    // Бәйтерек геймификациясы
    tree_title: 'Менің Бәйтерегім — Білім ағашы',
    tree_level_1: 'Жас өскін (1-деңгей)',
    tree_level_2: 'Жас шыбық (2-деңгей)',
    tree_level_3: 'Жасыл Бәйтерек (3-деңгей)',
    tree_level_4: 'Жемісті Бәйтерек (4-деңгей)',
    tree_level_5: 'Алтын Бәйтерек (5-деңгей)',
    tree_stage_next: 'Келесі деңгейге дейін: {xp} XP қалды'
  },
  ru: {
    app_title: 'KitapTracker — Путешествие в мир книг',
    tagline: 'Интерактивная игровая веб-платформа для мотивации школьников к чтению',
    demo_badge: 'ДЕМО РЕЖИМ (Сгенерированные данные)',
    
    // Меню
    nav_world: 'Мой мир',
    nav_shelf: 'Книжная полка',
    nav_play: 'Игровая площадка',
    nav_mission: 'Общая миссия',
    nav_achievements: 'Мои достижения',
    nav_teacher: 'Кабинет учителя',
    nav_admin: 'Администрирование',
    nav_logout: 'Выйти',

    // Авторизация
    auth_welcome: 'Добро пожаловать в мир книг!',
    auth_student_login: 'Войти как ученик',
    auth_teacher_login: 'Войти как учитель',
    auth_quick_demo_student: 'Войти как ученик (Кулахметова Аягоз)',
    auth_quick_demo_teacher: 'Войти как учитель (Сауле Маратовна)',
    auth_nickname: 'Имя ученика',
    auth_pin: '4-значный PIN-код',
    auth_class_code: 'Код класса (например: DEMO25)',
    auth_start_journey: 'Начать первое путешествие!',
    auth_step1_title: 'Шаг 1. Выберите аватар и никнейм',
    auth_step2_title: 'Шаг 2. Введите код класса',
    auth_step3_title: 'Шаг 3. Выберите книгу и цель чтения',
    auth_enter_btn: 'Войти',
    auth_register_btn: 'Регистрация',

    // Мой мир
    world_q_reading: 'Какую книгу я сейчас читаю?',
    world_q_today: 'Что я делаю сегодня?',
    world_q_achieve: 'Чего я достиг?',
    world_continue_read: 'Продолжить чтение',
    world_log_today: 'Отметить чтение',
    world_daily_mission: 'Миссия на сегодня',
    world_weekly_goal: 'Личная цель на неделю',
    world_journey_status: 'Текущий этап карты путешествия',
    world_recent_reward: 'Последнее достижение',
    world_teacher_feedback: 'Новый отзыв учителя',

    // Полка
    shelf_all: 'Все книги',
    shelf_want: 'Хочу прочитать',
    shelf_reading: 'Читаю сейчас',
    shelf_finished: 'Прочитано',
    shelf_add_manual: 'Добавить книгу не из каталога',
    shelf_search_ph: 'Поиск по названию или автору...',
    shelf_filter_grade: 'Класс',
    shelf_filter_genre: 'Жанр',
    shelf_filter_lang: 'Язык',
    shelf_filter_all: 'Все',
    shelf_btn_start_journey: 'Начать путешествие',
    shelf_btn_read_chapter: 'Читать текст',
    shelf_manual_title: 'Название книги',
    shelf_manual_author: 'Автор',
    shelf_manual_pages: 'Всего страниц (по реальному изданию)',
    shelf_manual_save: 'Добавить на полку',

    // Отметка
    log_modal_title: 'Отметка сегодняшнего чтения',
    log_notice: 'Это данные, указанные самим учеником (самоотчет).',
    log_last_page: 'Последняя прочитанная страница',
    log_minutes: 'Время чтения (минут, необязательно)',
    log_note: 'Ваша мысль о герое или событии (кратко)',
    log_save_btn: 'Сохранить',

    // Игры
    game_title: 'Игровая площадка',
    game_select_instruction: 'Выберите задание по прочитанной книге:',
    game_btn_check: 'Ответить',
    game_btn_retry: 'Попробовать снова',
    game_btn_continue: 'Продолжить',
    game_btn_submit_thought: 'Отправить ответ',
    game_feedback_correct: 'Отлично! Ответ абсолютно верный!',
    game_feedback_retry: 'Подумай ещё раз. Обрати внимание на детали!',
    game_hint_label: 'Подсказка:',
    game_explanation_label: 'Объяснение:',
    game_locked_msg: 'Это задание пока заблокировано. Прочитайте соответствующую часть книги!',

    // Миссия
    mission_title: 'Общая миссия: Классный «Сад знаний»',
    mission_desc: 'Класс вместе растит виртуальный сад. Каждое действие вносит вклад в общую цель.',
    mission_target: 'Общая цель',
    mission_current: 'Выполнено',
    mission_remaining: 'Осталось',
    mission_my_contrib: 'Мой вклад',

    // Достижения
    achieve_title: 'Карта путешествия и награды',
    achieve_xp_total: 'Накоплено XP',
    achieve_badges: 'Значки достижений',
    achieve_decor: 'Украшения для аватара',
    achieve_items: 'Предметы для полки',
    achieve_scenes: 'Фоны путешествия',
    achieve_rules_title: 'Правила начисления очков (простые и прозрачные):',

    // Учитель
    teacher_title: 'Кабинет учителя',
    teacher_tab_overview: 'Обзор (4 показателя)',
    teacher_tab_classes: 'Классы и коды',
    teacher_tab_builder: 'Конструктор заданий',
    teacher_tab_reviews: 'Проверка ответов',
    teacher_tab_missions: 'Общие миссии',
    teacher_export_csv: 'Выгрузить отчет CSV',
    teacher_csv_note: 'Примечание: Игровые очки XP не конвертируются автоматически в школьные оценки.',
    teacher_draft_tool: '«Черновик из фрагмента» (генерация по правилам, не AI)',
    teacher_accept_btn: 'Принять (+XP)',
    teacher_return_btn: 'Вернуть (на доработку)',

    // Этапы (Саяхат картасының 5 кезеңі)
    stage_1: 'Бастау қақпасы',
    stage_2: 'Кейіпкерлер мекені',
    stage_3: 'Оқиғалар жолы',
    stage_4: 'Ой қазынасы',
    stage_5: 'Кітап шыңы',
    stage_action_goal: 'Постановка цели и первая отметка',
    stage_action_char: 'Знакомство с героями',
    stage_action_events: 'Определение хронологии событий',
    stage_action_treasure: 'Анализ слов и аргументов',
    stage_action_summit: 'Завершение книги и рефлексия',

    // Дневник читателя
    diary_title: 'Оқырман күнделігі',
    diary_subtitle: 'Цитаты, аудио-отзывы и размышления о прочитанных книгах',
    diary_add_quote: 'Добавить цитату',
    diary_record_audio: 'Записать аудио-отзыв',
    diary_tab_all: 'Все записи',
    diary_tab_quotes: 'Цитаты',
    diary_tab_audio: 'Аудио-отзывы',
    diary_empty: 'Пока записей нет.',
    diary_quote_ph: 'Напишите цитату...',
    diary_quote_author: 'Автор цитаты',
    diary_audio_recording: 'Запись...',
    diary_audio_stop: 'Остановить',
    diary_audio_play: 'Слушать',
    diary_audio_save: 'Сохранить (+5 XP)',
    diary_saved_success: 'Сохранено! +5 XP',

    // Байтерек
    tree_title: 'Менің Бәйтерегім — Білім ағашы',
    tree_level_1: 'Жас өскін (1-уровень)',
    tree_level_2: 'Жас шыбық (2-уровень)',
    tree_level_3: 'Жасыл Бәйтерек (3-уровень)',
    tree_level_4: 'Жемісті Бәйтерек (4-уровень)',
    tree_level_5: 'Алтын Бәйтерек (5-уровень)',
    tree_stage_next: 'До следующего уровня: {xp} XP'
  }
};

let currentLang = 'kk';
try {
  const saved = localStorage.getItem('kt_lang');
  if (saved === 'kk' || saved === 'ru') currentLang = saved;
} catch {}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('kt_lang', lang);
  }
}

export function t(key, params = {}) {
  const dict = translations[currentLang] || translations.kk;
  let str = dict[key] || translations.kk[key] || key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(new RegExp(`{${k}}`, 'g'), v);
  }
  return str;
}
