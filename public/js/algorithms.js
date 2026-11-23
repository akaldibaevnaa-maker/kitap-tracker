// ==============================================================================
// KITAP TRACKER — 7 АВТОРЛЫҚ АЛГОРИТМДЕР МОДУЛІ (AUTHOR ALGORITHMS)
// Автор: Құлахметова Аягөз (11-сынып оқушысы, №290 орта мектеп)
// Жетекшісі: Аскарова Айнур Калдыбаевна
// Ғылыми кеңесші: Құлмырзаев Нұрлан Серікұлы (Жасанды интеллект институты директоры)
// ==============================================================================

/**
 * 1. АЛГОРИТМ: Оқылған беттерді есептеу және валидациялау алгоритмі
 * (Page Tallying & Verification Algorithm)
 * Жалған немесе қайталанған жазбаларды сүзеді, кітаптың жалпы бетінен аспауын қадағалайды.
 */
export function calculateTotalPages(logs = [], shelf = [], books = []) {
  const bookMap = new Map();
  books.forEach(b => bookMap.set(Number(b.id), b));
  shelf.forEach(s => {
    if (!bookMap.has(Number(s.book_id))) {
      bookMap.set(Number(s.book_id), { total_pages: s.total_pages || 100 });
    }
  });

  // Әр кітап бойынша ең жоғары тексерілген бетті есептеу
  const perBookMax = new Map();
  for (const log of logs) {
    const bookId = Number(log.book_id);
    const book = bookMap.get(bookId);
    const maxAllowed = book?.total_pages || 5000;
    const page = Math.min(Math.max(0, Number(log.page) || 0), maxAllowed);

    const prev = perBookMax.get(bookId) || 0;
    if (page > prev) {
      perBookMax.set(bookId, page);
    }
  }

  // Аяқталған кітаптардың толық беттерін қосу
  for (const s of shelf) {
    const bookId = Number(s.book_id);
    if (s.status === 'finished') {
      const book = bookMap.get(bookId);
      const total = s.total_pages || book?.total_pages || 100;
      perBookMax.set(bookId, Math.max(perBookMax.get(bookId) || 0, total));
    }
  }

  let totalPages = 0;
  for (const val of perBookMax.values()) {
    totalPages += val;
  }
  return totalPages;
}

/**
 * 2. АЛГОРИТМ: Оқу мақсатының орындалу алгоритмі
 * (Reading Goal Evaluation Algorithm)
 * Апталық және айлық мақсаттардың орындалу динамикасын, күндер санын есептейді.
 */
export function evaluateReadingGoal(logs = [], weeklyTargetDays = 5, dailyTargetMinutes = 15) {
  const today = new Date();
  const currentWeekStart = new Date(today);
  const dayOfWeek = (today.getDay() + 6) % 7; // Дүйсенбіні 0 деп аламыз
  currentWeekStart.setDate(today.getDate() - dayOfWeek);
  currentWeekStart.setHours(0, 0, 0, 0);

  const activeDates = new Set();
  let thisWeekMinutes = 0;
  let thisWeekDays = 0;

  for (const log of logs) {
    const dateStr = log.log_date || (log.created_at ? log.created_at.slice(0, 10) : null);
    if (!dateStr) continue;
    activeDates.add(dateStr);

    const logDate = new Date(dateStr);
    if (logDate >= currentWeekStart) {
      thisWeekMinutes += Number(log.minutes) || 10;
    }
  }

  // Ағымдағы апта күндерін тексеру
  for (let i = 0; i <= dayOfWeek; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (activeDates.has(iso)) {
      thisWeekDays++;
    }
  }

  const percent = weeklyTargetDays > 0 ? Math.min(100, Math.round((thisWeekDays / weeklyTargetDays) * 100)) : 100;
  const isGoalMet = thisWeekDays >= weeklyTargetDays;

  return {
    weeklyTargetDays,
    thisWeekDays,
    percent,
    isGoalMet,
    thisWeekMinutes,
    dailyTargetMinutes,
    totalActiveDays: activeDates.size
  };
}

/**
 * 3. АЛГОРИТМ: Жеті сатылы «Кітап ағашының» даму алгоритмі
 * (7-Stage Book Tree Progression Algorithm)
 * 1. Тұқым -> 2. Өскін -> 3. Жас өркен -> 4. Жас ағаш -> 5. Жапырақты ағаш -> 6. Гүлдеген ағаш -> 7. Жемісті ағаш
 */
