/**
 * KitapTracker — 3D Gamified Reading Challenge (Оқырман марафоны)
 * 7 күндік, 30 күндік, 1000 бет, 3 кітап және сыныптық жарыстар
 * Тіркелу, 3D прогресс индикаторы, рейтинг, жеңімпаздар мен ресми QR сертификат
 */
import { api } from '../api.js';
import { showToast, openModal } from '../ui.js';
import { generateMascotSvg } from '../mascot.js';

export async function renderChallengesView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 50px 20px;">
      <div style="font-size:36px; animation:treeSway 1s infinite alternate;">🏆</div>
      <p style="color:var(--text-muted); font-weight:700; margin-top:10px;">Оқырман марафондары жүктелуде...</p>
    </div>
  `;

  try {
    const data = await api.getChallenges();
    renderChallengesLayout(container, data.challenges || []);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color); padding:20px; font-weight:700;">Қате: ${err.message}</div>`;
  }
}

function renderChallengesLayout(container, challenges) {
  let activeFilter = 'all'; // 'all' | 'joined' | 'completed' | 'class'

  function renderList() {
    const listEl = container.querySelector('#challenges-list-container');
    if (!listEl) return;

    let filtered = challenges;
    if (activeFilter === 'joined') filtered = challenges.filter(c => c.is_joined && !c.is_completed);
    else if (activeFilter === 'completed') filtered = challenges.filter(c => c.is_completed);
    else if (activeFilter === 'class') filtered = challenges.filter(c => c.scope === 'class' || c.challenge_type === 'class_competition');

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="card" style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1 / -1; border-radius:var(--radius-lg); border:2px dashed #cbd5e1;">
          <div style="font-size:44px; margin-bottom:10px;">🏁</div>
          <h3 style="font-size:18px; font-weight:800; color:var(--text-main); margin-bottom:6px;">
            Таңдалған сүзгі бойынша марафондар табылмады
          </h3>
          <p style="font-size:13.5px; margin:0;">Басқа бөлімді таңдаңыз немесе жаңа марафон құрыңыз!</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(chal => renderChallengeCard(chal)).join('');

    // Тіркелу батырмалары
    listEl.querySelectorAll('.btn-join-challenge').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = 'Тіркелуде...';
        try {
          const res = await api.joinChallenge(id);
          showToast('Оқырман марафонына сәтті тіркелдіңіз! Сәттілік! 🚀', 'success');
          renderChallengesView(container);
        } catch (err) {
          showToast('Қате: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '🚀 Марафонға тіркелу';
        }
      };
    });

    // Сертификатты көру батырмалары
    listEl.querySelectorAll('.btn-view-certificate').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        try {
          const res = await api.getChallengeCertificate(id);
          openCertificateModal(res.certificate);
        } catch (err) {
          showToast('Сертификатты жүктеу қатесі: ' + err.message, 'error');
        }
      };
    });

    // Рейтингті көрсету / жасыру
    listEl.querySelectorAll('.btn-toggle-leaderboard').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const boardEl = listEl.querySelector(`#leaderboard-box-${id}`);
        if (boardEl) {
          const isHidden = boardEl.style.display === 'none';
          boardEl.style.display = isHidden ? 'block' : 'none';
          btn.textContent = isHidden ? '▲ Рейтингті жасыру' : '▼ Қатысушылар рейтингі';
        }
      };
    });
  }

  const totalParticipants = challenges.reduce((sum, c) => sum + (c.participants_count || 0), 0);
  const totalWinners = challenges.reduce((sum, c) => sum + (c.winners_count || 0), 0);

  container.innerHTML = `
    <!-- ЖОҒАРҒЫ 3D БАННЕР -->
    <div class="card" style="background:linear-gradient(135deg, #176B4D 0%, #238451 100%); color:#fff; padding:24px 22px; margin-bottom:20px; border-radius:var(--radius-lg); border-bottom:5px solid #14532d; box-shadow:0 12px 28px rgba(23,107,77,0.22);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="font-size:11.5px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#A9DDF5; margin-bottom:4px;">
            №290 орта мектеп · Оқырмандық жарыстар мен челлендждер
          </div>
          <h1 style="font-size:24px; font-weight:900; margin:0 0 6px 0; color:#fff; display:flex; align-items:center; gap:10px;">
            <span style="font-size:28px;">🏆</span> READING CHALLENGE — ОҚЫРМАН МАРАФОНЫ
          </h1>
          <p style="margin:0; font-size:13.5px; color:#f0fdf4; max-width:640px; line-height:1.5;">
            Мектеп оқушылары мен сыныптар арасындағы қызықты оқырмандық жарыстар. Жеке мақсаттарыңды бағындырып, ұпай жина және ресми жеңімпаз сертификатын ал!
          </p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-3d btn-3d-yellow" id="btn-create-challenge" style="padding:9px 18px; font-size:12.5px;">
            ➕ Жаңа марафон құру
          </button>
        </div>
      </div>

      <!-- Жиынтық көрсеткіштер (3D Counter cards) -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-top:20px; border-top:1px solid rgba(255,255,255,0.2); padding-top:16px;">
        <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(4px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.25);">
          <div style="font-size:11px; text-transform:uppercase; font-weight:800; color:#A9DDF5;">Белсенді марафон</div>
          <div style="font-size:22px; font-weight:900; margin-top:2px;">${challenges.length} дода</div>
        </div>
        <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(4px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.25);">
          <div style="font-size:11px; text-transform:uppercase; font-weight:800; color:#A9DDF5;">Жалпы қатысушы</div>
          <div style="font-size:22px; font-weight:900; margin-top:2px;">${totalParticipants} оқушы</div>
        </div>
        <div style="background:rgba(255,255,255,0.15); backdrop-filter:blur(4px); border-radius:12px; padding:12px; text-align:center; border:1px solid rgba(255,255,255,0.25);">
          <div style="font-size:11px; text-transform:uppercase; font-weight:800; color:#FFD36A;">Жеңімпаздар</div>
          <div style="font-size:22px; font-weight:900; color:#FFD36A; margin-top:2px;">${totalWinners} оқырман 🌟</div>
        </div>
      </div>
    </div>

    <!-- РЕДИНГ БАДДИ (MASCOT) ШАҚЫРУЫ -->
    <div style="display:flex; align-items:center; gap:16px; background:#ffffff; border:2px solid #FFD36A; border-radius:var(--radius-lg); padding:14px 20px; box-shadow:0 6px 18px rgba(255,211,106,0.2); margin-bottom:20px;">
      <div style="flex-shrink:0;">
        ${generateMascotSvg('fox', 'excited', 70)}
      </div>
      <div style="flex:1;">
        <div style="font-size:11px; font-weight:800; color:#d97706; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px;">
          🦊 Kitap Dos шақырады:
        </div>
        <div style="font-size:13.5px; font-weight:700; color:var(--text-main); line-height:1.45;">
          Марафонға қосылып, күнделікті кітап оқу әдетін қалыптастыр! Әр аяқталған марафон үшін <strong>ресми QR сертификат</strong> пен <strong>жоғары XP ұпай</strong> беріледі!
        </div>
      </div>
    </div>

    <!-- СҮЗГІ БАТЫРМАЛАРЫ -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
      <div class="filter-chip-group" id="challenge-filter-tabs">
        <button class="filter-chip ${activeFilter === 'all' ? 'active' : ''} btn-chal-filter" data-filter="all">Барлығы (${challenges.length})</button>
        <button class="filter-chip ${activeFilter === 'joined' ? 'active' : ''} btn-chal-filter" data-filter="joined">Қатысып жатқандарым</button>
        <button class="filter-chip ${activeFilter === 'completed' ? 'active' : ''} btn-chal-filter" data-filter="completed">Жеңістерім 🏆</button>
        <button class="filter-chip ${activeFilter === 'class' ? 'active' : ''} btn-chal-filter" data-filter="class">Сыныптық жарыс 👥</button>
      </div>
      <div>
        <a href="#/shelf" class="btn-3d btn-3d-green" style="padding:7px 16px; font-size:12px; text-decoration:none;">
          📖 Кітап сөресіне өту
        </a>
      </div>
    </div>

    <!-- Марафондар карточкаларының торы -->
    <div id="challenges-list-container" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:18px;"></div>
  `;

  // Сүзгі түймелерін басқару
  container.querySelectorAll('.btn-chal-filter').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('.btn-chal-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderList();
    };
  });

  // Жаңа марафон құру батырмасы
  const createBtn = container.querySelector('#btn-create-challenge');
  if (createBtn) {
    createBtn.onclick = () => openCreateChallengeModal(() => renderChallengesView(container));
  }

  renderList();
}

