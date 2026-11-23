/**
 * Kitap Tracker - AI Book Assistant Module (Жасанды интеллект кітап көмекшісі)
 * 
 * Құлахметова Аягөз (№290 орта мектеп, 2026 ж.)
 * Жетекші: Аскарова А.К., Кеңесші: Құлмырзаев Н.С.
 *
 * Ерекшеліктері:
 * 1. 🦉 «Кітап Досы» атты сократтық тәлімгер кейіпкері.
 * 2. Оқушының орнына үй жұмысын орындамайды, өзіндік ойлауды дамытады.
 * 3. Нақты Google Gemini API ресми REST интеграциясы.
 * 4. API кілті жоқ болса, жалған жауап бермейді (no fake AI responses).
 * 5. 8 арнайы режим: жас бойынша ұсыныс, қызығушылық, сұрақтар, кейіпкер, идея, пікір, жоспар, белсенділік.
 */

import { computeStudentTreeStage } from './progress.js';
import { totalXp } from './xp.js';

export const AI_MODES = {
  chat: { id: 'chat', label: 'Жалпы сұхбат', icon: '💬' },
  recommend: { id: 'recommend', label: 'Жасқа сай кітаптар', icon: '📚' },
  interest_recommend: { id: 'interest_recommend', label: 'Қызығушылық бойынша', icon: '✨' },
  questions: { id: 'questions', label: 'Мазмұндық сұрақтар', icon: '❓' },
  character: { id: 'character', label: 'Кейіпкерді талдау', icon: '🎭' },
  theme: { id: 'theme', label: 'Шығарманың идеясы', icon: '💡' },
  review_help: { id: 'review_help', label: 'Пікір жазу көмегі', icon: '✍️' },
  plan: { id: 'plan', label: 'Жеке оқу жоспары', icon: '📅' },
  activity_advice: { id: 'activity_advice', label: 'Белсенділік кеңесі', icon: '📊' }
};

export const BASE_SYSTEM_PROMPT = `
Сен — «Kitap Tracker» білім беру платформасындағы 🦉 «Кітап Досы» атты жасанды интеллект кітап көмекшісісің.
Жоба авторы: №290 орта мектеп оқушысы Құлахметова Аягөз (2026 ж.).

СЕНІҢ МИССИЯҢ ЖӘНЕ НЕГІЗГІ ПЕДАГОГИКАЛЫҚ ЕРЕЖЕЛЕРІҢ:
1. Мақсатың — оқушылардың кітап оқуға деген сүйіспеншілігін ояту, олардың сыни ойлауын, талдау қабілетін және сөздік қорын дамыту.
2. ҚАТАҢ ЕРЕЖЕ: ЕШҚАШАН оқушының орнына эссе, дайын пікір немесе үй тапсырмасының жауабын толық жазып берме! 
3. Әрдайым СОКРАТТЫҚ ӘДІСТІ (бағыттаушы жетекші сұрақтар, ойландыратын кеңестер, мысалдар, сұрақ-жауап) қолдан.
4. Оқушының өз бетінше оқып, өзі ой түйіп, өз сөзімен тұжырым жасауына көмектес.
5. Қарым-қатынас мәнері: Жылы, мейірімді, достық, жігерлендіруші, мектеп жасына лайықты таза қазақ әдеби тілі.
6. Жауаптарды құрылымды, пункттермен, көрнекі эмодзилермен әдемі безендіріп бер.
7. Оқушыға «Кітап ағашын» өсіруге, жаңа сатыларға қол жеткізуге және XP жинауға жігер бер!
`.trim();

/**
 * Базадан немесе орта айнымалыларынан AI баптауларын алу
 */
export function getAiConfig(db) {
  const row = db.get('SELECT * FROM ai_config WHERE is_active = 1 LIMIT 1');
  const envKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || null;
  const apiKey = (envKey && envKey.trim()) ? envKey.trim() : (row?.api_key ? row.api_key.trim() : null);

  return {
    configured: Boolean(apiKey && apiKey.length > 8),
    provider: row?.provider || 'gemini',
    model: row?.model || 'gemini-2.0-flash',
    apiKey,
    temperature: row?.temperature ?? 0.7,
    systemPrompt: row?.system_prompt || BASE_SYSTEM_PROMPT,
    source: (envKey && envKey.trim()) ? 'env' : (row?.api_key ? 'database' : 'none'),
    updatedAt: row?.updated_at || null
  };
}

