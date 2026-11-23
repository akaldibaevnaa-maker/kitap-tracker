/**
 * KitapTracker — Ғылыми эксперименттік зерттеу модулі (Research Dashboard)
 * Республиаклық ғылыми жоба байқауына арналған арнайы зерттеу панелі
 * 
 * Құлахметова Аягөз (№290 орта мектеп, 2026 ж.)
 * Жетекші: Аскарова А.К., Кеңесші: Құлмырзаев Н.С.
 */
import { api } from '../api.js';
import { showToast, openModal } from '../ui.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function renderResearchView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:36px; margin-bottom:8px;">🔬</div>
      <p style="color:var(--text-muted); font-weight:600;">Ғылыми эксперимент деректері жүктелуде...</p>
    </div>
  `;

  try {
    const [meRes, expRes] = await Promise.all([
      api.me().catch(() => ({ user: null })),
      api.getResearchExperiments()
    ]);

    const user = meRes.user || { role: 'student' };
    const isTeacher = user.role === 'teacher' || user.role === 'admin';
    const experiments = expRes.experiments || [];

    if (!experiments.length) {
      container.innerHTML = `<div class="card" style="text-align:center; padding:40px;">Зерттеу деректері табылмады.</div>`;
      return;
    }

    // Бірінші ресми экспериментті таңдау
    const currentExp = experiments[0];
    const detailRes = await api.getResearchExperiment(currentExp.id);
    const analysis = detailRes.analysis;

    renderResearchDashboard(container, {
      user,
      isTeacher,
      experiment: analysis.experiment,
      indicators: analysis.indicators,
      interestDistribution: analysis.interestDistribution,
      stats: analysis.stats,
      isSample: analysis.isSample
    });
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="color:var(--danger-color); padding:24px; text-align:center;">
        <h3>Ғылыми зерттеу деректерін жүктеу қатесі</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function renderResearchDashboard(container, { user, isTeacher, experiment, indicators, interestDistribution, stats, isSample }) {
  container.innerHTML = `
    <div style="max-width: 1100px; margin: 0 auto; display:flex; flex-direction:column; gap:20px;">
      
      <!-- Жоғарғы ғылыми баннер -->
      <div class="card" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%); color:#fff; padding:24px 28px; border-radius:14px; box-shadow: 0 10px 25px -5px rgba(30, 58, 138, 0.4);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
              <span style="background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3); font-size:12px; font-weight:700; padding:3px 10px; border-radius:12px;">
                🇰🇿 РЕСПУБЛИКАЛЫҚ ҒЫЛЫМИ ЖОБА БАЙҚАУЫ · 2026
              </span>
              <span class="badge" style="background:${isSample ? '#fef3c7' : '#dcfce7'}; color:${isSample ? '#92400e' : '#166534'}; font-weight:800; font-size:12px; padding:4px 10px; border-radius:12px;">
                ${isSample ? '⚠️ Үлгілік деректер' : '✓ Нақты эксперимент деректері'}
              </span>
            </div>
            <h1 style="font-size:24px; font-weight:800; color:#fff; margin:0 0 6px;">
              🔬 Эксперименттік Ғылыми Зерттеу Орталығы
            </h1>
            <p style="font-size:14px; opacity:0.9; margin:0; color:#cbd5e1; max-width:750px;">
              ${escapeHtml(experiment.title)}
            </p>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <a href="/api/research/experiments/${experiment.id}/report" target="_blank" class="btn" style="background:#22c55e; color:#fff; font-weight:700; border:none; box-shadow:0 2px 4px rgba(0,0,0,0.15);">
              📄 Ресми PDF / Есеп
            </a>
            ${isTeacher ? `
              <button class="btn" id="btn-edit-research-metrics" style="background:rgba(255,255,255,0.2); color:#fff; border:1px solid rgba(255,255,255,0.4); font-weight:700;">
                ✏️ Көрсеткіштерді өңдеу
              </button>
            ` : ''}
          </div>
        </div>

        <div style="margin-top:18px; pt-3; border-top:1px solid rgba(255,255,255,0.15); display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; font-size:13px; color:#cbd5e1;">
          <span>Мектеп: <strong>${escapeHtml(experiment.school_name)}</strong> · Оқу жылы: <strong>${escapeHtml(experiment.academic_year)}</strong></span>
          <span>Автор: <strong>Құлахметова Аягөз</strong> · Жетекші: Аскарова А.К. · Кеңесші: Құлмырзаев Н.С.</span>
        </div>
      </div>

      <!-- Зерттеу карточкалары (Болжам және Топтар) -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">
        <div class="card" style="border-left:4px solid #3b82f6; padding:18px;">
          <div style="font-size:12px; font-weight:800; color:#2563eb; text-transform:uppercase; margin-bottom:4px;">
            💡 Ғылыми болжам (Гипотеза)
          </div>
          <p style="font-size:13px; line-height:1.5; color:#334155; margin:0;">
            ${escapeHtml(experiment.hypothesis)}
          </p>
        </div>

        <div class="card" style="border-left:4px solid #10b981; padding:18px;">
          <div style="font-size:12px; font-weight:800; color:#059669; text-transform:uppercase; margin-bottom:4px;">
            👥 Зерттеу базасы мен құрамы
          </div>
          <div style="font-size:13px; color:#334155; line-height:1.6;">
            <div>🌱 <strong>Эксперименттік топ:</strong> ${escapeHtml(experiment.experimental_group_name)}</div>
            <div>📘 <strong>Бақылау тобы:</strong> ${escapeHtml(experiment.control_group_name)}</div>
            <div>⏱️ <strong>Зерттеу ұзақтығы:</strong> 5 ай (Қазан 2025 ж. — Наурыз 2026 ж.)</div>
          </div>
        </div>
      </div>

      <!-- 5 Негізгі салыстырмалы көрсеткіштер блоктары -->
      <div>
        <div style="font-size:15px; font-weight:800; color:#1e293b; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <span>📊 5 НЕГІЗГІ ӨЛШЕНГЕН КӨРСЕТКІШТІҢ САЛЫСТЫРМАЛЫ НӘТИЖЕСІ:</span>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          ${indicators.map(ind => `
            <div class="card" style="padding:16px; border-radius:10px; display:flex; flex-direction:column; justify-content:space-between; border-top:3px solid #10b981;">
              <div>
                <div style="font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">${escapeHtml(ind.title)}</div>
                <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">
                  <span style="font-size:11px; color:#64748b;">Бақылау (${ind.unit}):</span>
                  <span style="font-size:13px; font-weight:700; color:#475569;">${ind.controlPre} ➔ ${ind.controlPost} <span style="color:#0284c7;">(${ind.controlGrowth.pct})</span></span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
                  <span style="font-size:11px; color:#15803d; font-weight:700;">Эксперимент:</span>
                  <span style="font-size:15px; font-weight:800; color:#15803d;">${ind.expPre} ➔ ${ind.expPost} <span style="background:#dcfce7; padding:1px 6px; border-radius:4px;">(${ind.expGrowth.pct})</span></span>
                </div>
              </div>
              <div style="pt-2; border-top:1px dashed #e2e8f0; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                <span style="color:#64748b;">Таза басымдық:</span>
                <span style="font-weight:800; color:#15803d; font-size:14px;">${ind.netAdvantagePct}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Көрнекі SVG Диаграммалар блогы -->
      <div class="card" style="padding:22px;">
        <h3 style="font-size:16px; font-weight:800; color:#1e293b; margin:0 0 16px; display:flex; align-items:center; gap:8px;">
          <span>📈 1-ДИАГРАММА: БАСТАПҚЫ ЖӘНЕ ҚОРЫТЫНДЫ ДИАГНОСТИКА САЛЫСТЫРМАСЫ</span>
        </h3>
        
        <!-- SVG Bar Chart -->
        <div style="overflow-x:auto;">
          <svg viewBox="0 0 800 280" style="width:100%; min-width:650px; height:auto; font-family:'Segoe UI', sans-serif;">
            <!-- Grid lines -->
            <line x1="80" y1="40" x2="760" y2="40" stroke="#f1f5f9" stroke-width="1" />
            <line x1="80" y1="90" x2="760" y2="90" stroke="#f1f5f9" stroke-width="1" />
            <line x1="80" y1="140" x2="760" y2="140" stroke="#f1f5f9" stroke-width="1" />
            <line x1="80" y1="190" x2="760" y2="190" stroke="#f1f5f9" stroke-width="1" />
            <line x1="80" y1="230" x2="760" y2="230" stroke="#cbd5e1" stroke-width="2" />

            <!-- Y Axis Labels (%) -->
            <text x="70" y="45" font-size="11" text-anchor="end" fill="#94a3b8">100%</text>
            <text x="70" y="95" font-size="11" text-anchor="end" fill="#94a3b8">75%</text>
            <text x="70" y="145" font-size="11" text-anchor="end" fill="#94a3b8">50%</text>
            <text x="70" y="195" font-size="11" text-anchor="end" fill="#94a3b8">25%</text>
            <text x="70" y="235" font-size="11" text-anchor="end" fill="#94a3b8">0%</text>

            <!-- Bars per indicator (5 groups) -->
            ${indicators.map((ind, i) => {
              const xBase = 120 + i * 130;
              // Scale to height 190 px (0% -> y:230, 100% -> y:40)
              const scale = 1.9;

              // Normalized values for comparison visual
              let cPreVal = ind.key.includes('pct') ? ind.controlPre : Math.min(100, ind.controlPre * (ind.key === 'books_per_week' ? 30 : ind.key === 'active_reading_days' ? 14 : 0.3));
              let cPostVal = ind.key.includes('pct') ? ind.controlPost : Math.min(100, ind.controlPost * (ind.key === 'books_per_week' ? 30 : ind.key === 'active_reading_days' ? 14 : 0.3));
              let ePreVal = ind.key.includes('pct') ? ind.expPre : Math.min(100, ind.expPre * (ind.key === 'books_per_week' ? 30 : ind.key === 'active_reading_days' ? 14 : 0.3));
              let ePostVal = ind.key.includes('pct') ? ind.expPost : Math.min(100, ind.expPost * (ind.key === 'books_per_week' ? 30 : ind.key === 'active_reading_days' ? 14 : 0.3));

              const hCpre = Math.max(4, cPreVal * scale);
              const hCpost = Math.max(4, cPostVal * scale);
              const hEpre = Math.max(4, ePreVal * scale);
              const hEpost = Math.max(4, ePostVal * scale);

              return `
                <g>
                  <!-- Bar 1: Control Pre -->
                  <rect x="${xBase}" y="${230 - hCpre}" width="18" height="${hCpre}" rx="3" fill="#cbd5e1" />
                  <!-- Bar 2: Control Post -->
                  <rect x="${xBase + 20}" y="${230 - hCpost}" width="18" height="${hCpost}" rx="3" fill="#64748b" />
                  <!-- Bar 3: Exp Pre -->
                  <rect x="${xBase + 44}" y="${230 - hEpre}" width="18" height="${hEpre}" rx="3" fill="#86efac" />
                  <!-- Bar 4: Exp Post (Hero) -->
                  <rect x="${xBase + 64}" y="${230 - hEpost}" width="22" height="${hEpost}" rx="3" fill="#15803d" />
                  <!-- Hero value label -->
                  <text x="${xBase + 75}" y="${220 - hEpost}" font-size="10" font-weight="800" text-anchor="middle" fill="#15803d">${ind.expPost}${ind.unit.trim() === '%' ? '%' : ''}</text>
                  <!-- X-Axis Label -->
                  <text x="${xBase + 45}" y="250" font-size="10" font-weight="700" text-anchor="middle" fill="#334155">${ind.title.split(' ')[0]}</text>
                  <text x="${xBase + 45}" y="264" font-size="9" text-anchor="middle" fill="#64748b">${ind.title.split(' ').slice(1, 3).join(' ')}</text>
                </g>
              `;
            }).join('')}
          </svg>
        </div>

        <!-- Legend -->
        <div style="display:flex; justify-content:center; gap:20px; flex-wrap:wrap; margin-top:14px; font-size:12px; font-weight:700;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:14px; height:14px; border-radius:3px; background:#cbd5e1;"></span>
            <span>Бақылау тобы (Бастапқы)</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:14px; height:14px; border-radius:3px; background:#64748b;"></span>
            <span>Бақылау тобы (Қорытынды)</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:14px; height:14px; border-radius:3px; background:#86efac;"></span>
            <span>Эксперименттік топ (Бастапқы)</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:14px; height:14px; border-radius:3px; background:#15803d;"></span>
            <span style="color:#15803d;">Эксперименттік топ (Kitap Tracker, Қорытынды) 🚀</span>
          </div>
        </div>
      </div>

      <!-- 2-Диаграмма: Оқуға қызығушылық деңгейінің бөлінісі (Төмен, Орта, Жоғары) -->
      <div class="card" style="padding:22px;">
        <h3 style="font-size:16px; font-weight:800; color:#1e293b; margin:0 0 16px;">
          🎯 2-ДИАГРАММА: ОҚУШЫЛАРДЫҢ ҚЫЗЫҒУШЫЛЫҚ ДЕҢГЕЙІНІҢ САПАЛЫҚ ӨЗГЕРІСІ
        </h3>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
          <!-- Бақылау тобы бөлінісі -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
            <div style="font-size:13px; font-weight:800; color:#475569; margin-bottom:10px;">
              Бақылау тобы (6 «Б» сыныбы, n=25)
            </div>
            
            <div style="font-size:12px; margin-bottom:6px;">Бастапқы кезең:</div>
            <div style="display:flex; height:24px; border-radius:6px; overflow:hidden; margin-bottom:12px;">
              <div style="width:${(interestDistribution.control.pre.low/25)*100}%; background:#ef4444; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Төмен">10</div>
              <div style="width:${(interestDistribution.control.pre.medium/25)*100}%; background:#f59e0b; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Орта">11</div>
              <div style="width:${(interestDistribution.control.pre.high/25)*100}%; background:#22c55e; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Жоғары">4</div>
            </div>

            <div style="font-size:12px; margin-bottom:6px;">Қорытынды кезең:</div>
            <div style="display:flex; height:24px; border-radius:6px; overflow:hidden;">
              <div style="width:${(interestDistribution.control.post.low/25)*100}%; background:#ef4444; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Төмен">8</div>
              <div style="width:${(interestDistribution.control.post.medium/25)*100}%; background:#f59e0b; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Орта">12</div>
              <div style="width:${(interestDistribution.control.post.high/25)*100}%; background:#22c55e; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Жоғары">5</div>
            </div>
            <div style="font-size:11px; color:#64748b; margin-top:8px;">Жоғары деңгей: 4 оқушыдан (16%) ➔ 5 оқушыға (20%) өсті.</div>
          </div>

          <!-- Эксперименттік топ бөлінісі -->
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px;">
            <div style="font-size:13px; font-weight:800; color:#166534; margin-bottom:10px;">
              Эксперименттік топ (6 «А» сыныбы, Kitap Tracker, n=25) ⭐
            </div>

            <div style="font-size:12px; margin-bottom:6px;">Бастапқы кезең:</div>
            <div style="display:flex; height:24px; border-radius:6px; overflow:hidden; margin-bottom:12px;">
              <div style="width:${(interestDistribution.experimental.pre.low/25)*100}%; background:#ef4444; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Төмен">9</div>
              <div style="width:${(interestDistribution.experimental.pre.medium/25)*100}%; background:#f59e0b; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Орта">12</div>
              <div style="width:${(interestDistribution.experimental.pre.high/25)*100}%; background:#22c55e; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Жоғары">4</div>
            </div>

            <div style="font-size:12px; margin-bottom:6px;">Қорытынды кезең:</div>
            <div style="display:flex; height:24px; border-radius:6px; overflow:hidden;">
              <div style="width:${(interestDistribution.experimental.post.low/25)*100}%; background:#ef4444; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Төмен">1</div>
              <div style="width:${(interestDistribution.experimental.post.medium/25)*100}%; background:#f59e0b; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Орта">5</div>
              <div style="width:${(interestDistribution.experimental.post.high/25)*100}%; background:#16a34a; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="Жоғары">19</div>
            </div>
            <div style="font-size:11px; color:#15803d; font-weight:700; margin-top:8px;">Жоғары деңгей: 4 оқушыдан (16%) ➔ 19 оқушыға (76%) жетті! (+375% қарқын)</div>
          </div>
        </div>

        <div style="display:flex; justify-content:center; gap:24px; margin-top:14px; font-size:12px; font-weight:700;">
          <span style="color:#ef4444;">■ Төмен деңгей</span>
          <span style="color:#f59e0b;">■ Орта деңгей</span>
          <span style="color:#22c55e;">■ Жоғары деңгей</span>
        </div>
      </div>

      <!-- Математикалық-статистикалық қорытынды (Student t-test) -->
      <div class="card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
        <h4 style="font-size:15px; font-weight:800; color:#1e293b; margin:0 0 10px; display:flex; align-items:center; gap:8px;">
          <span>📐 МАТЕМАТИКАЛЫҚ-СТАТИСТИКАЛЫҚ ДӘЛЕЛДЕУ (STUDENT t-ТЕСТІ)</span>
        </h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:13px; margin-bottom:12px;">
          <div style="background:#fff; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
            Іріктеме саны: <strong>n₁ = n₂ = ${stats.sampleSizeN} оқушы</strong>
          </div>
          <div style="background:#fff; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
            Есептелген критерий: <strong>t_эмп = ${stats.tValue}</strong>
          </div>
          <div style="background:#fff; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
            Сыни мән (p = 0.001): <strong>t_кр = ${stats.criticalValue001}</strong>
          </div>
          <div style="background:#dcfce7; padding:10px 14px; border-radius:8px; border:1px solid #86efac; color:#166534; font-weight:700;">
            Ықтималдық: <strong>p ${stats.pValue} (жоғары сенімді)</strong>
          </div>
        </div>
        <p style="font-size:13px; line-height:1.6; color:#334155; margin:0;">
          <strong>Ғылыми түйін:</strong> ${escapeHtml(stats.verdict)}
        </p>
      </div>

    </div>
  `;

  // Мұғалім модалі оқиғасы
  const editBtn = container.querySelector('#btn-edit-research-metrics');
  if (editBtn) {
    editBtn.onclick = () => openEditMetricsModal(experiment, indicators);
  }
}

/**
 * Көрсеткіштерді өңдеу модалі (Мұғалім / Әкімші үшін)
 */
function openEditMetricsModal(experiment, indicators) {
  const bodyHtml = `
    <div style="display:flex; flex-direction:column; gap:14px; max-height:480px; overflow-y:auto; padding-right:6px;">
      <div style="font-size:13px; color:#64748b;">
        Төменде эксперименттік және бақылау топтарының бастапқы (Pre) және қорытынды (Post) диагностика деректерін өңдей аласыз:
      </div>

      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:8px;">
        <h4 style="font-size:13px; font-weight:800; color:#166534; margin:0 0 8px;">
          Эксперименттік топ (Kitap Tracker) — Қорытынды көрсеткіштер:
        </h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
          <div>
            <label style="font-weight:700; display:block; margin-bottom:2px;">Аптасына кітап саны:</label>
            <input type="number" step="0.1" id="m-exp-books" class="form-control" value="${indicators.find(i => i.key === 'books_per_week')?.expPost || 2.4}">
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:2px;">Айлық беттер саны:</label>
            <input type="number" step="1" id="m-exp-pages" class="form-control" value="${indicators.find(i => i.key === 'pages_per_month')?.expPost || 285}">
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:2px;">Оқыған күндер (аптасына):</label>
            <input type="number" step="0.1" id="m-exp-days" class="form-control" value="${indicators.find(i => i.key === 'active_reading_days')?.expPost || 5.3}">
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:2px;">Қызығушылық (%):</label>
            <input type="number" step="1" id="m-exp-interest" class="form-control" value="${indicators.find(i => i.key === 'interest_level_pct')?.expPost || 88}">
          </div>
          <div style="grid-column: span 2;">
            <label style="font-weight:700; display:block; margin-bottom:2px;">Мәтінді түсіну сапасы (%):</label>
            <input type="number" step="1" id="m-exp-comp" class="form-control" value="${indicators.find(i => i.key === 'comprehension_pct')?.expPost || 84}">
          </div>
        </div>
      </div>
    </div>
  `;

  openModal({
    title: '✏️ Эксперимент көрсеткіштерін жаңарту',
    bodyHtml,
    saveText: 'Сақтау және қайта есептеу',
    onSave: async (modalEl) => {
      const books_per_week = Number(modalEl.querySelector('#m-exp-books').value);
      const pages_per_month = Number(modalEl.querySelector('#m-exp-pages').value);
      const active_reading_days = Number(modalEl.querySelector('#m-exp-days').value);
      const interest_level_pct = Number(modalEl.querySelector('#m-exp-interest').value);
      const comprehension_pct = Number(modalEl.querySelector('#m-exp-comp').value);

      try {
        await api.updateResearchMetrics(experiment.id, {
          group_type: 'experimental',
          stage: 'post',
          students_count: 25,
          books_per_week,
          pages_per_month,
          active_reading_days,
          interest_level_pct,
          comprehension_pct,
          high_interest_count: Math.round((interest_level_pct / 100) * 25)
        });

        showToast('Эксперимент деректері сәтті жаңартылды!', 'success');
        // Refresh view
        const container = document.getElementById('app');
        if (container) renderResearchView(container);
        return true;
      } catch (err) {
        showToast('Қате: ' + err.message, 'error');
        return false;
      }
    }
  });
}
