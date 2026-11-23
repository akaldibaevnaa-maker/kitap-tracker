// ==============================================================================
// «КІТАП АҒАШЫ» (BOOK TREE) — ИНТЕРАКТИВТІ 3D ВИРТУАЛДЫ АҒАШ МОДУЛІ
// 7 даму сатысы, нақты оқу деректері, даму тарихы мен келесі саты прогресі
// ==============================================================================
import { api } from '../api.js';
import { t } from '../i18n.js';
import { generateBaiterekSvg, openBaiterekModal, launchConfetti, showToast } from '../ui.js';
import { generateMascotSvg } from '../mascot.js';

export async function renderTreeView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 50px 20px;">
      <div style="font-size:42px; animation:treeSway 1.5s infinite alternate;">🌳</div>
      <p style="color:var(--text-muted); font-weight:700; font-size:15px; margin-top:12px;">«Кітап ағашы» 3D әлемі жүктелуде...</p>
    </div>
  `;

  try {
    const data = await api.getTree();
    renderTreeContent(container, data);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color); padding:20px; font-weight:700;">Қате: ${err.message}</div>`;
  }
}

function renderTreeContent(container, data) {
  const { stats = { xp: 0, finished_books: 0, total_pages: 0, reading_days: 0, logs_count: 0 }, stages = [], current_stage, next_stage, progress_percent = 100, remaining = {}, history = [] } = data;
  const curSt = current_stage || (stages[0] || { stage: 1, name: 'Тұқым', title: 'Алғашқы қадам', min_xp: 0, description: 'Кітап әлеміне алғашқы қадам.' });

  // Таңдалған сатыны алдын ала қарау (әдепкі бойынша оқушының нақты ағымдағы сатысы)
  let previewStage = curSt.stage;

  // Маскот кеңестері 7 сатыға арналған
  const stageMascotAdvice = {
    1: { emotion: 'happy', quote: '🌱 Кішкентай дән топыраққа түсті! Алғашқы оқу жазбасын тіркеп, өскін шығар!' },
    2: { emotion: 'excited', quote: '🌿 Қос жапырақты өскін бой көтерді! Оқу күнделігіне күнде жазба қалдырсаң, діңгегі беки түседі!' },
    3: { emotion: 'reading', quote: '🪴 Жас өркен тамыр жайып келеді! Тұрақты оқу әдеті ағашыңды күннен-күнге мықты етеді!' },
    4: { emotion: 'thinking', quote: '🌳 Мықты жас ағаш пайда болды! Ойын тапсырмалары мен викториналарды шешіп, бұтақтарын көбейт!' },
    5: { emotion: 'happy', quote: '🌲 Жапырақтары жайқалған саялы ағаш! Әдеби талғамың қалыптасып, білім қорың молайып келеді!' },
    6: { emotion: 'excited', quote: '🌸 Бәйтерегің әсем гүл ашты! Терең ойлы рефлексиялар жазып, мұғалім пікірін ал!' },
    7: { emotion: 'celebrating', quote: '👑 Алтын жемісті Бәйтерек! Сен нағыз кемел оқырмансың! Оқу шыңының асқары бағынды!' }
  };

  function renderView() {
    const activeStageInfo = stages.find(s => s.stage === previewStage) || curSt;
    const isCurrentActive = previewStage === curSt.stage;
    const mascotInfo = stageMascotAdvice[activeStageInfo.stage] || stageMascotAdvice[1];

    container.innerHTML = `
      <!-- ЖОҒАРҒЫ АЙДАР МЕН НАВИГАЦИЯ -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:20px;">
        <div>
          <h2 style="font-size:26px; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:10px; margin:0;">
            <span style="font-size:30px;">🌳</span> «Кітап ағашы» 3D виртуалды әлемі
          </h2>
          <p style="font-size:13.5px; color:var(--text-muted); margin:4px 0 0 0; font-weight:600;">
            Оқушының нақты кітап оқу белсенділігіне байланысты өсіп, гүлдеп, жеміс беретін сиқырлы ағаш
          </p>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <a href="#/world" class="btn-3d btn-3d-yellow" style="padding:8px 16px; font-size:12.5px; text-decoration:none;">
            ← Әлеміме қайту
          </a>
          <a href="#/shelf" class="btn-3d btn-3d-green" style="padding:8px 18px; font-size:12.5px; text-decoration:none;">
            📖 Кітап сөресі
          </a>
        </div>
      </div>

      <!-- БАСТЫ ВИТРИНА: ИНТЕРАКТИВТІ 3D АҒАШ КӨРІНІСІ ЖӘНЕ СИҚЫРЛЫ ОРМАН АТМОСФЕРАСЫ -->
      <div class="tree-hero-container" id="tree-hero-box">
        <!-- Қалықтаған жапырақтар мен ұшқындар (3D Particles) -->
        <div class="floating-leaf leaf-1">🍃</div>
        <div class="floating-leaf leaf-2">🌱</div>
        <div class="floating-leaf leaf-3">🍃</div>
        <div class="floating-leaf leaf-4">🍂</div>
        <div class="floating-sparkle sparkle-1">✨</div>
        <div class="floating-sparkle sparkle-2">⭐</div>
        <div class="floating-sparkle sparkle-3">🌟</div>

        <!-- Саты көрсеткіш белгісі -->
        <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:800; text-transform:uppercase; background:linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color:#14532d; padding:6px 16px; border-radius:30px; border:1.5px solid #86efac; box-shadow:0 3px 8px rgba(34, 197, 94, 0.2); margin-bottom:12px;">
          <span>★</span> <span>${activeStageInfo.stage}-САТЫ: «${activeStageInfo.name}»</span> <span>★</span>
        </div>

        <h2 style="font-size:28px; font-weight:900; color:#14532d; margin:0 0 6px 0; letter-spacing:-0.3px;">
          ${activeStageInfo.title}
        </h2>
        <p style="font-size:14px; color:#166534; max-width:540px; margin:0 auto 16px auto; line-height:1.55; font-weight:600;">
          ${activeStageInfo.description}
        </p>

        <!-- Ағаштың интерактивті 3D параллакс SVG бейнесі -->
        <div class="tree-canvas-wrapper" id="main-tree-canvas" title="Тышқанды қозғап көріңіз — 3D бұрышы өзгереді!">
          ${generateBaiterekSvg(activeStageInfo.stage, progress_percent, 230)}
        </div>

        <!-- Ағымдағы саты мен келесі саты прогресс сызығы -->
        <div style="max-width:500px; margin:0 auto 12px auto; background:rgba(255,255,255,0.7); backdrop-filter:blur(4px); padding:14px 18px; border-radius:18px; border:1.5px solid #86efac;">
          <div style="display:flex; justify-content:space-between; font-size:13.5px; font-weight:800; color:#166534; margin-bottom:8px;">
            <span>${isCurrentActive ? `Нақты оқу қуаты: <strong>${stats.xp} XP</strong>` : `Қарап отырған саты: <strong>${activeStageInfo.name}</strong>`}</span>
            <span style="background:#22c55e; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px;">${progress_percent}%</span>
          </div>
          <div class="progress-bar-wrap" style="height:16px; background:#e2f7ea; border-radius:10px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.08); overflow:hidden; border:1px solid #86efac;">
            <div class="progress-bar-fill" style="width:${progress_percent}%; background:linear-gradient(90deg, #4ade80, #16a34a, #15803d); height:100%; border-radius:10px; transition:width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
          </div>

          <div style="font-size:12.5px; color:#15803d; margin-top:10px; font-weight:700;">
            ${next_stage ? `
              🎯 Келесі <strong>«${next_stage.name}»</strong> сатысына жету үшін: 
              ${remaining.books > 0 ? `<strong>${remaining.books} кітап</strong>, ` : ''}
              ${remaining.pages > 0 ? `<strong>${remaining.pages} бет</strong> немесе ` : ''}
              <strong>${remaining.xp} XP</strong> жинау қажет!
            ` : '🌟 Құттықтаймыз! Сіз ең жоғарғы «Алтын жемісті Бәйтерек» шыңына жеттіңіз!'}
          </div>
        </div>

        ${!isCurrentActive ? `
          <div style="margin-top:14px;">
            <button type="button" class="btn-3d btn-3d-yellow" id="btn-reset-preview" style="padding:8px 18px; font-size:12.5px;">
              🔄 Өз нақты деңгейіме қайту (${curSt.name})
            </button>
          </div>
        ` : ''}

        <!-- РЕДИНГ БАДДИ (MASCOT) КЕҢЕСІ -->
        <div style="max-width:560px; margin:20px auto 0 auto; display:flex; align-items:center; gap:14px; background:#ffffff; border:2px solid #FFD36A; border-radius:18px; padding:12px 18px; box-shadow:0 6px 18px rgba(255, 211, 106, 0.25); text-align:left;">
          <div style="flex-shrink:0;">
            ${generateMascotSvg('fox', mascotInfo.emotion, 64)}
          </div>
          <div style="flex:1;">
            <div style="font-size:11px; font-weight:800; color:#d97706; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">
              🦊 Kitap Dos кеңесі
            </div>
            <div style="font-size:13px; font-weight:700; color:var(--text-main); line-height:1.4;">
              ${mascotInfo.quote}
            </div>
          </div>
        </div>
      </div>

      <!-- 7 ДАМУ САТЫСЫНЫҢ 3D ТАКТИЛЬДІ БАҒДАР СЫЗЫҒЫ (STEPPER) -->
      <div class="card" style="padding:22px; margin-bottom:24px; border:2px solid var(--border-color); border-radius:var(--radius-lg); box-shadow:0 8px 24px rgba(38,55,70,0.06);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:18px; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:10px; margin:0;">
              <span>🌱➡️🌳</span> «Кітап ағашының» 7 даму сатысы
            </h3>
            <p style="font-size:12.5px; color:var(--text-muted); margin:4px 0 0 0; font-weight:600;">
              Кез келген сатыны таңдап, оның 3D үлгісін, сыртқы кейпі мен ашылу шарттарын көріңіз:
            </p>
          </div>
          <span style="font-size:11.5px; background:var(--sky-blue); color:#0369a1; font-weight:800; padding:4px 12px; border-radius:20px;">
            Интерактивті 3D үлгі
          </span>
        </div>

        <div class="tree-stages-stepper">
          ${stages.map(s => {
            const isCur = s.stage === curSt.stage;
            const isAct = s.stage === previewStage;
            const isUnlocked = s.stage <= curSt.stage;
            return `
              <div class="stage-step-card ${isAct ? 'active' : ''} ${isCur ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}" data-step-no="${s.stage}">
                <div style="font-size:24px; margin-bottom:4px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));">${s.icon || '🌱'}</div>
                <div style="font-size:12.5px; font-weight:900; color:${isCur ? '#b45309' : isAct ? '#166534' : 'var(--text-main)'};">
                  ${s.stage}. ${s.name}
                </div>
                <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-top:3px;">
                  ${s.min_xp} XP
                </div>
                <div style="font-size:10.5px; margin-top:6px; font-weight:800;">
                  ${isCur ? '⭐ Қазіргі' : isUnlocked ? '✓ Ашық' : '🔒 Құлып'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ОҚУШЫНЫҢ НАҚТЫ ОҚУ КӨРСЕТКІШТЕРІНІҢ 3D КАРТОЧКАЛАРЫ -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:14px; margin-bottom:24px;">
        <div class="card" style="padding:16px 14px; margin-bottom:0; border-top:4px solid var(--primary-green); text-align:center; border-radius:var(--radius-md); box-shadow:0 6px 16px rgba(35,132,81,0.08);">
          <div style="font-size:28px;">🌟</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Жинаған қуат</div>
          <div style="font-size:22px; font-weight:900; color:var(--primary-green);">+${stats.xp} XP</div>
        </div>

        <div class="card" style="padding:16px 14px; margin-bottom:0; border-top:4px solid #3b82f6; text-align:center; border-radius:var(--radius-md); box-shadow:0 6px 16px rgba(59,130,246,0.08);">
          <div style="font-size:28px;">📖</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Оқылған кітап</div>
          <div style="font-size:22px; font-weight:900; color:#2563eb;">${stats.finished_books} кітап</div>
        </div>

        <div class="card" style="padding:16px 14px; margin-bottom:0; border-top:4px solid var(--warm-yellow); text-align:center; border-radius:var(--radius-md); box-shadow:0 6px 16px rgba(255,211,106,0.15);">
          <div style="font-size:28px;">📄</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Оқылған беттер</div>
          <div style="font-size:22px; font-weight:900; color:#d97706;">${stats.total_pages} бет</div>
        </div>

        <div class="card" style="padding:16px 14px; margin-bottom:0; border-top:4px solid var(--coral); text-align:center; border-radius:var(--radius-md); box-shadow:0 6px 16px rgba(255,157,138,0.12);">
          <div style="font-size:28px;">📅</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Оқу күндері</div>
          <div style="font-size:22px; font-weight:900; color:#e11d48;">${stats.reading_days} күн</div>
        </div>

        <div class="card" style="padding:16px 14px; margin-bottom:0; border-top:4px solid #10b981; text-align:center; border-radius:var(--radius-md); box-shadow:0 6px 16px rgba(16,185,129,0.08);">
          <div style="font-size:28px;">📝</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Оқу жазбалары</div>
          <div style="font-size:22px; font-weight:900; color:#059669;">${stats.logs_count} жазба</div>
        </div>
      </div>

      <!-- ТӨМЕНГІ БӨЛІМ: ДАМУ ТАРИХЫ ЖӘНЕ ПЕДАГОГИКАЛЫҚ АЛГОРИТМ ЕРЕЖЕЛЕРІ -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
        <!-- 1. Ағаштың даму тарихы (Growth History Timeline) -->
        <div class="card" style="margin-bottom:0; border:1.5px solid var(--border-color); border-radius:var(--radius-lg); padding:20px;">
          <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:20px;">📜</span> <strong style="font-size:16px; color:var(--text-main);">Ағаштың даму тарихы</strong>
            </div>
            <span style="font-size:11.5px; color:var(--text-muted); font-weight:700; background:#f1f5f9; padding:3px 10px; border-radius:12px;">Нақты хронология</span>
          </div>

          ${history.length === 0 ? `
            <div style="text-align:center; padding:30px 10px; color:var(--text-muted); font-size:13.5px; font-weight:600;">
              <div style="font-size:32px; margin-bottom:8px;">🌱</div>
              Әзірге оқу жазбалары тіркелмеген. Алғашқы кітапты оқып, тарихыңды баста!
            </div>
          ` : `
            <div class="tree-timeline">
              ${history.map(item => `
                <div class="tree-timeline-item">
                  <div class="tree-timeline-dot">${item.icon || '✓'}</div>
                  <div style="font-size:11px; color:var(--text-muted); font-weight:700;">${item.date}</div>
                  <div style="font-size:14px; font-weight:800; color:var(--text-main); margin:2px 0;">${item.title}</div>
                  <div style="font-size:12.5px; color:#475569; line-height:1.4;">${item.desc}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- 2. Педагогикалық алгоритм ережелері -->
        <div class="card" style="margin-bottom:0; background:linear-gradient(135deg, #f8fafc 0%, #FFF8E9 100%); border:1.5px solid #FFD36A; border-radius:var(--radius-lg); padding:20px;">
          <div class="card-title" style="margin-bottom:14px; display:flex; align-items:center; gap:8px;">
            <span style="font-size:20px;">⚙️</span> <strong style="font-size:16px; color:var(--text-main);">Ағашты өсіру алгоритмі</strong>
          </div>
          <div style="font-size:13px; line-height:1.6; color:#334155;">
            <p style="margin-bottom:12px; font-weight:700;">
              «Кітап ағашының» әрбір жапырағы мен бұтағы оқушының нақты білім еңбегімен өседі:
            </p>
            <ul style="padding-left:18px; margin-bottom:14px; display:flex; flex-direction:column; gap:8px;">
              <li><strong>Оқу күнделігін толтыру:</strong> әр оқу күні ағаштың тамырын бекітеді (<span style="color:#16a34a; font-weight:800;">+10 XP</span>).</li>
              <li><strong>Ойын тапсырмаларын орындау:</strong> жаңа жасыл жапырақтар шығарады (<span style="color:#16a34a; font-weight:800;">+10 XP</span>).</li>
              <li><strong>Мұғалім қабылдаған рефлексия:</strong> ағашқа әсем гүл аштырады (<span style="color:#16a34a; font-weight:800;">+20 XP</span>).</li>
              <li><strong>Кітапты толық аяқтау:</strong> ағашқа алтын жеміс сыйлайды (<span style="color:#d97706; font-weight:800;">+50 XP</span>).</li>
            </ul>
            <div style="background:#ffffff; border:1.5px solid #FFD36A; padding:12px 14px; border-radius:12px; font-size:12.5px; color:#475569; box-shadow:0 2px 8px rgba(255,211,106,0.15);">
              💡 <strong>Адалдық қағидаты:</strong> Жалған оқу жазбалары ағашты өсірмейді. Тек шынайы кітап оқу ғана ағашты жемісті Бәйтерекке айналдырады.
            </div>
          </div>
        </div>
      </div>
    `;

    bindTreeEvents();
  }

  function bindTreeEvents() {
    // 7 саты бағдаршасын басу арқылы сатыларды көру
    container.querySelectorAll('[data-step-no]').forEach(card => {
      card.onclick = () => {
        const targetStep = Number(card.getAttribute('data-step-no'));
        previewStage = targetStep;
        if (targetStep === 7) {
          launchConfetti();
        }
        renderView();
      };
    });

    // Қайтару батырмасы
    const resetBtn = container.querySelector('#btn-reset-preview');
    if (resetBtn) {
      resetBtn.onclick = () => {
        previewStage = curSt.stage;
        renderView();
      };
    }

    // 3D параллакс тышқан қозғалысы (Tilt effect)
    const heroBox = container.querySelector('#tree-hero-box');
    const canvasWrap = container.querySelector('#main-tree-canvas');
    if (heroBox && canvasWrap) {
      heroBox.addEventListener('mousemove', (e) => {
        const rect = heroBox.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        canvasWrap.style.transform = `rotateY(${x * 20}deg) rotateX(${-y * 15}deg) scale(1.03)`;
      });
      heroBox.addEventListener('mouseleave', () => {
        canvasWrap.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1)';
      });
    }
  }

  renderView();
}