/**
 * Қауіпсіздік мақсатында API кілтін жасырып көрсету
 */
export function maskApiKey(key) {
  if (!key) return null;
  const clean = String(key).trim();
  if (clean.length <= 8) return '********';
  return clean.slice(0, 6) + '...' + clean.slice(-4);
}

/**
 * Оқушының нақты көрсеткіштерін contextual data ретінде жинау
 */
export function buildStudentContext(db, user, bookId = null) {
  if (!user) return '';

  const cls = user.class_id ? db.get('SELECT name, level FROM classes WHERE id = ?', user.class_id) : null;
  const tree = computeStudentTreeStage(db, user.id);
  const xp = totalXp(db, user.id);

  const shelfCount = db.get(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) AS reading,
      SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) AS finished,
      SUM(CASE WHEN status = 'want' THEN 1 ELSE 0 END) AS planned
    FROM shelf WHERE user_id = ?
  `, user.id) || { total: 0, reading: 0, finished: 0, planned: 0 };

  const logsAgg = db.get(`
    SELECT 
      COALESCE(SUM(page), 0) AS total_pages,
      COALESCE(SUM(minutes), 0) AS total_minutes,
      COUNT(DISTINCT log_date) AS active_days
    FROM reading_logs WHERE user_id = ?
  `, user.id) || { total_pages: 0, total_minutes: 0, active_days: 0 };

  const userName = user.nickname || user.name || 'Оқушы';

  let ctx = `[ОҚУШЫ АҚПАРАТЫ]:
- Аты-жөні: ${userName}
- Сыныбы: ${cls ? cls.name : 'Көрсетілмеген'}
- Деңгейі (XP): ${xp} XP, Кристалдар: ${user.crystals || 0} 💎
- Кітап ағашының сатысы: ${tree ? `${tree.stage}-саты «${tree.name}» ${tree.icon}` : '1-саты'}
- Оқылған кітаптар саны: ${shelfCount.finished || 0}
- Қазір оқылып жатқан кітаптар: ${shelfCount.reading || 0}
- Жалпы оқылған беттер саны: ${logsAgg.total_pages || 0} бет
- Белсенді оқу күндері: ${logsAgg.active_days || 0} күн`;

  if (bookId) {
    const book = db.get('SELECT * FROM books WHERE id = ?', bookId);
    if (book) {
      const shelfItem = db.get('SELECT * FROM shelf WHERE user_id = ? AND book_id = ?', user.id, bookId);
      const diaryItem = db.get('SELECT * FROM reading_diary WHERE user_id = ? AND book_id = ?', user.id, bookId);
      ctx += `\n\n[ТАЛДАНАТЫН КІТАП АҚПАРАТЫ]:
- Атауы: «${book.title}»
- Авторы: ${book.author}
- Бет саны: ${book.total_pages || 0} бет
- Жанры: ${book.genre || 'Әдеби шығарма'}
- Сипаттамасы: ${book.description || 'Жоқ'}
- Оқушының оқу мәртебесі: ${shelfItem ? shelfItem.status : 'сөреге салынбаған'} (ағымдағы беті: ${shelfItem?.current_page || 0})`;
      if (diaryItem) {
        ctx += `\n- Күнделік жазбасы: ${diaryItem.summary ? `Қорытындысы: "${diaryItem.summary}"` : ''} ${diaryItem.favorite_character ? `Сүйікті кейіпкері: "${diaryItem.favorite_character}"` : ''}`;
      }
    }
  }

  return ctx;
}

/**
 * 8 Режимге арналған мақсатты нұсқаулықтарды қалыптастыру
 */
export function buildModePrompt(mode, studentMessage, bookInfo = null) {
  switch (mode) {
    case 'recommend':
      return `[РЕЖИМ: ЖАС ЕРЕКШЕЛІГІНЕ ҚАРАЙ КІТАП ҰСЫНУ]
