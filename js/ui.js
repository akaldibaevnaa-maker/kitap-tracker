// UI көмекшілері: toast, модальдар, аватарлар кестесі
import { t } from './i18n.js';

export const AVATAR_MAP = {
  fox: '🦊 Түлкі',
  owl: '🦉 Үкі',
  bear: '🐻 Аю',
  wolf: '🐺 Қасқыр',
  horse: '🐎 Тұлпар',
  eagle: '🦅 Бүркіт',
  camel: '🐫 Түйе',
  turtle: '🐢 Тасбақа',
  cat: '🐱 Мысық',
  panda: '🐼 Панда'
};

export function showToast(message, type = 'info') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️'}</span> <span>${message}</span>`;
  root.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function openModal(arg1, arg2) {
  let title = '';
  let bodyHtml = '';
  let onSave = null;
  let saveText = 'Сақтау';

  if (typeof arg1 === 'string') {
    title = arg1;
    bodyHtml = arg2 || '';
  } else if (arg1 && typeof arg1 === 'object') {
    title = arg1.title || '';
    bodyHtml = arg1.bodyHtml || '';
    onSave = arg1.onSave || null;
    saveText = arg1.saveText || 'Сақтау';
  }
  const root = document.getElementById('modal-root');
  if (!root) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" aria-label="Жабу">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
        <button class="btn btn-secondary modal-cancel">Болдырмау</button>
        ${onSave ? `<button class="btn btn-primary modal-save">${saveText}</button>` : ''}
      </div>
    </div>
  `;

  root.innerHTML = '';
  root.appendChild(overlay);

  const close = () => {
    root.innerHTML = '';
  };

  overlay.querySelector('.modal-close').onclick = close;
  overlay.querySelector('.modal-cancel').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  if (onSave) {
    overlay.querySelector('.modal-save').onclick = async () => {
      const ok = await onSave(overlay);
      if (ok !== false) close();
    };
  }
}

/** 
 * Конфетти (отшашу) эффектісі — таза HTML5 Canvas (Zero-dependency).
 * Ұпай берілгенде, квиз тапсырғанда немесе кітап аяқталғанда шақырылады.
 */
export function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#22c55e', '#eab308', '#3b82f6', '#ec4899', '#f97316', '#a855f7', '#14b8a6'];
  const particleCount = 75;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height * 0.4 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      gravity: 0.35,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let startTime = performance.now();
  const duration = 2200;

  function frame(now) {
    const elapsed = now - startTime;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRotation;
      p.opacity = Math.max(0, 1 - elapsed / duration);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

/**
 * Кітап кейіпкерінің атынан интерактивті квиз модалі
 */
export async function openCharacterQuizModal(bookId, onComplete = null) {
  const { api } = await import('./api.js');
  try {
    const res = await api.getQuiz(bookId);
    if (!res || !res.quiz) {
      showToast('Бұл кітапқа әзірге кейіпкер квизі дайындалуда!', 'info');
      return;
    }
    const q = res.quiz;
    const questions = q.questions;
    let currentIdx = 0;
    const answers = new Array(questions.length).fill(null);

    function buildQuizHtml() {
      const item = questions[currentIdx];
      const selected = answers[currentIdx];
      const isLast = currentIdx === questions.length - 1;
      const allAnswered = answers.every((a) => a !== null);

      return `
        <div style="font-family:inherit;">
          <!-- Кейіпкердің диалог блогы -->
          <div style="display:flex; align-items:flex-start; gap:14px; background:linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border:1px solid #86efac; border-radius:var(--radius-sm); padding:14px; margin-bottom:18px;">
            <div style="width:52px; height:52px; border-radius:50%; background:#fff; border:2px solid #22c55e; display:flex; align-items:center; justify-content:center; font-size:28px; flex-shrink:0; box-shadow:0 4px 10px rgba(34,197,94,0.15);">
              ${q.character_avatar}
            </div>
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <span style="font-weight:800; font-size:15px; color:#14532d;">${q.character_name}:</span>
                <span style="background:#fef08a; color:#854d0e; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">
                  ⭐ +${q.xp_reward} XP · 💎 +${q.crystals_reward} Кристалл
                </span>
              </div>
              <p style="font-size:13px; color:#166534; margin:4px 0 0 0; line-height:1.4;">
                ${q.character_intro}
              </p>
            </div>
          </div>

          <!-- Сұрақ барысы -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:12px; font-weight:700; color:var(--text-muted);">
            <span>Сұрақ ${currentIdx + 1} / ${questions.length}</span>
            <span>Жауап берілген: ${answers.filter((a) => a !== null).length}/${questions.length}</span>
          </div>

          <!-- Сұрақтың мәтіні -->
          <div style="background:#fff; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:16px; margin-bottom:14px;">
            <h4 style="font-size:15px; font-weight:800; color:var(--text-main); margin:0 0 14px 0; line-height:1.4;">
              ${item.question}
            </h4>

            <div style="display:flex; flex-direction:column; gap:8px;">
              ${item.options.map((opt, oIdx) => {
                const isChosen = selected === oIdx;
                let optStyle = 'background:var(--bg-soft); border:1px solid var(--border-color); color:var(--text-main);';
                if (isChosen) {
                  optStyle = 'background:#dbeafe; border:2px solid #3b82f6; font-weight:700; color:#1e40af;';
                }
                return `
                  <button type="button" class="btn btn-block quiz-opt-btn" data-opt="${oIdx}" style="${optStyle} text-align:left; padding:10px 14px; font-size:13px; border-radius:var(--radius-sm); cursor:pointer; justify-content:flex-start;">
                    <span style="display:inline-block; width:22px; height:22px; border-radius:50%; background:#fff; border:1px solid var(--border-color); text-align:center; line-height:20px; font-size:11px; margin-right:10px; font-weight:700;">
                      ${['А', 'Б', 'В', 'Г'][oIdx]}
                    </span>
                    <span>${opt}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Навигация батырмалары -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-quiz-prev" ${currentIdx === 0 ? 'disabled style="opacity:0.5;"' : ''}>
              ← Алдыңғы
            </button>
            <div style="display:flex; gap:10px;">
              ${!isLast ? `
                <button type="button" class="btn btn-secondary btn-sm" id="btn-quiz-next">
                  Келесі →
                </button>
              ` : `
                <button type="button" class="btn btn-primary btn-sm" id="btn-quiz-finish" ${!allAnswered ? 'disabled style="opacity:0.5;"' : ''}>
                  🎯 Аяқтау және тексеру
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }

    openModal({
      title: `🎯 «${q.character_name}» кейіпкерінің сұрақ-жауабы`,
      bodyHtml: `<div id="quiz-modal-container">${buildQuizHtml()}</div>`,
      saveText: null,
    });

    const root = document.getElementById('quiz-modal-container');

    function attachEvents() {
      if (!root) return;
      root.querySelectorAll('.quiz-opt-btn').forEach((btn) => {
        btn.onclick = () => {
          const optIdx = Number(btn.getAttribute('data-opt'));
          answers[currentIdx] = optIdx;
          root.innerHTML = buildQuizHtml();
          attachEvents();
        };
      });

      const prevBtn = root.querySelector('#btn-quiz-prev');
      if (prevBtn) {
        prevBtn.onclick = () => {
          if (currentIdx > 0) {
            currentIdx--;
            root.innerHTML = buildQuizHtml();
            attachEvents();
          }
        };
      }

      const nextBtn = root.querySelector('#btn-quiz-next');
      if (nextBtn) {
        nextBtn.onclick = () => {
          if (currentIdx < questions.length - 1) {
            currentIdx++;
            root.innerHTML = buildQuizHtml();
            attachEvents();
          }
        };
      }

      const finishBtn = root.querySelector('#btn-quiz-finish');
      if (finishBtn) {
        finishBtn.onclick = async () => {
          finishBtn.disabled = true;
          finishBtn.innerText = 'Тексерілуде...';
          try {
            const submitRes = await api.submitQuiz(bookId, answers);
            if (submitRes.ok) {
              if (submitRes.passed) {
                launchConfetti();
              }
              root.innerHTML = `
                <div style="text-align:center; padding:20px;">
                  <div style="font-size:48px; margin-bottom:10px;">${submitRes.passed ? '🎉' : '📚'}</div>
                  <h3 style="font-size:20px; font-weight:800; color:${submitRes.passed ? 'var(--primary-green)' : 'var(--text-main)'}; margin-bottom:6px;">
                    ${submitRes.message}
                  </h3>
                  <div style="font-size:16px; font-weight:700; margin-bottom:16px;">
                    Нәтиже: ${submitRes.score} / ${submitRes.total} дұрыс
                  </div>
                  ${submitRes.xp_awarded > 0 ? `
                    <div style="background:#ecfdf5; border:1px solid #86efac; border-radius:var(--radius-sm); padding:12px; margin-bottom:16px; font-weight:700; color:#166534;">
                      ⭐ +${submitRes.xp_awarded} XP және 💎 +${submitRes.crystals_awarded} Кристалл берілді!
                    </div>
                  ` : ''}
                  <button type="button" class="btn btn-primary" id="btn-quiz-close">
                    Жарайсың! Жабу
                  </button>
                </div>
              `;
              const closeBtn = root.querySelector('#btn-quiz-close');
              if (closeBtn) {
                closeBtn.onclick = () => {
                  document.getElementById('modal-root').innerHTML = '';
                  if (onComplete) onComplete();
                };
              }
            }
          } catch (err) {
            showToast('Қате: ' + err.message, 'error');
            finishBtn.disabled = false;
            finishBtn.innerText = '🎯 Аяқтау және тексеру';
          }
        };
      }
    }

    attachEvents();
  } catch (e) {
    showToast('Квизді жүктеу қатесі: ' + e.message, 'error');
  }
}

/**
 * -------------------------------------------------------------
 * ИНТЕРАКТИВТІ «БӘЙТЕРЕК — КІТАП АҒАШЫ» SVG ГЕНЕРАТОРЫ
 * 7 ғылыми саты бойынша динамикалық векторлық ағаш салу
 * -------------------------------------------------------------
 */
export function generateBaiterekSvg(stage = 1, percent = 50, size = 120) {
  const st = Math.min(7, Math.max(1, Number(stage) || 1));
  const p = Math.min(100, Math.max(0, Number(percent) || 0));

  // Түстер палитрасы сатыға байланысты
  const colors = {
    1: { ground: '#a16207', plant: '#84cc16', glow: '#fef08a' },
    2: { ground: '#65a30d', plant: '#22c55e', glow: '#bbf7d0' },
    3: { ground: '#4d7c0f', plant: '#10b981', glow: '#a7f3d0' },
    4: { ground: '#15803d', trunk: '#78350f', foliage: '#059669', glow: '#6ee7b7' },
    5: { ground: '#166534', trunk: '#713f12', foliage: '#047857', glow: '#34d399' },
    6: { ground: '#14532d', trunk: '#581c87', foliage: '#0d9488', flower: '#ec4899', glow: '#fbcfe8' },
    7: { ground: '#854d0e', trunk: '#b45309', foliage: '#16a34a', gold: '#eab308', crown: '#f59e0b', glow: '#fef08a' }
  }[st];

  let innerSvg = '';

  if (st === 1) {
    // 1-саты: Тұқым / Дән
    innerSvg = `
      <ellipse cx="60" cy="98" rx="42" ry="14" fill="${colors.ground}" opacity="0.3"/>
      <path d="M40 98 Q60 88 80 98 Q60 106 40 98 Z" fill="#92400e"/>
      <!-- Дән -->
      <ellipse cx="60" cy="85" rx="10" ry="14" fill="#d97706" transform="rotate(-15 60 85)"/>
      <ellipse cx="60" cy="85" rx="7" ry="11" fill="#f59e0b" transform="rotate(-15 60 85)"/>
      <!-- Кішкентай өскін бүршігі -->
      <path d="M57 74 Q60 62 68 64 Q66 74 57 74 Z" fill="${colors.plant}"/>
      <circle cx="68" cy="63" r="3" fill="#bef264"/>
      <!-- Нұр сәулелері -->
      <circle cx="60" cy="85" r="28" fill="${colors.glow}" opacity="0.25"/>
    `;
  } else if (st === 2) {
    // 2-саты: Өскін (Қос жапырақ)
    innerSvg = `
      <ellipse cx="60" cy="100" rx="44" ry="13" fill="${colors.ground}" opacity="0.4"/>
      <!-- Сабақ -->
      <path d="M60 100 Q58 76 60 58" stroke="#15803d" stroke-width="5" stroke-linecap="round" fill="none"/>
      <!-- Сол жапырақ -->
      <path d="M60 74 C45 68 40 50 60 52 C56 62 58 68 60 74 Z" fill="${colors.plant}"/>
      <!-- Оң жапырақ -->
      <path d="M60 66 C75 58 82 42 60 44 C64 54 62 60 60 66 Z" fill="#4ade80"/>
      <!-- Кітапқа ұқсас өскін сызығы -->
      <path d="M50 56 Q60 60 70 54" stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.6"/>
      <circle cx="60" cy="42" r="3.5" fill="#facc15"/>
    `;
  } else if (st === 3) {
    // 3-саты: Жас өркен (4-5 жапырақ, беки түскен сабақ)
    innerSvg = `
      <ellipse cx="60" cy="102" rx="46" ry="12" fill="${colors.ground}" opacity="0.45"/>
      <path d="M60 102 Q57 70 60 44" stroke="#166534" stroke-width="7" stroke-linecap="round" fill="none"/>
      <!-- Төменгі жапырақтар -->
      <path d="M58 80 C36 76 34 58 58 64" fill="${colors.plant}"/>
      <path d="M62 72 C84 66 86 48 62 56" fill="${colors.plant}"/>
      <!-- Жоғарғы жапырақтар -->
      <path d="M59 58 C42 46 44 32 59 40" fill="#34d399"/>
      <path d="M61 52 C78 40 76 26 61 34" fill="#34d399"/>
      <!-- Ұшар басындағы бүршік -->
      <ellipse cx="60" cy="30" rx="7" ry="10" fill="#a7f3d0"/>
      <circle cx="60" cy="25" r="4" fill="#fde047"/>
    `;
  } else if (st === 4) {
    // 4-саты: Жас ағаш (Діңгек, бұтақтар, тығыз тәж)
    innerSvg = `
      <ellipse cx="60" cy="105" rx="48" ry="11" fill="#14532d" opacity="0.35"/>
      <!-- Діңгек -->
      <path d="M55 105 L57 66 L63 66 L65 105 Z" fill="${colors.trunk}"/>
      <path d="M58 72 L44 56 L47 54 L59 66 Z" fill="${colors.trunk}"/>
      <path d="M62 68 L76 52 L79 55 L63 70 Z" fill="${colors.trunk}"/>
      <!-- Жапырақтар шоғыры (3 шар тәж) -->
      <circle cx="42" cy="50" r="16" fill="${colors.foliage}"/>
      <circle cx="78" cy="48" r="16" fill="${colors.foliage}"/>
      <circle cx="60" cy="38" r="22" fill="#10b981"/>
      <circle cx="60" cy="32" r="14" fill="#34d399"/>
      <!-- Кітап бейнелі символ діңгегінде -->
      <rect x="56" y="80" width="8" height="10" rx="2" fill="#fef08a"/>
    `;
  } else if (st === 5) {
    // 5-саты: Жапырақты ағаш (Көп қабатты көлеңкелі жасыл ағаш)
    innerSvg = `
      <ellipse cx="60" cy="106" rx="52" ry="12" fill="#064e3b" opacity="0.4"/>
      <!-- Діңгек -->
      <path d="M53 106 Q58 70 56 50 L64 50 Q62 70 67 106 Z" fill="${colors.trunk}"/>
      <!-- Төменгі тәж қабаты -->
      <ellipse cx="60" cy="62" rx="38" ry="18" fill="${colors.foliage}"/>
      <!-- Ортаңғы тәж қабаты -->
      <ellipse cx="60" cy="46" rx="32" ry="16" fill="#059669"/>
      <!-- Жоғарғы тәж қабаты -->
      <ellipse cx="60" cy="30" rx="24" ry="14" fill="#10b981"/>
      <!-- Сәулелер мен жарық нүктелері -->
      <circle cx="48" cy="42" r="3" fill="#a7f3d0"/>
      <circle cx="72" cy="46" r="3" fill="#a7f3d0"/>
      <circle cx="60" cy="24" r="4" fill="#fef08a"/>
    `;
  } else if (st === 6) {
    // 6-саты: Гүлдеген ағаш (Жапырақтар + Қызғалдақ/Гүлдер + Ақыл нұры)
    innerSvg = `
      <ellipse cx="60" cy="106" rx="54" ry="12" fill="#022c22" opacity="0.4"/>
      <path d="M52 106 Q58 68 56 46 L64 46 Q62 68 68 106 Z" fill="${colors.trunk}"/>
      <!-- Тәждер -->
      <circle cx="36" cy="54" r="20" fill="${colors.foliage}"/>
      <circle cx="84" cy="54" r="20" fill="${colors.foliage}"/>
      <circle cx="60" cy="42" r="28" fill="#0f766e"/>
      <circle cx="60" cy="30" r="20" fill="#14b8a6"/>
      <!-- Қызғалдақ гүлдері -->
      <circle cx="34" cy="48" r="5" fill="${colors.flower}"/>
      <circle cx="86" cy="48" r="5" fill="${colors.flower}"/>
      <circle cx="60" cy="22" r="6" fill="#f43f5e"/>
      <circle cx="48" cy="36" r="5" fill="#fb7185"/>
      <circle cx="72" cy="36" r="5" fill="#fb7185"/>
      <!-- Жарқыраған ұшқындар -->
      <circle cx="60" cy="12" r="3.5" fill="#fde047"/>
    `;
  } else {
    // 7-саты: Жемісті Алтын Бәйтерек (Алтын күмбез, қызыл алмалар, алтын тәж/жұлдыз)
    innerSvg = `
      <ellipse cx="60" cy="108" rx="56" ry="12" fill="#713f12" opacity="0.4"/>
      <!-- Мықты діңгек Бәйтерек мотивімен -->
      <path d="M51 108 L56 46 L64 46 L69 108 Z" fill="#b45309"/>
      <path d="M55 75 L36 55 L40 52 L57 68 Z" fill="#b45309"/>
      <path d="M65 72 L84 52 L87 55 L63 75 Z" fill="#b45309"/>
      <!-- Тәж шарлары -->
      <circle cx="38" cy="50" r="22" fill="#15803d"/>
      <circle cx="82" cy="50" r="22" fill="#15803d"/>
      <circle cx="60" cy="42" r="32" fill="#16a34a"/>
      <circle cx="60" cy="28" r="22" fill="#22c55e"/>
      <!-- Қызыл піскен білім жемістері (алмалар) -->
      <circle cx="38" cy="46" r="6" fill="#ef4444"/>
      <circle cx="82" cy="46" r="6" fill="#ef4444"/>
      <circle cx="50" cy="34" r="6" fill="#ef4444"/>
      <circle cx="70" cy="34" r="6" fill="#ef4444"/>
      <circle cx="60" cy="48" r="6.5" fill="#dc2626"/>
      <!-- БӘЙТЕРЕКТІҢ ҰШАР БАСЫНДАҒЫ АЛТЫН ЖҰМЫРТҚА МЕН КҮМБЕЗ -->
      <circle cx="60" cy="12" r="11" fill="url(#goldGlow)"/>
      <path d="M60 2 L63 9 L70 10 L65 15 L66 22 L60 18 L54 22 L55 15 L50 10 L57 9 Z" fill="#fbbf24"/>
    `;
  }

  return `
    <svg viewBox="0 0 120 120" width="${size}" height="${size}" class="baiterek-tree-svg" style="filter: drop-shadow(0 6px 12px rgba(22, 101, 52, 0.15)); transition: transform 0.3s ease;">
      <defs>
        <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="60%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#b45309"/>
        </radialGradient>
      </defs>
      ${innerSvg}
    </svg>
  `;
}

/**
 * Бәйтерек ағашының толық 7 сатысын түсіндіретін көркем интерактивті модаль
 */
export function openBaiterekModal(treeInfo, xp = 0) {
  const st = treeInfo?.stage || 1;
  const stages = [
    { st: 1, name: 'Тұқым', icon: '🌱', xp: '0–20 XP', desc: 'Кітап әлеміне алғашқы қадам. Оқу сөресінен кітап таңдап оқуды баста.' },
    { st: 2, name: 'Өскін', icon: '🌿', xp: '21–60 XP', desc: 'Алғашқы оқу мақсаты орындалды, дән жерден бас көтерді.' },
    { st: 3, name: 'Жас өркен', icon: '🪴', xp: '61–150 XP', desc: 'Тұрақты оқу әдеті қалыптасып, тамыры беки түсті.' },
    { st: 4, name: 'Жас ағаш', icon: '🌳', xp: '151–280 XP', desc: 'Мықты діңге ие болып, ойын тапсырмалары сәтті орындалуда.' },
    { st: 5, name: 'Жапырақты ағаш', icon: '🌲', xp: '281–450 XP', desc: 'Жапырақтары жайқалып, әдеби талғамың биік деңгейге жетті.' },
    { st: 6, name: 'Гүлдеген ағаш', icon: '🌸🌳', xp: '451–699 XP', desc: 'Ағашың әдемі гүл ашты. Терең ойлы рефлексиялар мен талдаулар кезеңі.' },
    { st: 7, name: 'Жемісті Бәйтерек', icon: '👑🍎🌳', xp: '700+ XP', desc: 'Ең жоғарғы мәртебе! Нағыз кемел оқырман — Кітап шыңының шебері!' }
  ];

  const html = `
    <div style="text-align:center; margin-bottom:16px;">
      <div style="display:inline-block; padding:10px; background:#f0fdf4; border-radius:50%; border:3px solid #22c55e; margin-bottom:10px;">
        ${generateBaiterekSvg(st, 100, 100)}
      </div>
      <h3 style="font-size:20px; font-weight:800; color:#14532d; margin-bottom:4px;">
        «${treeInfo?.name || 'Бәйтерек — Білім ағашы'}»
      </h3>
      <p style="font-size:13px; color:#15803d; max-width:400px; margin:0 auto;">
        ${treeInfo?.desc || 'Оқушының кітап оқуына байланысты өсетін 7 сатылы ұлттық геймификация жүйесі.'}
      </p>
      <div style="margin-top:10px; font-size:14px; font-weight:700; color:#166534;">
        Қазіргі қуаты: <strong>${xp} XP</strong> · ${st}-саты
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:8px; max-height:280px; overflow-y:auto; padding-right:6px;">
      ${stages.map(s => {
        const isCurrent = s.st === st;
        const isPassed = s.st < st;
        return `
          <div style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:8px; border:1px solid ${isCurrent ? '#22c55e' : isPassed ? '#bbf7d0' : '#e2dcd2'}; background:${isCurrent ? '#f0fdf4' : isPassed ? '#fafaf9' : '#fff'};">
            <div style="font-size:24px; width:36px; text-align:center;">${s.icon}</div>
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:14px; color:${isCurrent ? '#166534' : 'var(--text-main)'};">
                  ${s.st}. ${s.name} ${isCurrent ? '⭐ (Қазіргі деңгейің)' : ''}
                </strong>
                <span class="badge" style="font-size:11px; background:${isCurrent ? '#22c55e' : '#e2dcd2'}; color:${isCurrent ? '#fff' : '#475569'};">
                  ${s.xp}
                </span>
              </div>
              <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">${s.desc}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  openModal({
    title: '🌳 «Бәйтерек — Білім ағашы» даму сатылары',
    bodyHtml: html
  });
}

