/**
 * KitapTracker — 3D Gamified Student Dashboard ("My Reading World – Менің кітап әлемім")
 * Ресми EdTech 3D визуалды экожүйесі
 */
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal, launchConfetti, openCharacterQuizModal, generateBaiterekSvg } from '../ui.js';
import { generateMascotSvg, renderMascotWidget } from '../mascot.js';

export async function renderWorldView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 70px 20px;">
      <div style="font-size:44px; animation:mascotBob 2s infinite ease-in-out;">🦊📚</div>
      <p style="color:var(--text-muted); font-size:16px; font-weight:800; margin-top:12px;">
        «Менің кітап әлемім» 3D әлемі жүктелуде...
      </p>
    </div>
  `;

  try {
    const [worldData, meData, analyticsData, achievementsData, challengesData, booksRes] = await Promise.all([
      api.getWorld(),
      api.me().catch(() => null),
      api.getAnalytics().catch(() => null),
      api.getAchievements().catch(() => null),
      api.getChallenges().catch(() => ({ challenges: [] })),
      api.getBooks().catch(() => ({ books: [] }))
    ]);

    renderDashboard(container, {
      world: worldData,
      user: meData?.user || null,
      analytics: analyticsData,
      achievements: achievementsData,
      challenges: challengesData?.challenges || [],
      recommendedBooks: booksRes?.books || []
    });
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="color:var(--danger-color); text-align:center; padding:30px;">
        <h3>⚠️ Жүктеу барысында кідіріс болды</h3>
        <p>${err.message}</p>
        <button class="btn-3d btn-3d-green" onclick="window.location.reload()">🔄 Қайта жүктеу</button>
      </div>
    `;
  }
}