export const TREE_STAGES = [
  {
    stage: 1,
    id: 'seed',
    name: 'Тұқым',
    nameRu: 'Семя',
    title: 'Алғашқы қадам',
    titleRu: 'Первый шаг',
    icon: '🌱',
    color: '#84cc16',
    desc: 'Кітап әлеміне саяхат алғашқы дәннен басталады. Кітап сөресінен қызықты туынды таңдап, оқуды баста!',
    conditionText: 'Алғашқы кітапты тіркеу',
    threshold: { books: 0, pages: 0, logs: 0, xp: 0 }
  },
  {
    stage: 2,
    id: 'sprout',
    name: 'Өскін',
    nameRu: 'Росток',
    title: 'Жас талпыныс',
    titleRu: 'Юное стремление',
    icon: '🌿',
    color: '#22c55e',
    desc: 'Дән жерден бас көтеріп, алғашқы жасыл өскін пайда болды! Алғашқы оқу мақсатың орындалды.',
    conditionText: 'Алғашқы оқу мақсатын орындау (1+ жазба)',
    threshold: { books: 0, pages: 5, logs: 1, xp: 20 }
  },
  {
    stage: 3,
    id: 'sapling',
    name: 'Жас өркен',
    nameRu: 'Побег',
    title: 'Ізденімпаз оқырман',
    titleRu: 'Любознательный читатель',
    icon: '🪴',
    color: '#10b981',
    desc: 'Өркен күш алып, тамыры беки түсті. 50-ден астам бет оқылып, тұрақты оқу әдеті қалыптасуда.',
    conditionText: 'Кемінде 50 бет оқу',
    threshold: { books: 0, pages: 50, logs: 2, xp: 60 }
  },
  {
    stage: 4,
    id: 'young_tree',
    name: 'Жас ағаш',
    nameRu: 'Молодое дерево',
    title: 'Талғампаз оқырман',
    titleRu: 'Вдумчивый читатель',
    icon: '🌳',
    color: '#059669',
    desc: 'Жас ағаш мығым діңге ие болды! 3 толық кітап оқылып, әдеби дүниетанымың кеңейді.',
    conditionText: 'Кемінде 3 кітапты толық оқу',
    threshold: { books: 3, pages: 120, logs: 4, xp: 150 }
  },
  {
    stage: 5,
    id: 'leafy_tree',
    name: 'Жапырақты ағаш',
    nameRu: 'Ветвистое дерево',
    title: 'Зерделі білімпаз',
    titleRu: 'Эрудированный книголюб',
    icon: '🌲',
    color: '#047857',
    desc: 'Ағашыңның жасыл жапырақтары жайқалып, көлеңкесі сая болды. 5 кітапты игеріп, оқудың рахатын сезіндің.',
    conditionText: 'Кемінде 5 кітапты аяқтау',
    threshold: { books: 5, pages: 250, logs: 7, xp: 280 }
  },
  {
    stage: 6,
    id: 'blossoming_tree',
    name: 'Гүлдеген ағаш',
    nameRu: 'Цветущее дерево',
    title: 'Парасат биігі',
    titleRu: 'Вершина мудрости',
    icon: '🌸🌳',
    color: '#0d9488',
    desc: 'Ағашың әдемі гүл ашты! 10 кітап оқылып, сөздік қорың мен талдау қабілетің биік деңгейге көтерілді.',
    conditionText: 'Кемінде 10 кітапты аяқтау',
    threshold: { books: 10, pages: 450, logs: 12, xp: 450 }
  },
  {
    stage: 7,
    id: 'fruitful_tree',
    name: 'Жемісті Бәйтерек',
    nameRu: 'Плодоносный Байтерек',
    title: 'Кітап шыңының шебері',
    titleRu: 'Мастер книжных вершин',
    icon: '👑🍎🌳',
    color: '#d97706',
    desc: 'Ең жоғары дәреже! Ағашың алтын жеміс берді. Жеке оқу межесіне жетіп, нағыз кемел оқырман атандың.',
    conditionText: 'Жеке оқу межесіне жету (15+ кітап немесе 600+ бет)',
    threshold: { books: 15, pages: 600, logs: 18, xp: 700 }
  }
];