/**
 * -------------------------------------------------------------
 * РЕСПУБЛИКАЛЫҚ ДЕҢГЕЙДЕГІ РЕСМИ СЕРТИФИКАТ ГЕНЕРАТОРЫ
 * HTML5 Canvas арқылы оқушыға арналған «Үздік оқырман» сертификаты
 * -------------------------------------------------------------
 */
export function openCertificateModal(studentName, bookTitle, finishDate = null) {
  const d = finishDate ? new Date(finishDate) : new Date();
  const dateStr = d.toLocaleDateString('kk-KZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const certId = 'KT-' + Math.floor(100000 + Math.random() * 900000);

  const modalHtml = `
    <div style="text-align:center;">
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
        Құттықтаймыз! Сіз кітапты толық оқып аяқтағаныңыз үшін ресми білім сертификатына ие болдыңыз:
      </p>

      <div style="overflow-x:auto; margin-bottom:16px; border:2px solid #d4a373; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08); background:#fff;">
        <canvas id="cert-canvas" width="800" height="560" style="max-width:100%; height:auto; display:block; margin:0 auto;"></canvas>
      </div>

      <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" id="btn-download-cert">
          📥 Сертификатты жүктеп алу (PNG)
        </button>
        <button type="button" class="btn btn-secondary" id="btn-print-cert">
          🖨️ Басып шығару (Печать)
        </button>
      </div>
    </div>
  `;

  openModal({
    title: '🏆 «Kitap Tracker — Үздік оқырман» ресми сертификаты',
    bodyHtml: modalHtml
  });

  // Canvas-қа сертификат салу
  setTimeout(() => {
    const canvas = document.getElementById('cert-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1. Фон және жиектер
    ctx.fillStyle = '#fdfcf7';
    ctx.fillRect(0, 0, 800, 560);

    // Қос алтын жақтау
    ctx.strokeStyle = '#b07d4b';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 760, 520);

    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, 736, 496);

    // Қазақы ою мотиві бұрыштарда
    ctx.fillStyle = '#2d6a4f';
    ctx.font = '24px sans-serif';
    ctx.fillText('❖', 36, 56);
    ctx.fillText('❖', 742, 56);
    ctx.fillText('❖', 36, 516);
    ctx.fillText('❖', 742, 516);

    // 2. Жоғарғы эмблема және мектеп
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('№290 ОРТА МЕКТЕП · KITAP TRACKER РЕСПУБЛИКАЛЫҚ EDTECH ЖОБАСЫ', 400, 75);

    // 3. Тақырып: СЕРТИФИКАТ
    ctx.fillStyle = '#2d6a4f';
    ctx.font = '900 36px Georgia, serif';
    ctx.fillText('СЕРТИФИКАТ', 400, 125);

    ctx.fillStyle = '#b07d4b';
    ctx.font = 'italic 16px Georgia, serif';
    ctx.fillText('ҮЗДІК ОҚЫРМАН МӘРТЕБЕСІ ТАБЫСТАЛАДЫ:', 400, 155);

    // 4. Оқушының аты-жөні
    ctx.fillStyle = '#14213d';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText(studentName || 'Құлахметова Аягөз', 400, 215);

    // Сәндік сызық
    ctx.strokeStyle = '#d4a373';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(200, 230);
    ctx.lineTo(600, 230);
    ctx.stroke();

    // 5. Не үшін берілді
    ctx.fillStyle = '#374151';
    ctx.font = '16px sans-serif';
    ctx.fillText('Қазақ әдебиетінің асыл қазынасынан келесі шығарманы толық оқып,', 400, 270);
    ctx.fillText('интерактивті оқу тапсырмалары мен рефлексиясын үздік аяқтағаны үшін:', 400, 295);

    // Кітап атауы
    ctx.fillStyle = '#2d6a4f';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(`«${bookTitle || 'Абай жолы'}»`, 400, 340);

    // 6. Төменгі қолтаңбалар мен деректемелер
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4b5563';
    ctx.font = '13px sans-serif';
    ctx.fillText('Бағдарлама авторы: Құлахметова А.', 60, 430);
    ctx.fillText('Ғылыми кеңесші: Құлмырзаев Н.С.', 60, 455);
    ctx.fillText(`Күні: ${dateStr}`, 60, 480);

    // Ресми QR код имитациясы және тіркеу нөмірі
    ctx.textAlign = 'right';
    ctx.fillStyle = '#166534';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`№ ${certId}`, 730, 430);
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText('Тексерілген цифрлық сертификат', 730, 455);
    ctx.fillText('kitaptracker.kz · Түпнұсқа', 730, 480);

    // Ортадағы алтын мөр (Seal)
    ctx.beginPath();
    ctx.arc(400, 450, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#fef3c7';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('РЕСМИ МӨР', 400, 445);
    ctx.fillText('★ 2026 ★', 400, 462);

    // Жүктеп алу оқиғасы
    const dlBtn = document.getElementById('btn-download-cert');
    if (dlBtn) {
      dlBtn.onclick = () => {
        const link = document.createElement('a');
        link.download = `KitapTracker_Сертификат_${studentName || 'оқушы'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Сертификат сәтті жүктелді! 🏆', 'success');
      };
    }

    // Басып шығару оқиғасы
    const prBtn = document.getElementById('btn-print-cert');
    if (prBtn) {
      prBtn.onclick = () => {
        const dataUrl = canvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head><title>Сертификат — KitapTracker</title></head>
              <body style="margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh;">
                <img src="${dataUrl}" style="max-width:100%; height:auto;" onload="window.print();window.close();"/>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      };
    }
  }, 100);
}