function renderDashboard(container, { world, user, analytics, achievements, challenges, recommendedBooks }) {
  const {
    current = null,
    journey = null,
    next = null,
    today = { minutes: 15, logged: false },
    week = { target: 5, done: 0, days: [] },
    xp = user?.xp || 0,
    crystals = achievements?.crystals || 0,
    streak = { count: 0, active_today: false, next_milestone: 3 },
    has_quiz = false,
    last_reward = null,
    feedback = null,
    abai_book_id = 8
  } = world || {};

  const abaiBookId = abai_book_id || 8;
  const currentBook = current ? current.book : null;
  const shelf = current ? current.shelf : null;
  const studentName = user?.nickname || 'Құлахметова Аягөз';
  const className = user?.class?.name || '11 "А" сыныбы';
  const avatarKey = user?.avatar === 'owl' ? 'owl' : 'fox';

  // Бәйтерек ағашының сатысы
  const tree = getBaiterekLevel(xp);
  const nextXpNeeded = tree.level < 7 ? Math.max(0, tree.max + 1 - xp) : 0;
  const treeProgress = tree.level < 7
    ? Math.min(100, Math.max(0, Math.round(((xp - tree.min) / (tree.max - tree.min + 1)) * 100)))
    : 100;

  // Оқу көрсеткіштері
  const totals = analytics?.totals || {
    pages: shelf?.current_page || 0,
    books: achievements?.stats?.finished || 0,
    minutes: today?.minutes || 15,
    streak_count: streak?.count || 0,
    goal_percent: Math.min(100, Math.round(((week?.done || 0) / (week?.target || 5)) * 100))
  };

  // Саяхат картасының 5 кезеңі
  const stageNames = [
    { name: 'Бастау қақпасы', icon: '🚪' },
    { name: 'Кейіпкерлер мекені', icon: '🦊' },
    { name: 'Оқиғалар жолы', icon: '🗺️' },
    { name: 'Ой қазынасы', icon: '💡' },
    { name: 'Кітап шыңы', icon: '🏔️' }
  ];
  const curStageIdx = journey ? Math.min(4, Math.max(0, (journey.current || 1) - 1)) : 0;

  // Маскоттың көңіл-күйі мен мотивациялық сөзі
  let mascotEmotion = 'happy';
  let mascotQuote = 'Кітап — адам баласының ақыл-ой қазынасы! Бүгін 15 минут оқып, «Кітап ағашыңды» бірге өсірейік!';
  if (streak.count >= 3) {
    mascotEmotion = 'excited';
    mascotQuote = `Керемет! Сен ${streak.count} күн қатарынан кітап оқып келесің! Өрт сериясы жанып тұр! 🔥`;
  } else if (!streak.active_today) {
    mascotEmotion = 'thinking';
    mascotQuote = 'Бүгін әлі кітап оқымаған сияқтысың. Небәрі 10-15 минут оқып, күнделікке белгілеуге қалай қарайсың?';
  }

  // Ұсынылатын кітаптар
  const topRecommended = recommendedBooks.slice(0, 3);

  container.innerHTML = `
    <!-- Мектеп төлқұжаты мен Ғылыми жетекшілер деректері -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px; font-size:12px; color:var(--text-muted);">
      <span style="background:var(--bg-card); border:1.5px solid var(--border-color); padding:5px 14px; border-radius:16px; font-weight:800; color:#176B4D; box-shadow:0 2px 5px rgba(0,0,0,0.03);">
        🏫 <strong>№290 орта мектеп</strong> · Республикалық ғылыми жоба (2026 ж.)
      </span>
      <span>
        ✍️ Авторы: <strong>Құлахметова Аягөз</strong> (11-сынып) | Жетекшісі: <strong>Аскарова А.К.</strong> | Ғылыми кеңесші: <strong>Құлмырзаев Н.С.</strong>
      </span>
    </div>

    <!-- 1. СӘЛЕМДЕСУ ЖӘНЕ 3D ЖЕКЕ ПРОФИЛЬ КАРТОЧКАСЫ -->
    <div class="student-hero-banner" style="background:linear-gradient(135deg, #176B4D 0%, #238451 55%, #1b382f 100%);">
      <div class="student-hero-content">
        <div>
          <div style="display:flex; align-items:center; gap:14px; margin-bottom:10px;">
            <div style="width:62px; height:62px; border-radius:50%; background:radial-gradient(circle, #FFD36A 0%, #d97706 100%); display:flex; align-items:center; justify-content:center; font-size:36px; border:3px solid #ffffff; box-shadow:0 6px 16px rgba(0,0,0,0.25);">
              ${generateMascotSvg(avatarKey, 'happy', 52)}
            </div>
            <div>
              <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#FFD36A;">
                My Reading World · Менің кітап әлемім
              </div>
              <h1 style="font-size:24px; font-weight:900; margin:2px 0 0 0; color:#ffffff;">
                Қош келдің, ${studentName}! 🌟
              </h1>
            </div>
          </div>
          <p style="margin:0; font-size:13.5px; color:#DDF1E5; line-height:1.45; max-width:620px;">
            Кітап әлеміне интерактивті саяхатың сәтті жалғасуда! Әрбір оқылған парақ Бәйтерек ағашына қуат беріп, жаңа 3D марапаттар мен қазыналарды ашады.
          </p>
          <div class="student-badges-row">
            <span class="student-pill">🏫 ${className}</span>
            <span class="student-pill gold">✨ ${xp} XP</span>
            <span class="student-pill gold">💎 ${crystals} Кристалл</span>
            <span class="student-pill streak">🔥 ${streak.count} күн қатарынан</span>
            <span class="student-pill">🌳 ${tree.level}-саты: ${tree.name}</span>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; align-items:flex-end;">
          <a href="#/shelf" class="btn-3d btn-3d-yellow" style="font-size:13px; font-weight:900;">
            📚 Кітап сөресін ашу
          </a>
          <a href="#/ai-assistant" class="btn-3d btn-3d-blue" style="font-size:12px; font-weight:800;">
            🤖 AI Көмекші (Gemini)
          </a>
        </div>
      </div>
    </div>

    <!-- 2. READING BUDDY (ОҚЫРМАН ДОСЫ 3D МАСКОТ ВИТРИНАСЫ) -->
    <div style="margin-bottom:24px;">
      ${renderMascotWidget({
        character: avatarKey,
        emotion: mascotEmotion,
        quote: mascotQuote,
        ctaText: 'Бүгінгі оқуды белгілеу ✍️',
        ctaLink: '#/diary'
      })}
    </div>

    <!-- 3. НЕГІЗГІ ВИЗУАЛДЫ ОРТАЛЫҚ: MAGIC BOOK WORLD ЖӘНЕ ҮЛКЕН КІТАП АҒАШЫ -->
    <div class="virtual-tree-hero-card" id="main-magic-tree-card" style="margin-bottom:24px; border:2px solid #a8dec0; background:linear-gradient(135deg, #ffffff 0%, #FFF8E9 60%, #e8f7ee 100%);">
      <div class="virtual-tree-layout">
        <!-- Үлкен 3D ағаш векторлық витринасы -->
        <div class="tree-visual-box" style="width:210px; height:210px; box-shadow:0 10px 28px rgba(35, 132, 81, 0.25);">
          ${generateBaiterekSvg(tree.stage || tree.level, treeProgress, 180)}
        </div>

        <!-- Ағаштың нақты деректермен байланысқан прогресі -->
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span class="badge" style="background:#238451; color:#ffffff; font-weight:900; font-size:11px; padding:4px 12px; border-radius:14px; box-shadow:0 2px 6px rgba(35, 132, 81, 0.3);">
              ★ 7 САТЫНЫҢ ${tree.level}-САТЫСЫ ★
            </span>
            <span style="font-size:12px; font-weight:800; color:#d97706;">
              «${tree.title}» дәрежесі
            </span>
          </div>

          <h2 style="font-size:24px; font-weight:900; color:#176B4D; margin:0 0 6px 0;">
            «${tree.name}» (Magic Book Tree)
          </h2>

          <p style="font-size:13px; color:#176B4D; margin:0 0 14px 0; line-height:1.45;">
            ${tree.desc}
          </p>

          <div style="max-width:460px;">
            <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:800; color:#176B4D; margin-bottom:5px;">
              <span>Бәйтерек қуаты: <strong>${xp} XP</strong></span>
              <span>${treeProgress}%</span>
            </div>
            <div class="progress-bar-wrap" style="height:14px; background:#cde4d6; border-radius:12px; box-shadow:inset 0 1px 3px rgba(0,0,0,0.1);">
              <div class="progress-bar-fill" style="width:${treeProgress}%; background:linear-gradient(90deg, #FFD36A 0%, #238451 100%);"></div>
            </div>
            <div style="font-size:11.5px; color:#176B4D; margin-top:6px; font-weight:700;">
              ${tree.level < 7 ? `Келесі деңгейге жету үшін: <strong>${nextXpNeeded} XP</strong> қажет` : '🌟 Сіз Бәйтеректің ең биік шыңына жеттіңіз!'}
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <a href="#/tree" class="btn-3d btn-3d-green" style="font-size:13px;">
            🌳 Ағаш залына өту
          </a>
          <a href="#/analytics" class="btn-3d btn-3d-blue" style="font-size:12px;">
            📊 Оқырман аналитикасы
          </a>
        </div>
      </div>
    </div>

    <!-- 4. READING ADVENTURE MAP (3D ҚИЯЛ-ҒАЖАЙЫП САЯХАТ КАРТАСЫ) -->
    <div class="adventure-map-card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <div>
          <h3 style="font-size:18px; font-weight:900; color:#034b6b; margin:0; display:flex; align-items:center; gap:8px;">
            <span>🗺️</span> 3D Reading Adventure Map · Саяхат картасы
          </h3>
          <p style="font-size:12px; color:#0369a1; margin:2px 0 0 0;">
            Әрбір оқылған кітап бойынша 5 сиқырлы арал мен бекеттерден өту саяхаты
          </p>
        </div>
        <span class="badge" style="background:#ffffff; color:#0284c7; font-weight:800; font-size:11px; padding:4px 10px;">
          Қазіргі кезең: ${curStageIdx + 1}/5
        </span>
      </div>

      <div class="map-island-grid">
        ${stageNames.map((st, i) => {
          const isDone = i < curStageIdx;
          const isCurrent = i === curStageIdx;
          const statusClass = isDone ? 'done' : isCurrent ? 'current' : 'locked';
          return `
            <div class="map-island-node">
              <div class="island-disc-3d ${statusClass}">
                ${st.icon}
              </div>
              <div style="font-size:11px; font-weight:800; color:#0f172a; white-space:nowrap;">
                ${i + 1}. ${st.name}
              </div>
              <div style="font-size:10px; font-weight:700; color:${isDone ? '#166534' : isCurrent ? '#b45309' : '#64748b'}; margin-top:2px;">
                ${isDone ? '✓ Өтілді' : isCurrent ? '▶ Қазір осында' : '🔒 Құлыптаулы'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 5. ОҚЫЛЫМ СТАТИСТИКАСЫ КАРТОЧКАЛАРЫ -->
    <div style="margin-bottom:24px;">
      <div class="world-block-header">
        <div class="world-block-title">
          <span class="block-num">📊</span>
          <span>Оқылым көрсеткіштері мен мақсаттары</span>
        </div>
        <a href="#/analytics" class="btn-3d btn-3d-blue" style="font-size:12px; padding:6px 14px;">
          Барлық графиктер →
        </a>
      </div>

      <div class="stats-cards-grid">
        <div class="stat-metric-card" style="border-top:4px solid #238451;">
          <div class="stat-metric-header">
            <span class="stat-metric-label">Оқылған кітап</span>
            <span class="stat-metric-icon">📚</span>
          </div>
          <div class="stat-metric-val" style="color:#238451;">${totals.books} <span style="font-size:14px; font-weight:700;">кітап</span></div>
          <div class="stat-metric-hint">Аяқталған туындылар</div>
        </div>

        <div class="stat-metric-card" style="border-top:4px solid #0284c7;">
          <div class="stat-metric-header">
            <span class="stat-metric-label">Оқылған беттер</span>
            <span class="stat-metric-icon">📄</span>
          </div>
          <div class="stat-metric-val" style="color:#0284c7;">${totals.pages} <span style="font-size:14px; font-weight:700;">бет</span></div>
          <div class="stat-metric-hint">Жалпы көлемі</div>
        </div>

        <div class="stat-metric-card" style="border-top:4px solid #7c3aed;">
          <div class="stat-metric-header">
            <span class="stat-metric-label">Бүгінгі уақыт</span>
            <span class="stat-metric-icon">⏱️</span>
          </div>
          <div class="stat-metric-val" style="color:#7c3aed;">${today.minutes || 15} <span style="font-size:14px; font-weight:700;">мин</span></div>
          <div class="stat-metric-hint">Күнделікті мақсат</div>
        </div>

        <div class="stat-metric-card" style="border-top:4px solid #ea580c;">
          <div class="stat-metric-header">
            <span class="stat-metric-label">Күн сериясы</span>
            <span class="stat-metric-icon">🔥</span>
          </div>
          <div class="stat-metric-val" style="color:#c2410c;">${streak.count} <span style="font-size:14px; font-weight:700;">күн</span></div>
          <div class="stat-metric-hint">${streak.active_today ? '✓ Бүгін оқыдың' : '⏳ Әлі белгіленбеді'}</div>
        </div>

        <div class="stat-metric-card" style="border-top:4px solid #FFD36A;">
          <div class="stat-metric-header">
            <span class="stat-metric-label">Мақсат орындалуы</span>
            <span class="stat-metric-icon">🎯</span>
          </div>
          <div class="stat-metric-val" style="color:#b45309;">${totals.goal_percent}%</div>
          <div class="stat-metric-hint">Апталық жоспар</div>
        </div>
      </div>
    </div>

    <!-- 6. ЖАЛҒАСТЫРЫП ОҚУ (CONTINUE READING) -->
    <div style="margin-bottom:24px;">
      <div class="world-block-header">
        <div class="world-block-title">
          <span class="block-num">📖</span>
          <span>Жалғастырып оқу</span>
        </div>
        <a href="#/shelf" class="btn-3d btn-3d-green" style="font-size:12px; padding:6px 14px;">
          Кітап сөресіне өту →
        </a>
      </div>

      ${currentBook ? `
        <div class="currently-reading-card" style="border:2px solid #a8dec0; background:#ffffff; box-shadow:0 8px 24px rgba(35, 132, 81, 0.1);">
          <div class="reading-flex-wrap">
            <div class="reading-book-cover-3d" style="background:${currentBook.cover_color || '#238451'};">
              ${currentBook.cover_emoji || '📖'}
            </div>

            <div style="flex:1; min-width:260px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                <div>
                  <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; font-size:11px; margin-bottom:6px; display:inline-block;">
                    Саяхат кезеңі: ${stageNames[curStageIdx].name}
                  </span>
                  <h3 style="font-size:20px; font-weight:900; margin:0 0 4px 0; color:var(--text-main);">
                    ${currentBook.title}
                  </h3>
                  <div style="font-size:13px; color:var(--text-muted); font-weight:600;">
                    ${currentBook.author || 'Белгісіз автор'}
                  </div>
                </div>

                <div style="text-align:right;">
                  <div style="font-size:22px; font-weight:900; color:#238451;">
                    ${shelf?.percent || 0}%
                  </div>
                  <div style="font-size:11px; color:var(--text-muted); font-weight:700;">
                    ${shelf?.current_page || 0} / ${shelf?.total_pages || 100} бет
                  </div>
                </div>
              </div>

              <!-- Прогресс -->
              <div class="progress-bar-wrap" style="height:10px; margin:10px 0;">
                <div class="progress-bar-fill" style="width:${shelf?.percent || 0}%; background:linear-gradient(90deg, #238451, #FFD36A);"></div>
              </div>

              <!-- Батырмалар -->
              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
                <a href="#/read/${currentBook.id}/1" class="btn-3d btn-3d-green" style="font-size:13px;">
                  📖 Оқуды жалғастыру
                </a>
                <button class="btn-3d btn-3d-yellow" id="btn-open-log-modal" style="font-size:13px;">
                  ✍️ Бүгінгі оқуды белгілеу (+10 XP)
                </button>
                ${has_quiz ? `
                  <button class="btn-3d btn-3d-coral" id="btn-character-quiz-trigger" style="font-size:12px;">
                    🎯 Кейіпкер квизі (+15 XP)
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      ` : `
        <div class="card" style="text-align:center; padding:36px; border:2px dashed #bbf7d0;">
          <div style="font-size:40px; margin-bottom:8px;">📚</div>
          <h3 style="font-size:18px; font-weight:800; color:var(--text-main); margin-bottom:6px;">
            Қазір оқылып жатқан кітап таңдалмаған
          </h3>
          <p style="font-size:13px; color:var(--text-muted); max-width:440px; margin:0 auto 16px auto;">
            Кітап сөресінен ұнаған туындыны таңдап, сиқырлы саяхатыңызды бастаңыз!
          </p>
          <a href="#/shelf" class="btn-3d btn-3d-green">
            📚 Кітап таңдау
          </a>
        </div>
      `}
    </div>

    <!-- 7. АЛТЫН ҚОРДАН ҰСЫНЫЛАТЫН КІТАПТАР (RECOMMENDED BOOKS) -->
    <div style="margin-bottom:24px;">
      <div class="world-block-header">
        <div class="world-block-title">
          <span class="block-num">⭐</span>
          <span>Мектеп бағдарламасынан ұсынылатын кітаптар</span>
        </div>
        <a href="#/shelf" class="btn-3d btn-3d-yellow" style="font-size:12px; padding:6px 14px;">
          Барлық сөрені көру →
        </a>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
        ${topRecommended.map(b => `
          <div class="card edtech-shelf-card" style="padding:16px; margin:0; border:1px solid #cde4d6; background:#ffffff;">
            <div style="display:flex; gap:12px; margin-bottom:12px;">
              <div class="edtech-cover-wrap" style="background:${b.cover_color || '#238451'}; width:60px; height:84px; font-size:32px;">
                ${b.cover_emoji || '📖'}
              </div>
              <div style="flex:1;">
                <h4 style="font-size:15px; font-weight:800; color:var(--text-main); margin:0 0 2px 0;">${b.title}</h4>
                <div style="font-size:12px; color:var(--text-muted); font-weight:600;">${b.author}</div>
                <span class="badge" style="background:#e4f5ec; color:#238451; font-weight:800; font-size:10px; margin-top:4px;">
                  ${b.genre || 'Әдебиет'} · ${b.grade_min || 5}-${b.grade_max || 9} сынып
                </span>
              </div>
            </div>
            <div style="display:flex; gap:8px; margin-top:auto;">
              <a href="#/book/${b.id}" class="btn-3d btn-3d-blue" style="flex:1; font-size:11px; padding:8px;">Толығырақ</a>
              <button class="btn-3d btn-3d-green btn-start-journey" data-book-id="${b.id}" style="flex:1.2; font-size:11px; padding:8px;">Оқуды бастау</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 8. ОҚЫРМАН МАРАФОНДАРЫ (UPCOMING CHALLENGES) -->
    ${challenges.length ? `
      <div style="margin-bottom:24px;">
        <div class="world-block-header">
          <div class="world-block-title">
            <span class="block-num">🏆</span>
            <span>Оқырман марафондары мен челлендждер</span>
          </div>
          <a href="#/challenges" class="btn-3d btn-3d-coral" style="font-size:12px; padding:6px 14px;">
            Барлық марафондар →
          </a>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          ${challenges.slice(0, 2).map(c => `
            <div class="card" style="padding:18px; margin:0; border:1.5px solid #FF9D8A; background:linear-gradient(135deg, #ffffff 0%, #fff5f5 100%);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="badge" style="background:#fee2e2; color:#991b1b; font-weight:800; font-size:11px;">
                  Челлендж · ${c.target_books || 3} кітап
                </span>
                <span style="font-size:12px; font-weight:800; color:#d97706;">
                  +${c.reward_xp || 50} XP
                </span>
              </div>
              <h4 style="font-size:16px; font-weight:900; color:var(--text-main); margin:0 0 4px 0;">${c.title}</h4>
              <p style="font-size:12px; color:var(--text-muted); margin:0 0 12px 0;">${c.description || 'Оқу марафонына қатысып, сыныптастарыңмен жарыс!'}</p>
              <a href="#/challenges" class="btn-3d btn-3d-coral" style="font-size:12px; padding:8px 14px;">
                🏆 Марафонға қатысу
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- 9. АБАЙ ҚҰНАНБАЙҰЛЫНЫҢ 3D ПОРТРЕТІ ЖӘНЕ ҰЛАҒАТТЫ НАҚЫЛДАРЫ -->
    <div class="abai-hero-card" id="abai-3d-card" style="margin-bottom:24px;">
      <div class="abai-portrait-container">
        <div class="abai-portrait-frame" id="abai-frame">
          <img src="images/abai_3d.jpg" alt="Абай Құнанбайұлының 3D портреті" class="abai-portrait-img">
        </div>
      </div>
      <div style="flex:1; z-index:2;">
        <div class="abai-badge-pill">
          ✨ Ұлы ойшыл өсиеті · Абай даналығы
        </div>
        <div class="abai-aphorism-quote" id="abai-quote-text">
          «Артық ғылым кітапта, ерінбей оқып көруге!»
        </div>
        <div class="abai-author-title">
          <span>📜</span> <strong>Абай Құнанбайұлы</strong> (1845–1904) — қазақтың бас ақыны, кемеңгер ойшылы
        </div>
        <div class="abai-reflection-tagline" id="abai-quote-desc">
          💡 Кітап — адам баласының ақыл-ойы мен парасатын өсіретін ең ұлы рухани қазына.
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:10px;">
          <button type="button" class="btn-abai-quote-switch" id="btn-next-abai-quote">
            🔄 Басқа нақыл сөзін оқу
          </button>
          <a href="#/read/${abaiBookId}/1" class="btn btn-sm btn-secondary" style="border-radius:20px; font-size:12px; border:1px solid rgba(255,255,255,0.3); color:#fff; background:rgba(255,255,255,0.12);">
            📖 «Қара сөздерін» оқу →
          </a>
        </div>
      </div>
    </div>
  `;

  bindEvents(container, currentBook, tree, xp);
}

function bindEvents(container, currentBook, tree, xp) {
  // Ағаш залына өту
  const treeCard = container.querySelector('#main-magic-tree-card');
  if (treeCard) {
    treeCard.onclick = (e) => {
      if (e.target.closest('a') || e.target.closest('button')) return;
      window.location.hash = '#/tree';
    };
  }

  // Оқуды бастау батырмалары
  container.querySelectorAll('.btn-start-journey').forEach(btn => {
    btn.onclick = async () => {
      const bookId = Number(btn.getAttribute('data-book-id'));
      try {
        await api.updateShelfBook(bookId, { status: 'reading', goalText: 'Күніне 10-15 минут оқу' });
        showToast('Кітап оқу сөреңізге сәтті қосылды! Жол болсын! 🚀', 'success');
        renderWorldView(container);
      } catch (err) {
        showToast(`Қате: ${err.message}`, 'error');
      }
    };
  });

  // Оқуды белгілеу модалі
  const logBtn = container.querySelector('#btn-open-log-modal');
  if (logBtn && currentBook) {
    logBtn.onclick = () => {
      openModal({
        title: '✍️ Бүгінгі оқуды белгілеу',
        bodyHtml: `
          <div style="background:#e4f5ec; border:1.5px solid #238451; padding:12px; border-radius:var(--radius-sm); margin-bottom:14px; font-size:13px; color:#176B4D; font-weight:700;">
            ℹ️ Кітаптан оқыған бетіңіз бен уақытыңызды енгізіңіз. Сізге +10 XP беріліп, күн сериясы (streak) жаңарады!
          </div>
          <div class="form-group">
            <label class="form-label">Оқылған соңғы бет саны:</label>
            <input type="number" class="form-input" id="inp-log-page" min="1" max="${currentBook.total_pages || 5000}" required placeholder="Мысалы: 15" value="${(currentBook.current_page || 0) + 5}">
            <div class="form-help">Кітаптың жалпы көлемі: ${currentBook.total_pages || 'енгізілмеген'} бет.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Оқуға кеткен уақыт (минут):</label>
            <input type="number" class="form-input" id="inp-log-minutes" value="15" min="1" max="300" placeholder="15">
          </div>
          <div class="form-group">
            <label class="form-label">Бүгінгі қысқаша түйін (рефлексия):</label>
            <textarea class="form-textarea" id="inp-log-note" rows="3" placeholder="Бүгінгі оқыған үзіндіде қандай ой түйдіңіз?"></textarea>
          </div>
        `,
        saveText: 'Сақтау және +10 XP алу 🚀',
        onSave: async (modalEl) => {
          const page = Number(modalEl.querySelector('#inp-log-page').value);
          const minutes = Number(modalEl.querySelector('#inp-log-minutes').value) || null;
          const note = modalEl.querySelector('#inp-log-note').value;
          if (!page) {
            showToast('Оқылған бет санын енгізіңіз', 'error');
            return false;
          }
          try {
            const res = await api.addLog(currentBook.id, { page, minutes, note });
            if (res.xp_awarded > 0) {
              launchConfetti();
            }
            showToast(`Керемет! +${res.xp_awarded} XP берілді! 🔥 Серия жаңарды!`, 'success');
            renderWorldView(container);
            return true;
          } catch (err) {
            showToast(`Қате: ${err.message}`, 'error');
            return false;
          }
        }
      });
    };
  }

  // Кейіпкер квизі
  const quizBtn = container.querySelector('#btn-character-quiz-trigger');
  if (quizBtn && currentBook) {
    quizBtn.onclick = () => {
      openCharacterQuizModal(currentBook.id, () => renderWorldView(container));
    };
  }

  // 3D Абай портретінің интерактивті қозғалысы
  const abaiCard = container.querySelector('#abai-3d-card');
  const abaiFrame = container.querySelector('#abai-frame');
  if (abaiCard && abaiFrame) {
    abaiCard.addEventListener('mousemove', (e) => {
      const rect = abaiCard.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = -(y / rect.height) * 16;
      const rotateY = (x / rect.width) * 16;
      abaiFrame.style.animation = 'none';
      abaiFrame.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    });
    abaiCard.addEventListener('mouseleave', () => {
      abaiFrame.style.transform = '';
      abaiFrame.style.animation = 'abai3dFloat 5s ease-in-out infinite';
    });
  }

  // Абай нақылдарын ауыстыру
  const abaiQuotes = [
    { quote: '«Артық ғылым кітапта, ерінбей оқып көруге!»', desc: '💡 Кітап — адам баласының ақыл-ойы мен парасатын өсіретін ең ұлы рухани қазына.' },
    { quote: '«Ғылым таппай мақтанба, орын таппай баптанба. Құмарланып жиған қазынаң — кітап болсын!»', desc: '💡 Білім мен парасаттылыққа ұмтылған оқушы ғана өмірден өз биік орнын таба алады.' },
    { quote: '«Пайда ойлама, ар ойла, талап қыл артық білуге. Артық білім — кітапта, ерінбей оқып үйренуде!»', desc: '💡 Жас ұрпаққа ең қажетті қасиет — таза ар, биік мақсат және кітап оқуға деген құштарлық.' },
    { quote: '«Жүректің көзі ашылса, хақтықтың түсер сәулесі. Ақыл, қайрат, жүректі бірдей ұста!»', desc: '💡 Нағыз кемел тұлға — ақылы терең, қайраты мол, жүрегі мейірім мен ізгілікке толы оқырман.' }
  ];
  let quoteIdx = 0;
  const quoteBtn = container.querySelector('#btn-next-abai-quote');
  const quoteText = container.querySelector('#abai-quote-text');
  const quoteDesc = container.querySelector('#abai-quote-desc');
  if (quoteBtn && quoteText && quoteDesc) {
    quoteBtn.onclick = () => {
      quoteIdx = (quoteIdx + 1) % abaiQuotes.length;
      quoteText.textContent = abaiQuotes[quoteIdx].quote;
      quoteDesc.textContent = abaiQuotes[quoteIdx].desc;
      showToast('Абайдың жаңа нақылы ашылды! ✨', 'info');
    };
  }
}

export function getBaiterekLevel(xp) {
  if (xp >= 700) return { stage: 7, level: 7, name: 'Жемісті Бәйтерек', title: 'Кітап шыңының шебері', icon: '👑🍎🌳', min: 700, max: 1000, desc: 'Ең жоғары мәртебе! Нағыз кемел оқырман — Кітап шыңының шебері!' };
  if (xp >= 451) return { stage: 6, level: 6, name: 'Гүлдеген ағаш', title: 'Парасат биігі', icon: '🌸🌳', min: 451, max: 699, desc: 'Ағашың әдемі гүл ашты. Терең ойлы рефлексиялар мен талдаулар кезеңі.' };
  if (xp >= 281) return { stage: 5, level: 5, name: 'Жапырақты ағаш', title: 'Зерделі білімпаз', icon: '🌲', min: 281, max: 450, desc: 'Ағашыңның жасыл жапырақтары жайқалып, әдеби талғамың биік деңгейге жетті.' };
  if (xp >= 151) return { stage: 4, level: 4, name: 'Жас ағаш', title: 'Талғампаз оқырман', icon: '🌳', min: 151, max: 280, desc: 'Жас ағаш мығым діңге ие болды, ойын тапсырмалары мен квиздер сәтті орындалуда.' };
  if (xp >= 61) return { stage: 3, level: 3, name: 'Жас өркен', title: 'Ізденімпаз оқырман', icon: '🪴', min: 61, max: 150, desc: 'Өркен күш алып, тұрақты оқу әдеті нығая түсті.' };
  if (xp >= 21) return { stage: 2, level: 2, name: 'Өскін', title: 'Жас талпыныс', icon: '🌿', min: 21, max: 60, desc: 'Алғашқы оқу мақсатың орындалып, жасыл өскін пайда болды!' };
  return { stage: 1, level: 1, name: 'Тұқым', title: 'Алғашқы қадам', icon: '🌱', min: 0, max: 20, desc: 'Кітап әлеміне саяхатың алғашқы дәннен басталды. Дәннен ұлы Бәйтерек өседі!' };
}