export function calculateBookTreeStage(stats = {}, customRules = null) {
  const finishedBooks = Number(stats.finishedBooks) || 0;
  const totalPages = Number(stats.totalPages) || 0;
  const logsCount = Number(stats.logsCount) || 0;
  const xp = Number(stats.xp) || 0;

  // Әкімші баптаулары болса қолдану
  const stages = customRules?.stages || TREE_STAGES;

  let currentStageIndex = 0;
  for (let i = stages.length - 1; i >= 0; i--) {
    const st = stages[i];
    const th = st.threshold;
    if (
      (th.books && finishedBooks >= th.books) ||
      (th.pages && totalPages >= th.pages) ||
      (th.xp && xp >= th.xp) ||
      (i === 1 && (logsCount >= 1 || totalPages >= 5 || xp >= 20)) ||
      (i === 0)
    ) {
      currentStageIndex = i;
      break;
    }
  }

  const currentStage = stages[currentStageIndex];
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

  // Келесі сатыға дейінгі прогресс пайызы
  let progressPercent = 100;
  let remainingText = 'Ең жоғары сатыға жеттіңіз! 🌟';

  if (nextStage) {
    const prevXP = currentStage.threshold.xp || 0;
    const nextXP = nextStage.threshold.xp || 100;
    const xpSpan = Math.max(1, nextXP - prevXP);
    const xpGained = Math.max(0, xp - prevXP);
    progressPercent = Math.min(99, Math.max(5, Math.round((xpGained / xpSpan) * 100)));

    const remainingPages = Math.max(0, (nextStage.threshold.pages || 0) - totalPages);
    const remainingBooks = Math.max(0, (nextStage.threshold.books || 0) - finishedBooks);
    const remainingXp = Math.max(0, nextXP - xp);

    const parts = [];
    if (remainingBooks > 0) parts.push(`${remainingBooks} кітап`);
    if (remainingPages > 0) parts.push(`${remainingPages} бет`);
    if (remainingXp > 0) parts.push(`${remainingXp} XP`);

    remainingText = `Келесі «${nextStage.name}» сатысына: ${parts.join(' немесе ')} қажет`;
  }

  return {
    stage: currentStage.stage,
    id: currentStage.id,
    name: currentStage.name,
    nameRu: currentStage.nameRu,
    title: currentStage.title,
    titleRu: currentStage.titleRu,
    icon: currentStage.icon,
    color: currentStage.color,
    desc: currentStage.desc,
    conditionText: currentStage.conditionText,
    currentStageIndex,
    totalStages: stages.length,
    progressPercent,
    remainingText,
    nextStage: nextStage ? { name: nextStage.name, stage: nextStage.stage, xp: nextStage.threshold.xp } : null
  };
}

/**
 * 4. АЛГОРИТМ: XP ұпайларын есептеу және қайталанған жазбалардан қорғау
 * (Anti-abuse Gamification XP Engine)
 */