Оқушының жасына, сыныбына және деңгейіне сай келетін, көркемдік құндылығы жоғары 2-3 кітап ұсын (қазақ классикасынан немесе балалар әдебиетінің жауһарларынан).
Әр кітаптың несімен қызықты екенін, қандай құндылық беретінін қысқаша түсіндір және оқушының таңдауын сұра.
Оқушының сұрағы/сөзі: "${studentMessage || 'Маған жасыма сай қандай кітап оқуға кеңес бересің?'}"`;

    case 'interest_recommend':
      return `[РЕЖИМ: ҚЫЗЫҒУШЫЛЫҚҚА СӘЙКЕС КІТАП ТАҢДАУ]
Оқушының қызығушылығына (мысалы: ғарыш, шытырман оқиға, батырлар, жануарлар, қиял-ғажайып, тарих, детектив) сәйкес кітап таңдауға көмектес.
Егер қызығушылығы нақты айтылмаса, одан қай жанрлар мен тақырыптар ұнайтынын сұра.
Оқушының сұрағы: "${studentMessage || 'Менің қызығушылығыма сай кітап таңдайықшы!'}"`;

    case 'questions':
      return `[РЕЖИМ: КІТАП МАЗМҰНЫ БОЙЫНША СҰРАҚТАР ҚҰРАСТЫРУ]
${bookInfo ? `Талданатын кітап: «${bookInfo.title}» (${bookInfo.author}).` : 'Кітап бойынша.'}
Оқушының кітапты қалай түсінгенін тексеретін, есте сақтауын және сыни ойлауын шыңдайтын 3-4 терең сұрақ ұсын.
Сұрақтар тек құрғақ фактілер емес, кейіпкердің іс-әрекетінің себебін, оқиғаның салдарын ойлануға жетелесін.
Оқушыға осы сұрақтардың біріне жауап беріп көруді ұсын.
Оқушының сөзі: "${studentMessage || 'Осы кітап бойынша маған ойландыратын сұрақтар қойшы!'}"`;

    case 'character':
      return `[РЕЖИМ: КЕЙІПКЕРЛЕРДІ ТАЛДАУҒА КӨМЕКТЕСУ]
${bookInfo ? `Талданатын кітап: «${bookInfo.title}» (${bookInfo.author}).` : ''}
Оқушыға шығармадағы кейіпкерді талдауға сократтық тәсілмен көмектес.
Оқушыға бағыт беретін сұрақтар қой:
1. Кейіпкердің басты мақсаты немесе арманы не?
2. Ол қандай ішкі немесе сыртқы кедергілерге кезікті?
3. Оның бойындағы қандай қасиеттер саған ұнады немесе ұнамады?
4. Сен оның орнында болсаң қалай әрекет етер едің?
Дайын мінездеме жазып берме, оқушыны өз сөзімен кейіпкерді сипаттауға жетеле!
Оқушының сөзі: "${studentMessage || 'Кейіпкерді бірге талдайықшы!'}"`;

    case 'theme':
      return `[РЕЖИМ: ШЫҒАРМАНЫҢ НЕГІЗГІ ИДЕЯСЫН ТҮСІНДІРУ]
${bookInfo ? `Талданатын кітап: «${bookInfo.title}» (${bookInfo.author}).` : ''}
Шығарманың негізгі идеясы мен тақырыбын түсінуге оқушыны жетеле. 
Автор бұл шығарма арқылы оқырманға не айтқысы келді? Қандай өмірлік сабақ береді?
Оқушыға оқиғаның шешімін еске түсіріп, "автор неліктен солай аяқтады деп ойлайсың?" деген сияқты жетекші сұрақтар қой.
Оқушының сөзі: "${studentMessage || 'Шығарманың негізгі идеясы қандай?'}"`;

    case 'review_help':
      return `[РЕЖИМ: КІТАП ТУРАЛЫ ПІКІР ЖАЗУҒА КӨМЕКТЕСУ]
