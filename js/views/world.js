import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal, launchConfetti, openCharacterQuizModal } from '../ui.js';

export async function renderWorldView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">${t('world_q_reading')}</p>
    </div>
  `;

  try {
    const data = await api.getWorld();
    renderContent(container, data);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
  }
}

function renderContent(container, data) {
  const { current, journey, next, today, week, xp, crystals, streak, has_quiz, last_reward, feedback, motivations } = data;
  const currentBook = current ? current.book : null;
  const shelf = current ? current.shelf : null;

  // Саяхат картасының ағымдағы кезең атауы (Толық қазақша мемлекеттік тілде)
  const stageNames = ['Бастау қақпасы', 'Кейіпкерлер мекені', 'Оқиғалар жолы', 'Ой қазынасы', 'Кітап шыңы'];
  const curStageIdx = journey ? (journey.current <= 5 ? journey.current - 1 : 4) : 0;
  const currentStageName = stageNames[curStageIdx];

  // Бәйтерек — Білім ағашы геймификация деңгейі
  const tree = getBaiterekLevel(xp);
  const nextXpNeeded = tree.level < 5 ? Math.max(0, tree.max + 1 - xp) : 0;
  const treeProgress = tree.level < 5 
    ? Math.min(100, Math.max(0, Math.round(((xp - tree.min) / (tree.max - tree.min + 1)) * 100))) 
    : 100;

  // «Бүгін не істеймін?» — нақты орындалатын миссия
  let nextMissionText = 'Кітабыңнан 10-15 минут оқып, ойыңмен бөліс.';
  if (next) {
    if (next.kind === 'task') {
      nextMissionText = `«${next.title}» ойын тапсырмасын орындап, кейіпкерлерді тереңірек таны!`;
    } else if (next.kind === 'read') {
      nextMissionText = next.page 
        ? `${next.page}-бетке дейін үзінді оқып, оқиға желісін бақыла.`
        : 'Кітабыңнан 10-15 минут оқып, бүгінгі ойыңды белгіле.';
    } else if (next.kind === 'reflection') {
      nextMissionText = 'Кітап бойынша өз қорытынды ойыңды (рефлексия) жазып, мұғалімге жібер.';
    }
  }

  const streakData = streak || { count: 0, active_today: false, next_milestone: 3 };

  container.innerHTML = `
    <!-- Мектеп және Автор белгісі -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; font-size:12px; color:var(--text-muted);">
      <span style="background:var(--bg-card); border:1px solid var(--border-color); padding:4px 10px; border-radius:12px;">
        🏫 <strong>№290 орта мектеп</strong> · 2026 жыл
      </span>
      <span>
        ✍️ Авторы: <strong>Құлахметова Аягөз</strong> (11-сынып) | Жетекшісі: <strong>Аскарова А.К.</strong> | Ғылыми кеңесші: <strong>Құлмырзаев Н.С.</strong>
      </span>
    </div>

    <!-- 3D АНИМАЦИЯЛЫҚ АБАЙ ҚҰНАНБАЙҰЛЫНЫҢ ПОРТРЕТІ ЖӘНЕ ҰЛАҒАТТЫ НАҚЫЛЫ -->
    <div class="abai-hero-card" id="abai-3d-card">
      <div class="abai-portrait-container">
        <div class="abai-portrait-frame" id="abai-frame">
          <img src="images/abai_3d.jpg" alt="Абай Құнанбайұлының 3D анимациялық портреті" class="abai-portrait-img">
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
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <button type="button" class="btn-abai-quote-switch" id="btn-next-abai-quote">
            🔄 Басқа нақыл сөзін оқу
          </button>
          <a href="#/read/8/1" class="btn btn-sm btn-secondary" style="border-radius:20px; font-size:12px; border:1px solid rgba(255,255,255,0.3); color:#fff; background:rgba(255,255,255,0.12);">
            📖 «Қара сөздерін» оқу →
          </a>
        </div>
      </div>
    </div>

    <!-- КҮНДЕЛІКТІ ОҚУ СЕРИЯСЫ (DAILY STREAK 🔥) -->
    <div class="streak-card">
      <div style="display:flex; align-items:center; gap:14px;">
        <span class="streak-flame-icon">🔥</span>
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge-streak">🔥 ${streakData.count} күн қатарынан!</span>
            ${streakData.active_today ? `<span style="font-size:11px; background:#dcfce7; color:#166534; padding:2px 8px; border-radius:12px; font-weight:700;">✓ Бүгін оқу белгіленді</span>` : `<span style="font-size:11px; background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:12px; font-weight:700;">⏳ Бүгін әлі оқылмады</span>`}
          </div>
          <div style="font-size:13px; color:#9a3412; font-weight:600; margin-top:3px;">
            ${streakData.count > 0 
              ? `Күнделікті оқу сериясын сақтап келесің! Келесі мақсат: <strong>${streakData.next_milestone} күн</strong>.` 
              : 'Күніне 10-15 минут оқуды бүгін бастап, өрт сериясын жақ!'}
          </div>
        </div>
      </div>
      <div>
        ${currentBook ? `
          <button class="btn btn-primary btn-sm" id="btn-quick-log-streak">
            ✍️ Бүгінгі оқуды белгілеу (+10 XP)
          </button>
        ` : `
          <a href="#/shelf" class="btn btn-primary btn-sm">📖 Кітап таңдау</a>
        `}
      </div>
    </div>

    <!-- Ынталандыру хабарламасы (өз жетістігімен салыстыру) -->
    ${motivations && motivations.length ? `
      <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:var(--radius-sm); padding:10px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px; font-weight:600; font-size:14px; color:#065f46;">
        <span>🌟</span>
        <span>${getMotivationText(motivations[0])}</span>
      </div>
    ` : ''}

    <!-- 1. ҮШ СҰРАҚҚА ЖАУАП БЛОКТАРЫ (ТАП-ТАЗА, ДУБЛИКАТСЫЗ) -->
    <div class="three-questions-grid">
      <!-- 1-сұрақ: Қазір қай кітапты оқып жүрмін? -->
      <div class="question-box">
        <div class="question-title">1. ${t('world_q_reading')}</div>
        <div class="question-content">
          ${currentBook ? `
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:58px; background:${currentBook.cover_color}; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:24px; color:#fff;">
                ${currentBook.cover_emoji}
              </div>
              <div>
                <div style="font-weight:700; font-size:15px;">${currentBook.title}</div>
                <div style="font-size:12px; color:var(--text-muted);">${currentBook.author}</div>
              </div>
            </div>
            <div style="margin-top:10px;">
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill" style="width: ${shelf?.percent || 0}%;"></div>
              </div>
              <div style="font-size:12px; display:flex; justify-content:space-between; color:var(--text-muted);">
                <span>Прогресс: ${shelf?.percent || 0}%</span>
                <span>${shelf?.current_page || 0} / ${shelf?.total_pages || 0} бет</span>
              </div>
            </div>
          ` : `
            <div style="color:var(--text-muted); font-size:14px;">Әзірге оқылып жатқан кітап жоқ.</div>
            <a href="#/shelf" class="btn btn-secondary btn-sm" style="margin-top:8px;">Сөреден таңдау</a>
          `}
        </div>
      </div>

      <!-- 2-сұрақ: Бүгін не істеймін? -->
      <div class="question-box">
        <div class="question-title">2. ${t('world_q_today')}</div>
        <div class="question-content">
          <div style="font-size:14px; color:var(--text-main); margin-bottom:10px; line-height:1.4;">
            📌 <strong>${nextMissionText}</strong>
          </div>
          <div style="display:inline-block; font-size:12px; background:var(--bg-soft); color:var(--text-muted); padding:4px 8px; border-radius:4px;">
            ⏱️ Күнделікті мақсат: ~${today.minutes} минут оқу
          </div>
        </div>
      </div>

      <!-- 3-сұрақ: Қандай жетістікке жеттім? -->
      <div class="question-box">
        <div class="question-title">3. ${t('world_q_achieve')}</div>
        <div class="question-content">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-size:13px; color:var(--text-muted);">Жалпы жинаған:</span>
            <div style="display:flex; gap:6px; align-items:center;">
              <span style="font-weight:800; font-size:16px; color:var(--primary-green);">+${xp} XP</span>
              <span class="badge-crystal">💎 ${crystals || 0}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:24px;">${last_reward ? last_reward.emoji : '🌱'}</span>
            <span style="font-size:13px; font-weight:600;">
              ${last_reward ? 'Жаңа марапат ашылды!' : 'Алғашқы қадам жасалды!'}
            </span>
          </div>
        </div>
        <a href="#/achievements" class="btn btn-secondary btn-sm btn-block">Барлық марапаттар</a>
      </div>
    </div>

    <!-- ГЕЙМИФИКАЦИЯ: «БӘЙТЕРЕК — БІЛІМ АҒАШЫ» КАРТОЧКАСЫ -->
    <div class="card" style="border:1px solid #86efac; background:linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding:20px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:68px; height:68px; border-radius:50%; background:#dcfce7; border:3px solid #22c55e; display:flex; align-items:center; justify-content:center; font-size:36px; box-shadow:0 4px 12px rgba(34, 197, 94, 0.2);">
            ${tree.icon}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge" style="background:#22c55e; color:#fff; font-weight:800; font-size:11px;">
                ${tree.level}-деңгей
              </span>
              <h3 style="font-size:18px; font-weight:800; color:#14532d; margin:0;">
                «${tree.name}»
              </h3>
            </div>
            <div style="font-size:13px; font-weight:600; color:#166534; margin-top:2px;">
              Дәрежесі: ${tree.title}
            </div>
            <div style="font-size:12px; color:#15803d; margin-top:2px;">
              ${tree.desc}
            </div>
          </div>
        </div>

        <div style="min-width:220px; flex:1; max-width:320px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#166534; margin-bottom:4px;">
            <span>Бәйтерек қуаты: ${xp} XP</span>
            <span>${treeProgress}%</span>
          </div>
          <div class="progress-bar-wrap" style="height:10px; background:#bbf7d0; margin:0;">
            <div class="progress-bar-fill" style="width:${treeProgress}%; background:linear-gradient(90deg, #22c55e, #15803d);"></div>
          </div>
          <div style="font-size:11px; color:#15803d; text-align:right; margin-top:4px;">
            ${tree.level < 5 ? `Келесі деңгейге дейін: <strong>${nextXpNeeded} XP</strong>` : '🌟 Ең жоғарғы деңгейге жеттіңіз!'}
          </div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <a href="#/diary" class="btn btn-primary btn-sm">
            📝 Оқырман күнделігі
          </a>
        </div>
      </div>
    </div>

    <!-- Мұғалімнің жаңа кері байланысы (егер бар болса) -->
    ${feedback ? `
      <div class="card" style="border-left: 4px solid var(--accent-gold); background:#fffdfa;">
        <div class="card-title">
          <span>👩‍🏫</span> ${t('world_teacher_feedback')}
        </div>
        <p style="font-size:14px; margin-bottom:8px;">
          <strong>«${feedback.book_title}»</strong> бойынша жауабыңа мұғалім пікір қалдырды:
        </p>
        <blockquote style="background:var(--bg-soft); padding:10px 14px; border-radius:var(--radius-sm); font-style:italic; font-size:14px; margin-bottom:12px;">
          «${feedback.feedback || 'Жарайсың! Өте жақсы ой айтқансың.'}»
        </blockquote>
        <button class="btn btn-secondary btn-sm" id="btn-seen-feedback">Түсіндім (Оқылды деп белгілеу)</button>
      </div>
    ` : ''}

    <!-- 2. БАСТЫ ӘРЕКЕТ КАРТОЧКАСЫ (ОҚУ, БЕЛГІЛЕУ, КЕЙІПКЕР КВИЗІ) -->
    ${currentBook ? `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
          <div>
            <span class="badge" style="background:#e0f2fe; color:#0369a1; margin-bottom:6px; display:inline-block;">
              Саяхат кезеңі: ${currentStageName}
            </span>
            <h3 style="font-size:20px; font-weight:800; margin-bottom:4px;">${currentBook.title}</h3>
            <p style="color:var(--text-muted); font-size:14px;">${currentBook.author}</p>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            ${currentBook.has_text ? `
              <a href="#/read/${currentBook.id}/1" class="btn btn-primary">
                📖 ${t('world_continue_read')}
              </a>
            ` : ''}
            <button class="btn btn-accent" id="btn-open-log-modal">
              ✍️ ${t('world_log_today')}
            </button>
            ${has_quiz ? `
              <button class="btn btn-secondary" id="btn-character-quiz-trigger" style="background:#fef08a; border-color:#eab308; color:#854d0e; font-weight:700;">
                🎯 Кейіпкер сұрақтары (+15 XP, +2 💎)
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Саяхат картасының 5 кезеңі көрнекі түрде -->
        <div style="margin-top:20px;">
          <div style="font-size:13px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">
            🗺️ САЯХАТ КАРТАСЫНЫҢ 5 КЕЗЕҢІ:
          </div>
          <div class="journey-map">
            ${(journey ? journey.stages : [1, 2, 3, 4, 5].map((i) => ({ no: i, status: i === 1 ? 'current' : 'locked' }))).map((st, i) => `
              <div class="stage-step ${st.status}">
                <div class="stage-num">${i + 1}-кезең</div>
                <div class="stage-name">${stageNames[i]}</div>
                <div class="stage-badge">
                  ${st.status === 'done' ? '✓ Орындалды' : st.status === 'current' ? '▶ Қазіргі' : '🔒 Құлыптаулы'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    ` : ''}

    <!-- 3. АПТАЛЫҚ ЖЕКЕ МАҚСАТ КҮНТІЗБЕСІ -->
    <div class="card">
      <div class="card-title">
        <span>📅</span> ${t('world_weekly_goal')}
      </div>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
        Сенің мақсатың: аптасына кемінде ${week.target} күн кітап оқу. Осы аптада: <strong>${week.done} күн оқыдың</strong>.
      </p>
      <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; text-align:center;">
        ${['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'].map((dayName, idx) => {
          const d = week.days[idx];
          const isDone = d ? d.read : false;
          const isToday = d ? d.today : false;
          return `
            <div style="background:${isDone ? '#dcfce7' : isToday ? '#fff8e7' : 'var(--bg-soft)'}; border:1px solid ${isDone ? '#86efac' : isToday ? '#fde68a' : 'var(--border-color)'}; padding:8px 4px; border-radius:var(--radius-sm);">
              <div style="font-size:11px; font-weight:700; color:var(--text-muted);">${dayName}</div>
              <div style="font-size:18px; margin:4px 0;">${isDone ? '✅' : isToday ? '⏳' : '⚪'}</div>
              <div style="font-size:10px; color:${isDone ? '#166534' : 'var(--text-muted)'};">
                ${isDone ? '+10 XP' : isToday ? 'Бүгін' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  bindEvents(container, currentBook);
}

function getMotivationText(mot) {
  if (mot.key === 'mot_week_days') return `Осы аптада ${mot.params.n} күн кітап оқыдың! Тұрақты оқу әдетің қалыптасып келеді.`;
  if (mot.key === 'mot_sentence') return 'Жаңа сөзді өз сөйлеміңде қолдандың! Сөздік қорың байып келеді.';
  if (mot.key === 'mot_evidence') return 'Пікіріңді мәтінмен дәлелдедің! Оқығаныңды терең түсіне білесің.';
  if (mot.key === 'mot_accepted') return 'Мұғалім сенің ой-пікіріңді қабылдады және жоғары бағалады!';
  return 'Кітап әлеміндегі әрбір қадамың сені жаңа білім шыңына жетелейді!';
}

function bindEvents(container, currentBook) {
  // Оқуды белгілеу батырмасы
  const logBtn = container.querySelector('#btn-open-log-modal');
  const streakLogBtn = container.querySelector('#btn-quick-log-streak');

  const openLog = () => {
    openModal({
      title: t('log_modal_title'),
      bodyHtml: `
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:10px; border-radius:var(--radius-sm); margin-bottom:14px; font-size:12px; color:#166534;">
          ℹ️ ${t('log_notice')}
        </div>
        <div class="form-group">
          <label class="form-label">${t('log_last_page')}</label>
          <input type="number" class="form-input" id="inp-log-page" min="1" max="${currentBook.total_pages || 5000}" required placeholder="Мысалы: 4">
          <div class="form-help">Жалпы бет саны: ${currentBook.total_pages || 'енгізілмеген'} бет. Одан аспауы керек.</div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('log_minutes')}</label>
          <input type="number" class="form-input" id="inp-log-minutes" value="10" min="1" max="300" placeholder="Мысалы: 15">
        </div>
        <div class="form-group">
          <label class="form-label">${t('log_note')}</label>
          <textarea class="form-textarea" id="inp-log-note" rows="3" placeholder="Мысалы: Бүгінгі бөлімде кейіпкердің әрекеті қатты ұнады..."></textarea>
        </div>
      `,
      saveText: t('log_save_btn'),
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
          showToast(`Оқу белгіленді! +${res.xp_awarded} XP 🔥 Күнделікті серия жаңарды!`, 'success');
          renderWorldView(container);
          return true;
        } catch (err) {
          showToast(`Қате: ${err.message}`, 'error');
          return false;
        }
      },
    });
  };

  if (logBtn && currentBook) logBtn.onclick = openLog;
  if (streakLogBtn && currentBook) streakLogBtn.onclick = openLog;

  // Кейіпкер квизін ашу
  const quizBtn = container.querySelector('#btn-character-quiz-trigger');
  if (quizBtn && currentBook) {
    quizBtn.onclick = () => {
      openCharacterQuizModal(currentBook.id, () => renderWorldView(container));
    };
  }

  // Мұғалім пікірін оқылды деп белгілеу
  const seenBtn = container.querySelector('#btn-seen-feedback');
  if (seenBtn) {
    seenBtn.onclick = async () => {
      try {
        await api.markFeedbackSeen();
        showToast('Пікірді қарап шықтыңыз', 'success');
        renderWorldView(container);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // 3D Абай портретінің интерактивті қозғалысы (3D Mouse Parallax Tilt)
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

  // Абайдың ұлағатты нақыл сөздерін ауыстыру (Interactive aphorism cycler)
  const abaiQuotes = [
    {
      quote: '«Артық ғылым кітапта, ерінбей оқып көруге!»',
      desc: '💡 Кітап — адам баласының ақыл-ойы мен парасатын өсіретін ең ұлы рухани қазына.'
    },
    {
      quote: '«Ғылым таппай мақтанба, орын таппай баптанба. Құмарланып жиған қазынаң — кітап болсын!»',
      desc: '💡 Білім мен парасаттылыққа ұмтылған оқушы ғана өмірден өз биік орнын таба алады.'
    },
    {
      quote: '«Пайда ойлама, ар ойла, талап қыл артық білуге. Артық білім — кітапта, ерінбей оқып үйренуде!»',
      desc: '💡 Жас ұрпаққа ең қажетті қасиет — таза ар, биік мақсат және кітап оқуға деген құштарлық.'
    },
    {
      quote: '«Жүректің көзі ашылса, хақтықтың түсер сәулесі. Ақыл, қайрат, жүректі бірдей ұста!»',
      desc: '💡 Нағыз кемел тұлға — ақылы терең, қайраты мол, жүрегі мейірім мен ізгілікке толы оқырман.'
    },
    {
      quote: '«Кітап — адам баласының ақыл-ой қазынасы.»',
      desc: '💡 Абайдың отыз сегізінші қарасөзінде адамның адамшылығы ақыл, ғылым және кітаппен келетіні айтылады.'
    }
  ];

  let currentAbaiQuoteIdx = 0;
  const quoteBtn = container.querySelector('#btn-next-abai-quote');
  const quoteText = container.querySelector('#abai-quote-text');
  const quoteDesc = container.querySelector('#abai-quote-desc');

  if (quoteBtn && quoteText && quoteDesc) {
    quoteBtn.onclick = () => {
      currentAbaiQuoteIdx = (currentAbaiQuoteIdx + 1) % abaiQuotes.length;
      quoteText.style.opacity = '0';
      quoteDesc.style.opacity = '0';
      setTimeout(() => {
        quoteText.textContent = abaiQuotes[currentAbaiQuoteIdx].quote;
        quoteDesc.textContent = abaiQuotes[currentAbaiQuoteIdx].desc;
        quoteText.style.opacity = '1';
        quoteDesc.style.opacity = '1';
        showToast('Абайдың жаңа нақыл сөзі ашылды! ✨', 'info');
      }, 200);
    };
  }
}

export function getBaiterekLevel(xp) {
  if (xp >= 351) return { level: 5, name: 'Алтын Бәйтерек', title: 'Кітап шыңының шебері', icon: '🌟👑🌳', min: 351, max: 500, desc: 'Ең жоғары мәртебе! Оқушы нағыз білім шыңына жетті.' };
  if (xp >= 201) return { level: 4, name: 'Жемісті Бәйтерек', title: 'Зерделі білімпаз', icon: '🍎🌳', min: 201, max: 350, desc: 'Ағашың жеміс берді! Оқыған кітаптарыңнан мол тағылым алдың.' };
  if (xp >= 101) return { level: 3, name: 'Жасыл Бәйтерек', title: 'Талғампаз оқырман', icon: '🌳', min: 101, max: 200, desc: 'Бәйтерегіңнің жапырағы жайқалып, тамыры тереңге жайылды.' };
  if (xp >= 41) return { level: 2, name: 'Жас шыбық', title: 'Ізденімпаз оқырман', icon: '🌿', min: 41, max: 100, desc: 'Алғашқы кітаптар оқылып, тұрақты оқу әдеті қалыптасуда.' };
  return { level: 1, name: 'Жас өскін', title: 'Алғашқы қадам', icon: '🌱', min: 0, max: 40, desc: 'Кітап әлеміне саяхатың енді ғана басталды. Дәннен үлкен Бәйтерек өседі!' };
}