export function calculateXpAward(actionType, context = {}, config = {}) {
  const rules = {
    daily_log_first: config.log_per_day || 10,
    daily_log_subsequent: 0, // Бір күнде екінші оқу жазбасына қосымша ұпай жоқ
    book_finish: config.book_finish || 50,
    quiz_full_pass: config.quiz_reward || 20,
    quiz_partial_pass: 5,
    task_first_try: config.task_reward || 10,
    task_retry: 2,
    quote_add: 5,
    audio_reflection: 10,
    marathon_milestone: 25,
    streak_bonus_5: 30
  };

  switch (actionType) {
    case 'daily_log': {
      // Сол күні бұрын оқу жазбасы болған-болмағанын тексеру
      if (context.isFirstLogToday) {
        return { xp: rules.daily_log_first, crystals: 0, reason: 'Бүгінгі алғашқы оқу белгіленді (+10 XP)' };
      }
      return { xp: rules.daily_log_subsequent, crystals: 0, reason: 'Бүгінгі оқу қайта белгіленді (0 XP)' };
    }
    case 'book_finish': {
      return { xp: rules.book_finish, crystals: 2, reason: 'Кітап толық аяқталды (+50 XP, +2 💎)' };
    }
    case 'quiz': {
      const scorePct = Number(context.scorePercent) || 0;
      if (scorePct >= 70) {
        return { xp: rules.quiz_full_pass, crystals: 2, reason: 'Кітап квизін үздік тапсырды (+20 XP, +2 💎)' };
      }
      return { xp: rules.quiz_partial_pass, crystals: 0, reason: 'Квиз тапсырылды (+5 XP)' };
    }
    case 'task': {
      if (context.isFirstCompletion) {
        return { xp: rules.task_first_try, crystals: 1, reason: 'Ойын тапсырмасы орындалды (+10 XP, +1 💎)' };
      }
      return { xp: rules.task_retry, crystals: 0, reason: 'Жаттығу орындалды (+2 XP)' };
    }
    case 'quote': {
      return { xp: rules.quote_add, crystals: 0, reason: 'Оқырман күнделігіне дәйексөз қосылды (+5 XP)' };
    }
    case 'audio': {
      return { xp: rules.audio_reflection, crystals: 1, reason: 'Аудио-рефлексия жазылды (+10 XP, +1 💎)' };
    }
    case 'streak_5': {
      return { xp: rules.streak_bonus_5, crystals: 3, reason: '5 күн қатарынан оқу сериясы (+30 XP, +3 💎)' };
    }
    default:
      return { xp: 0, crystals: 0, reason: '' };
  }
}

/**
 * 5. АЛГОРИТМ: Оқылым белсенділігін талдау және қарқын есептеу
 * (Reading Activity Dynamics & Velocity Algorithm)
 */
export function analyzeReadingDynamics(logs = [], shelf = []) {
  const now = new Date();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Соңғы 7 күн (осы апта) vs Алдыңғы 7 күн (өткен апта)
  let thisWeekPages = 0;
  let thisWeekMinutes = 0;
  let thisWeekDaysSet = new Set();

  let lastWeekPages = 0;
  let lastWeekMinutes = 0;
  let lastWeekDaysSet = new Set();

  const dailyPagesMap = {}; // '2026-11-20': 15

  logs.forEach(l => {
    const dateStr = l.log_date || (l.created_at ? l.created_at.slice(0, 10) : null);
    if (!dateStr) return;
    const page = Number(l.page) || 0;
    const minutes = Number(l.minutes) || 10;

    dailyPagesMap[dateStr] = (dailyPagesMap[dateStr] || 0) + page;

    const logTime = new Date(dateStr).getTime();
    const diffDays = Math.floor((now.getTime() - logTime) / ONE_DAY_MS);

    if (diffDays >= 0 && diffDays < 7) {
      thisWeekPages += page;
      thisWeekMinutes += minutes;
      thisWeekDaysSet.add(dateStr);
    } else if (diffDays >= 7 && diffDays < 14) {
      lastWeekPages += page;
      lastWeekMinutes += minutes;
      lastWeekDaysSet.add(dateStr);
    }
  });

  const pageDelta = thisWeekPages - lastWeekPages;
  const isGrowth = pageDelta >= 0;

  // Орташа жылдамдық: бет/минут
  const readingSpeed = thisWeekMinutes > 0 ? (thisWeekPages / thisWeekMinutes).toFixed(1) : '1.5';

  // Ғылыми негізделген жеке кеңес генераторы (тек нақты сандарға сүйенеді)
  let recommendation = '';
  if (thisWeekPages > 0 && lastWeekPages > 0) {
    if (pageDelta > 0) {
      recommendation = `Сен осы аптада ${thisWeekPages} бет оқыдың. Өткен аптамен салыстырғанда ${pageDelta} бетке артық. Оқу қарқының өте жоғары, жарайсың!`;
    } else if (pageDelta === 0) {
      recommendation = `Осы аптада ${thisWeekPages} бет оқып, өткен аптадағы тұрақты қарқыныңды дәл сақтап қалдың. Тұрақтылық — үлкен жетістіктің кепілі!`;
    } else {
      recommendation = `Осы аптада ${thisWeekPages} бет оқылды (өткен аптадан ${Math.abs(pageDelta)} бетке кем). Күніне 10 минут уақыт бөлу арқылы қарқынды қайта қалпына келтіре аласың!`;
    }
  } else if (thisWeekPages > 0) {
    recommendation = `Сен осы аптада ${thisWeekPages} бет оқып, тамаша бастама жасадың! Күнделікті 15 минут оқу әдетін сақта.`;
  } else {
    recommendation = 'Кітап сөресінен ұнаған кітапты таңдап, күніне 10-15 минут оқуды баста! Бұл сенің жеке Кітап ағашыңды өсіреді.';
  }

  return {
    thisWeekPages,
    thisWeekMinutes,
    thisWeekActiveDays: thisWeekDaysSet.size,
    lastWeekPages,
    lastWeekMinutes,
    lastWeekActiveDays: lastWeekDaysSet.size,
    pageDelta,
    isGrowth,
    readingSpeed,
    recommendation,
    dailyPagesMap
  };
}