function renderChallengeCard(chal) {
  const isDone = chal.is_completed;
  const isJoined = chal.is_joined;
  const percent = chal.my_percent || 0;

  let unitLabel = 'бірлік';
  if (chal.challenge_type === 'days') unitLabel = 'күн';
  else if (chal.challenge_type === 'pages') unitLabel = 'бет';
  else if (chal.challenge_type === 'books') unitLabel = 'кітап';
  else if (chal.challenge_type === 'class_competition') unitLabel = 'сынып беті';

  const typeName = chal.challenge_type === 'days' ? '📅 Күндер марафоны'
    : chal.challenge_type === 'pages' ? '📖 Беттер марафоны'
    : chal.challenge_type === 'books' ? '📚 Кітаптар марафоны'
    : '👥 Сыныптар жарысы';

  return `
    <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; border-top: 5px solid ${isDone ? '#10b981' : isJoined ? '#3b82f6' : '#FFD36A'}; border-radius:var(--radius-lg); padding:20px; margin-bottom:0; box-shadow:0 8px 20px rgba(38,55,70,0.06); transition:transform 0.2s ease, box-shadow 0.2s ease;">
      <div>
        <!-- Карточка басы -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px;">
          <div>
            <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; font-size:11px; margin-bottom:6px;">
              ${typeName}
            </span>
            <h3 style="font-size:17px; font-weight:900; margin:4px 0 2px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <span style="font-size:22px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));">${chal.badge_icon || '🏆'}</span>
              <span>${chal.title}</span>
            </h3>
          </div>
          <div>
            ${isDone ? `
              <span class="badge" style="background:#dcfce7; color:#15803d; font-weight:800; font-size:11px; border:1px solid #86efac;">
                Орындалды ✓
              </span>
            ` : isJoined ? `
              <span class="badge" style="background:#e0e7ff; color:#4338ca; font-weight:800; font-size:11px; border:1px solid #c7d2fe;">
                Қатысуда 🏃
              </span>
            ` : `
              <span class="badge" style="background:#fef3c7; color:#b45309; font-weight:800; font-size:11px; border:1px solid #fde68a;">
                Ашық
              </span>
            `}
          </div>
        </div>

        <p style="font-size:13.5px; color:#475569; margin-bottom:14px; line-height:1.5;">
          ${chal.description}
        </p>

        <!-- Мерзімі мен сыйлығы -->
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#64748b; background:#f8fafc; padding:10px 12px; border-radius:10px; margin-bottom:16px; border:1px solid #e2e8f0;">
          <div>
            <strong style="color:var(--text-main);">Мерзімі:</strong> ${chal.start_date.slice(5)} — ${chal.end_date.slice(5)}
          </div>
          <div>
            <strong style="color:var(--text-main);">Сыйлық:</strong> <span style="color:#d97706; font-weight:900; font-size:13px;">+${chal.reward_xp} XP</span>
          </div>
        </div>

        <!-- Прогресс индикаторы -->
        ${isJoined ? `
          <div style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:6px;">
              <span style="font-weight:800; color:var(--text-main);">Жеке прогресс:</span>
              <span style="font-weight:900; color:${isDone ? '#10b981' : '#2563eb'};">
                ${chal.my_progress} / ${chal.target_value} ${unitLabel} (${percent}%)
              </span>
            </div>
            <div style="width:100%; height:12px; background:#e2e8f0; border-radius:6px; overflow:hidden; border:1px solid #cbd5e1;">
              <div style="width:${percent}%; height:100%; background:${isDone ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #238451)'}; transition:width 0.5s ease; border-radius:6px;"></div>
            </div>
          </div>
        ` : `
          <div style="margin-bottom:16px; font-size:12.5px; color:#64748b;">
            🎯 <strong style="color:var(--text-main);">Мақсат:</strong> ${chal.target_value} ${unitLabel} оқу
          </div>
        `}
      </div>

      <!-- Әрекет түймелері -->
      <div style="border-top:1px solid #f1f5f9; padding-top:14px;">
        <div style="display:flex; gap:10px; margin-bottom:10px;">
          ${!isJoined ? `
            <button class="btn-3d btn-3d-green btn-join-challenge" data-id="${chal.id}" style="flex:1; padding:8px 14px; font-size:12.5px;">
              🚀 Марафонға тіркелу
            </button>
          ` : isDone ? `
            <button class="btn-3d btn-3d-yellow btn-view-certificate" data-id="${chal.id}" style="flex:1; padding:8px 14px; font-size:12.5px;">
              🏆 Сертификатты көру (PDF)
            </button>
          ` : `
            <a href="#/shelf" class="btn-3d btn-3d-blue" style="flex:1; text-align:center; padding:8px 14px; font-size:12.5px; text-decoration:none;">
              📖 Оқуды жалғастыру
            </a>
          `}
        </div>

        <!-- Рейтинг ашу түймесі -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11.5px; color:#64748b; font-weight:700;">
            👥 ${chal.participants_count || 0} оқушы • 🌟 ${chal.winners_count || 0} жеңімпаз
          </span>
          <button class="btn btn-link btn-sm btn-toggle-leaderboard" data-id="${chal.id}" style="padding:0; font-size:11.5px; font-weight:800; color:var(--primary-green);">
            ▼ Қатысушылар рейтингі
          </button>
        </div>

        <!-- Рейтинг блок (жабық тұрады) -->
        <div id="leaderboard-box-${chal.id}" style="display:none; margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:10px;">
          <div style="font-size:11px; font-weight:800; color:#334155; margin-bottom:8px; text-transform:uppercase;">
            Үздік қатысушылар (Top 10):
          </div>
          ${chal.leaderboard && chal.leaderboard.length ? `
            <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
              ${chal.leaderboard.map((p, idx) => `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; background:#f8fafc; padding:6px 10px; border-radius:6px; border:1px solid #f1f5f9;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:900; color:${idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b'}; width:18px;">
                      #${idx + 1}
                    </span>
                    <span style="font-size:14px;">${p.avatar === 'owl' ? '🦉' : '🦊'}</span>
                    <span style="font-weight:700; color:var(--text-main);">${p.nickname}</span>
                  </div>
                  <div>
                    <span style="font-weight:800; color:#2563eb;">${p.current_progress} ${unitLabel}</span>
                    ${p.completed ? '<span title="Жеңімпаз">🌟</span>' : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="font-size:11px; color:#94a3b8;">Әзірге қатысушылар тіркелмеген.</div>
          `}
        </div>
      </div>
    </div>
  `;
}

// Ресми Сертификат модалі
export function openCertificateModal(cert) {
  const modalHtml = `
    <div id="printable-certificate-container" style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align:center;">
      <!-- Сертификат парағы (A4 үлгісіне бейімделген) -->
      <div style="border:10px double #176B4D; padding:32px 28px; background:linear-gradient(135deg, #ffffff 0%, #FFF8E9 100%); border-radius:12px; position:relative; overflow:hidden; box-shadow:0 12px 32px rgba(23,107,77,0.15);">
        <!-- Алтын ою өрнектер -->
        <div style="font-size:12px; font-weight:800; color:#176B4D; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">
          ${cert.ministry}
        </div>
        <div style="font-size:14px; font-weight:800; color:#238451; letter-spacing:1px; margin-bottom:14px;">
          ${cert.school} · «KITAP TRACKER» ЖОБАСЫ
        </div>

        <div style="font-size:48px; margin-bottom:4px; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.15));">${cert.badge_icon || '🏆'}</div>

        <h1 style="font-size:28px; font-weight:900; color:#176B4D; margin:4px 0 12px 0; letter-spacing:1.5px;">
          ЖЕҢІМПАЗ СЕРТИФИКАТЫ
        </h1>

        <p style="font-size:14px; color:#475569; margin-bottom:12px; font-style:italic;">
          Осы сертификат оқырмандық табандылық танытып, кітап оқу марафонының биік межесін бағындырғаны үшін:
        </p>

        <!-- Оқушының аты-жөні -->
        <div style="font-size:26px; font-weight:900; color:#0f172a; border-bottom:3px solid #FFD36A; display:inline-block; padding:4px 28px; margin-bottom:16px;">
          ${cert.student_name}
        </div>

        <div style="font-size:15px; color:#1e293b; margin-bottom:18px; line-height:1.6; max-width:540px; margin-left:auto; margin-right:auto;">
          <strong>«${cert.challenge_title}»</strong> оқырман жарысында белгіленген <strong>${cert.target_value}</strong> межесін толық орындап, <span style="color:#d97706; font-weight:900;">«${cert.badge_name}»</span> атағына және <strong>+${cert.reward_xp} XP</strong> марапатына ие болды.
        </div>

        <!-- Төменгі реквизиттер мен QR код -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; border-top:1.5px solid #cbd5e1; padding-top:16px;">
          <!-- QR код -->
          <div style="text-align:left; display:flex; align-items:center; gap:12px;">
            <div style="width:76px; height:76px; background:#fff; padding:3px; border:1.5px solid #e2e8f0; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
              ${cert.qr_svg}
            </div>
            <div>
              <div style="font-size:10px; font-weight:900; color:#176B4D; text-transform:uppercase;">РЕСМИ QR-РАСТАУ</div>
              <div style="font-size:10px; color:#64748b; font-family:monospace; margin-top:2px;">${cert.certificate_code}</div>
              <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Күні: ${cert.completed_at}</div>
            </div>
          </div>

          <!-- Мөр мен қолдар -->
          <div style="display:flex; gap:24px; text-align:center;">
            <div>
              <div style="font-size:12px; font-weight:700; color:#334155;">Мектеп директорының ОІЖО</div>
              <div style="font-size:11px; color:#94a3b8; margin-top:18px;">(қолы / мөрі)</div>
            </div>
            <div>
              <div style="font-size:12px; font-weight:700; color:#334155;">Сынып жетекшісі</div>
              <div style="font-size:11px; color:#94a3b8; margin-top:18px;">(қолы)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Әрекеттер түймесі -->
      <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;" class="no-print">
        <button class="btn btn-secondary" id="btn-close-cert-modal">Жабу</button>
        <button class="btn-3d btn-3d-green" id="btn-print-certificate" style="padding:8px 20px;">
          🖨️ Басып шығару (PDF)
        </button>
      </div>
    </div>
  `;

  openModal('Оқырман марафонының жеңімпаз сертификаты', modalHtml);

  setTimeout(() => {
    const printBtn = document.getElementById('btn-print-certificate');
    if (printBtn) {
      printBtn.onclick = () => window.print();
    }
  }, 50);
}

// Жаңа марафон құру модалі
function openCreateChallengeModal(onSuccess) {
  const modalHtml = `
    <form id="form-create-challenge" style="display:flex; flex-direction:column; gap:12px;">
      <div>
        <label class="form-label">Марафон атауы:</label>
        <input type="text" class="form-input" id="inp-chal-title" required placeholder="Мысалы: 14 күндік қысқы оқу марафоны" />
      </div>

      <div>
        <label class="form-label">Марафон сипаттамасы мен ережесі:</label>
        <textarea class="form-textarea" id="inp-chal-desc" rows="3" required placeholder="Марафонның мақсаты мен орындау талаптарын жазыңыз..."></textarea>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label class="form-label">Жарыс түрі:</label>
          <select class="form-input" id="inp-chal-type">
            <option value="days">📅 Күндер саны бойынша (тұрақтылық)</option>
            <option value="pages">📖 Оқылған беттер саны</option>
            <option value="books">📚 Аяқталған кітаптар саны</option>
            <option value="class_competition">👥 Сыныптар арасындағы дода</option>
          </select>
        </div>
        <div>
          <label class="form-label">Орындалу межесі (мақсат саны):</label>
          <input type="number" class="form-input" id="inp-chal-target" required min="1" value="10" placeholder="Мысалы: 7, 30 немесе 500" />
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label class="form-label">Басталу күні:</label>
          <input type="date" class="form-input" id="inp-chal-start" required value="${new Date().toISOString().slice(0, 10)}" />
        </div>
        <div>
          <label class="form-label">Аяқталу күні:</label>
          <input type="date" class="form-input" id="inp-chal-end" required value="${new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}" />
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
        <div>
          <label class="form-label">Сыйлық XP:</label>
          <input type="number" class="form-input" id="inp-chal-xp" value="200" min="10" max="5000" />
        </div>
        <div>
          <label class="form-label">Атақ / Бейдж:</label>
          <input type="text" class="form-input" id="inp-chal-badge" value="Марафон Жеңімпазы" />
        </div>
        <div>
          <label class="form-label">Иконкасы:</label>
          <input type="text" class="form-input" id="inp-chal-icon" value="🏆" />
        </div>
      </div>

      <div style="margin-top:10px; display:flex; justify-content:flex-end; gap:10px;">
        <button type="submit" class="btn-3d btn-3d-green">➕ Марафонды жариялау</button>
      </div>
    </form>
  `;

  openModal('Жаңа оқырман марафонын құру', modalHtml);

  setTimeout(() => {
    const form = document.getElementById('form-create-challenge');
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('inp-chal-title').value.trim();
      const description = document.getElementById('inp-chal-desc').value.trim();
      const challenge_type = document.getElementById('inp-chal-type').value;
      const target_value = parseInt(document.getElementById('inp-chal-target').value, 10);
      const start_date = document.getElementById('inp-chal-start').value;
      const end_date = document.getElementById('inp-chal-end').value;
      const reward_xp = parseInt(document.getElementById('inp-chal-xp').value, 10);
      const badge_name = document.getElementById('inp-chal-badge').value.trim();
      const badge_icon = document.getElementById('inp-chal-icon').value.trim();

      try {
        await api.createChallenge({
          title, description, challenge_type, target_value, start_date, end_date, reward_xp, badge_name, badge_icon
        });
        showToast('Жаңа марафон сәтті жарияланды!', 'success');
        document.getElementById('modal-close-btn')?.click();
        if (onSuccess) onSuccess();
      } catch (err) {
        showToast('Қате: ' + err.message, 'error');
      }
    };
  }, 50);
}
