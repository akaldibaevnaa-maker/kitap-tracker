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

export function openModal({ title, bodyHtml, onSave, saveText = 'Сақтау' }) {
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