/**
 * 6. АЛГОРИТМ: Мәтінді түсіну нәтижесін бағалау алгоритмі
 * (Reading Comprehension Scoring & Rubric Algorithm)
 */
export function evaluateReadingComprehension(answers = {}, questions = [], customRubric = null) {
  let correctCount = 0;
  const totalQuestions = questions.length;
  const questionResults = [];

  questions.forEach((q, idx) => {
    const studentAnswer = answers[q.id] !== undefined ? answers[q.id] : answers[idx];
    const isCorrect = studentAnswer !== undefined && (
      studentAnswer === q.correct_option ||
      Number(studentAnswer) === Number(q.correct_index) ||
      studentAnswer === q.correct_answer
    );

    if (isCorrect) correctCount++;

    questionResults.push({
      id: q.id || idx,
      prompt: q.prompt || q.question,
      studentAnswer,
      isCorrect,
      explanation: q.explanation || (isCorrect ? 'Дұрыс жауап! Мәтінге толық сәйкес келеді.' : 'Бұл таңдау мәтіндегі оқиға желісімен сәйкеспейді. Мәтін үзіндісін қайта қараңыз.')
    });
  });

  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // 4 педагогикалық түсіну деңгейі
  let level = 'Бастапқы оқырман';
  let badgeColor = '#ef4444';
  let feedback = 'Мәтінді мұқият қайта оқып шығу және кейіпкерлердің іс-әрекетіне назар аудару ұсынылады.';

  if (percentage >= 90) {
    level = 'Сарапшы зерттеуші';
    badgeColor = '#10b981';
    feedback = 'Шығарманың ішкі мәнін, автор идеясын және кейіпкер мінездерін терең түсінгенсің! Өз ойыңды еркін дәлелдей аласың.';
  } else if (percentage >= 70) {
    level = 'Талғампаз оқырман';
    badgeColor = '#3b82f6';
    feedback = 'Кітаптың негізгі оқиғалары мен кейіпкерлер арасындағы байланысты жақсы меңгергенсің.';
  } else if (percentage >= 50) {
    level = 'Негізгі оқырман';
    badgeColor = '#f59e0b';
    feedback = 'Жалпы мазмұн түсінікті, алайда кейбір мәтіндік детальдарға қайта назар салған жөн.';
  }

  return {
    correctCount,
    totalQuestions,
    percentage,
    level,
    badgeColor,
    feedback,
    questionResults
  };
}

/**
 * 7. АЛГОРИТМ: Оқушының жеке оқу прогресін визуализациялау алгоритмі
 * (Progress Visualization & Chart Data Generation)
 */
export function generateProgressVisualizationData(logs = [], shelf = [], daysCount = 7) {
  const dates = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const logDateMap = {};
  logs.forEach(l => {
    const dateStr = l.log_date || (l.created_at ? l.created_at.slice(0, 10) : null);
    if (!dateStr) return;
    logDateMap[dateStr] = (logDateMap[dateStr] || 0) + (Number(l.page) || 0);
  });

  const chartPoints = dates.map(dateStr => {
    const dayName = new Date(dateStr).toLocaleDateString('kk-KZ', { weekday: 'short' });
    const pages = logDateMap[dateStr] || 0;
    return {
      date: dateStr,
      label: dayName,
      pages
    };
  });

  const maxPages = Math.max(10, ...chartPoints.map(p => p.pages));

  return {
    chartPoints,
    maxPages,
    datesCount: dates.length,
    periodLabel: `Соңғы ${daysCount} күн`
  };
}