${bookInfo ? `Талданатын кітап: «${bookInfo.title}» (${bookInfo.author}).` : ''}
ҚАТАҢ: Оқушының орнына дайын пікір жазып берме!
Керісінше, оқушыға оқырман күнделігіне немесе портфолиосына арнап сауатты, көркем пікір жазудың 4 қадамдық жоспарын ұсын:
1. Кітап не туралы (1-2 сөйлеммен кіріспе)
2. Ең есте қалған немесе әсерлі оқиға/сәт
3. Кітаптан өзіңе алған тағылымың (қорытынды)
4. Бұл кітапты кімдерге оқуға ұсынасың?
Осы жоспардың әр бөлімін оқушының өзі жазуына бағыт-бағдар бер.
Оқушының сөзі: "${studentMessage || 'Кітап туралы пікірді қалай жазсам болады?'}"`;

    case 'plan':
      return `[РЕЖИМ: ЖЕКЕ ОҚУ ЖОСПАРЫН ҰСЫНУ]
${bookInfo ? `Кітап: «${bookInfo.title}» (${bookInfo.total_pages || 0} бет).` : 'Оқушының кітаптары.'}
Оқушының оқу қарқынына және күнделікті уақытына қарай нақты, қолжетімді күнделікті оқу жоспарын жасап бер.
Мысалы: Күніне 15-20 бет оқыса, қанша күнде бітіреді, қандай уақыттарда оқыған пайдалы. Оқу гигиенасы мен демалыс туралы кеңес бер.
Оқушының сөзі: "${studentMessage || 'Маған осы кітапты оқып бітіру үшін оқу жоспарын құрып берші!'}"`;

    case 'activity_advice':
      return `[РЕЖИМ: ОҚУ БЕЛСЕНДІЛІГІНЕ ҚАРАЙ ҰСЫНЫСТАР БЕРУ]
Оқушының нақты статистикасына сүйеніп жігерлендіруші кеңес бер:
- Үздіксіз оқу күндері (streak) туралы мадақтау.
- Келесі «Кітап ағашы» сатысына өту үшін қанша бет немесе кітап қалғанын еске салу.
- Оқу марафонына қатысу немесе күнделікті белгіленген бет санын тұрақты оқу туралы мотивация беру.
Оқушының сөзі: "${studentMessage || 'Менің оқу белсенділігіме қандай кеңес бересің?'}"`;

    case 'chat':
    default:
      return `[РЕЖИМ: ЖАЛПЫ ӘДЕБИ СҰХБАТ]
Оқушымен кітаптар, оқу мәдениеті, кейіпкерлер немесе кез келген әдеби тақырыпта достық әрі тәлімгерлік сұхбат жүргіз. 
Оқушының сұрағы: "${studentMessage}"`;
  }
}

/**
 * Google Gemini API-ге ресми REST шақыру жіберу
 * (Қосымша сыртқы npm кітапханаларсыз, Node.js fetch қолданылады)
 */
export async function callGeminiApi({
  apiKey,
  model = 'gemini-2.0-flash',
  systemInstruction,
  contents,
  temperature = 0.7
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('AI_API_KEY_MISSING');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  const bodyPayload = {
    contents: contents,
    generationConfig: {
      temperature: Math.max(0, Math.min(2, Number(temperature) || 0.7)),
      maxOutputTokens: 2048,
      topP: 0.95
    }
  };

  if (systemInstruction) {
    bodyPayload.systemInstruction = {
      role: 'system',
      parts: [{ text: systemInstruction }]
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data?.error?.message || `Gemini API қатесі (${res.status} ${res.statusText})`;
      const err = new Error(errMsg);
      err.status = res.status;
      err.details = data?.error;
      throw err;
    }

    const candidate = data.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text;

    if (!replyText) {
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error('Қауіпсіздік сүзгісі бойынша сұраныс тоқтатылды.');
      }
      throw new Error('Gemini API жауап қайтармады немесе жауап бос.');
    }

    return {
      text: replyText.trim(),
      finishReason: candidate?.finishReason || 'STOP',
      model,
      usage: data.usageMetadata || null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Gemini API сұранысының уақыты аяқталды (35 секунд)');
    }
    throw err;
  }
}
