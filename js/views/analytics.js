// ==============================================================================
// SMART READER ANALYTICS — АҚЫЛДЫ ОҚЫРМАН АНАЛИТИКАСЫ МОДУЛІ
// Нақты деректер, 4 SVG диаграмма, салыстыру және жеке ақылды кеңестер
// ==============================================================================
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast } from '../ui.js';

export async function renderAnalyticsView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:32px; animation:spin 1.5s infinite linear;">📊</div>
      <p style="color:var(--text-muted); font-weight:600; margin-top:8px;">Оқырман аналитикасы есептелуде...</p>
    </div>
  `;

  try {
    const data = await api.getAnalytics();
    renderAnalyticsContent(container, data);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
  }
}

function renderAnalyticsContent(container, data) {
  const { daily, weekly, last_weekly, comparison, monthly, totals, charts, recommendations } = data;
  let activeTab = 'weekly'; // 'weekly' | 'monthly' | 'all'

  function render() {
    container.innerHTML = `
      <!-- Жоғарғы айдар -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <div>
          <div style="font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--accent-gold-dark); margin-bottom:4px;">
            Smart Reader Analytics · №290 орта мектеп
          </div>
          <h2 style="font-size:24px; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:8px; margin:0;">
            <span>📊</span> Smart Reader Analytics
          </h2>
          <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">
            Нақты дерекқор көрсеткіштері негізіндегі жеке оқу динамикасы мен аналитикалық есебі
          </p>
        </div>
        <div style="display:flex; gap:8px;">
          <a href="#/world" class="btn btn-secondary btn-sm" style="font-weight:700;">← Менің әлемім</a>
          <a href="#/tree" class="btn btn-primary btn-sm" style="font-weight:800;">🌳 Кітап ағашы</a>
        </div>
      </div>

      <!-- АҚЫЛДЫ ПЕДАГОГИКАЛЫҚ ҰСЫНЫСТАР БЛОГЫ -->
      ${renderSmartRecommendations(recommendations, comparison, totals)}

      <!-- 6 НЕГІЗГІ СТАТИСТИКА КАРТОЧКАСЫ -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:12px; margin-bottom:20px;">
        <!-- 1. Оқылған беттер -->
        <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid var(--primary-green);">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Барлық оқылған бет</div>
          <div style="font-size:24px; font-weight:900; color:var(--primary-green); margin:4px 0;">
            ${totals.pages} <span style="font-size:13px; font-weight:600;">бет</span>
          </div>
          <div style="font-size:11px; color:${comparison.is_growth ? '#166534' : '#b45309'}; font-weight:700;">
            ${comparison.is_growth ? `▲ Өткен аптадан +${comparison.delta_pages} бетке артық` : `▼ Өткен аптадан ${comparison.delta_pages} бет`}
          </div>
        </div>

        <!-- 2. Аяқталған кітаптар -->
        <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #3b82f6;">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Аяқталған кітап</div>
          <div style="font-size:24px; font-weight:900; color:#2563eb; margin:4px 0;">
            ${totals.books} <span style="font-size:13px; font-weight:600;">кітап</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted);">
            Толық оқылып қорытылған
          </div>
        </div>

        <!-- 3. Оқуға жұмсалған уақыт -->
        <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #8b5cf6;">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Жалпы оқу уақыты</div>
          <div style="font-size:24px; font-weight:900; color:#7c3aed; margin:4px 0;">
            ${Math.floor(totals.minutes / 60)} <span style="font-size:13px; font-weight:600;">сағ</span> ${totals.minutes % 60} <span style="font-size:13px; font-weight:600;">мин</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted);">
            Бүгін: ${daily.minutes} мин
          </div>
        </div>

        <!-- 4. Оқу сериясы (Streak) -->
        <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #ea580c;">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Күн сериясы (Streak)</div>
          <div style="font-size:24px; font-weight:900; color:#c2410c; margin:4px 0;">
            🔥 ${totals.streak_count} <span style="font-size:13px; font-weight:600;">күн</span>
          </div>
          <div style="font-size:11px; color:${totals.streak_active ? '#166534' : '#991b1b'}; font-weight:600;">
            ${totals.streak_active ? '✓ Бүгінгі оқу жазылды' : '⏳ Бүгін әлі оқылмады'}
          </div>
        </div>

        <!-- 5. Апталық мақсаттың орындалуы -->
        <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid var(--accent-gold);">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Мақсат орындалуы</div>
          <div style="font-size:24px; font-weight:900; color:var(--accent-gold-dark); margin:4px 0;">
            ${totals.goal_percent}%
          </div>
          <div style="font-size:11px; color:var(--text-muted);">
            ${weekly.days} / ${weekly.target_days} күн оқылды
          </div>
        </div>

        <!-- 6. Тәжірибе ұпайы (XP) -->
        <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #10b981;">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Жинаған XP</div>
          <div style="font-size:24px; font-weight:900; color:#059669; margin:4px 0;">
            +${totals.xp} <span style="font-size:13px; font-weight:600;">XP</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted);">
            Академиялық тәжірибе
          </div>
        </div>
      </div>

      <!-- ВИЗУАЛИЗАЦИЯ: 1-БӨЛІМ (БАҒАНДЫҚ ДИАГРАММА ЖӘНЕ СЫЗЫҚТЫҚ ГРАФИК) -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:16px; margin-bottom:20px;">
        <!-- 1. Бағандық диаграмма: Апта күндері бойынша оқылған беттер -->
        <div class="card" style="padding:18px; margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div>
              <h3 style="font-size:15px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                <span>📊</span> Апта күндері бойынша оқылым (Бағандық диаграмма)
              </h3>
              <p style="font-size:11px; color:var(--text-muted);">Осы аптаның әр күнінде оқылған беттер саны</p>
            </div>
            <span class="badge" style="background:#dcfce7; color:#166534; font-size:11px;">
              Барлығы: ${weekly.pages} бет
            </span>
          </div>

          <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:12px; overflow-x:auto;">
            ${renderBarChartSvg(charts.bar_chart)}
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-top:8px;">
            <span>Дүйсенбіден Жексенбіге дейін</span>
            <span>Күнделікті орташа: ~${Math.round(weekly.pages / 7)} бет</span>
          </div>
        </div>

        <!-- 2. Сызықтық график: 14 күндік динамика -->
        <div class="card" style="padding:18px; margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div>
              <h3 style="font-size:15px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                <span>📈</span> Оқылым динамикасы (Сызықтық график)
              </h3>
              <p style="font-size:11px; color:var(--text-muted);">Соңғы 14 күндегі оқу тұрақтылығы мен қарқыны</p>
            </div>
            <span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:11px;">
              14 күнде: ${charts.line_chart.reduce((a, b) => a + (b.pages || 0), 0)} бет
            </span>
          </div>

          <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:12px; overflow-x:auto;">
            ${renderLineChartSvg(charts.line_chart)}
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-top:8px;">
            <span>14 күн бұрын</span>
            <span>Бүгін</span>
          </div>
        </div>
      </div>

      <!-- ВИЗУАЛИЗАЦИЯ: 2-БӨЛІМ (ДӨҢГЕЛЕК ДИАГРАММА ЖӘНЕ ОҚУ КҮНТІЗБЕСІ) -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:16px; margin-bottom:20px;">
        <!-- 3. Дөңгелек диаграмма: Жанрлар бойынша бөлініс -->
        <div class="card" style="padding:18px; margin-bottom:0;">
          <div style="margin-bottom:12px;">
            <h3 style="font-size:15px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
              <span>🍩</span> Жанрлар үлесі (Дөңгелек диаграмма)
            </h3>
            <p style="font-size:11px; color:var(--text-muted);">Оқылған кітаптардың жанрлық бағыттары мен үлесі</p>
          </div>

          <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:12px;">
            ${renderDonutChartSvg(charts.donut_chart)}
          </div>
        </div>

        <!-- 4. Оқу белсенділігінің күнтізбесі (Activity Heatmap) -->
        <div class="card" style="padding:18px; margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div>
              <h3 style="font-size:15px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                <span>🗓️</span> Оқу белсенділігінің күнтізбесі
              </h3>
              <p style="font-size:11px; color:var(--text-muted);">Соңғы 28 күннің оқу белсенділігі (Heatmap)</p>
            </div>
            <div style="display:flex; align-items:center; gap:4px; font-size:10px; color:var(--text-muted);">
              <span>Аз</span>
              <span style="width:10px; height:10px; background:#e2e8f0; border-radius:2px;"></span>
              <span style="width:10px; height:10px; background:#86efac; border-radius:2px;"></span>
              <span style="width:10px; height:10px; background:#22c55e; border-radius:2px;"></span>
              <span style="width:10px; height:10px; background:#15803d; border-radius:2px;"></span>
              <span>Көп</span>
            </div>
          </div>

          <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:16px 12px;">
            ${renderCalendarHeatmap(charts.calendar)}
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:8px;">
            ℹ️ Күнделікті 15+ бет оқыған күндер қанық жасыл түспен белгіленеді.
          </div>
        </div>
      </div>
    `;
  }

  render();
}

/**
 * Ақылды педагогикалық кеңестер мен ұсыныстар карточкасы
 */
function renderSmartRecommendations(recommendations = [], comparison = {}, totals = {}) {
  return `
    <div class="card" style="background:linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border:1px solid #86efac; padding:16px 20px; margin-bottom:20px;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
        <span style="font-size:24px;">💡</span>
        <h3 style="font-size:16px; font-weight:800; color:#14532d; margin:0;">
          Ақылды оқырман ұсыныстары (Smart Insights)
        </h3>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${(recommendations || []).map(r => `
          <div style="background:white; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px; font-size:13px; font-weight:600; color:#166534; display:flex; align-items:flex-start; gap:8px;">
            <span>✨</span>
            <div style="flex:1;">${r}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * 1. SVG Бағандық диаграмма (Bar chart)
 */
function renderBarChartSvg(data = []) {
  if (!data.length) return '<div style="text-align:center; font-size:12px; color:var(--text-muted);">Деректер жоқ</div>';

  const maxPages = Math.max(15, ...data.map(d => d.pages || 0));
  const height = 150;
  const barWidth = 32;
  const gap = 16;
  const totalWidth = data.length * (barWidth + gap) + 30;

  const bars = data.map((d, i) => {
    const p = d.pages || 0;
    const barH = Math.max(4, Math.round((p / maxPages) * (height - 44)));
    const x = 20 + i * (barWidth + gap);
    const y = height - 26 - barH;
    const isToday = d.isToday;

    return `
      <g class="chart-bar-group">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${isToday ? 'url(#barGreenActive)' : 'url(#barGreen)'}" opacity="0.95">
          <title>${d.label} (${d.date}): ${p} бет, ${d.minutes || 0} минут</title>
        </rect>
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" font-weight="700" fill="${isToday ? '#15803d' : '#475569'}" text-anchor="middle">${p > 0 ? p : ''}</text>
        <text x="${x + barWidth / 2}" y="${height - 8}" font-size="11" font-weight="${isToday ? '800' : '600'}" fill="${isToday ? '#15803d' : '#64748b'}" text-anchor="middle">${d.label}${isToday ? '★' : ''}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${totalWidth} ${height}" width="100%" height="${height}">
      <defs>
        <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#22c55e"/>
          <stop offset="100%" stop-color="#176B4D"/>
        </linearGradient>
        <linearGradient id="barGreenActive" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="40%" stop-color="#E8B95C"/>
          <stop offset="100%" stop-color="#c99a38"/>
        </linearGradient>
      </defs>
      <line x1="10" y1="${height - 24}" x2="${totalWidth}" y2="${height - 24}" stroke="#cbd5e1" stroke-width="1.5"/>
      ${bars}
    </svg>
  `;
}

/**
 * 2. SVG Сызықтық график (Line chart)
 */
function renderLineChartSvg(data = []) {
  if (!data.length) return '<div style="text-align:center; font-size:12px; color:var(--text-muted);">Деректер жоқ</div>';

  const maxPages = Math.max(15, ...data.map(d => d.pages || 0));
  const width = 360;
  const height = 150;
  const padX = 25;
  const padY = 25;
  const stepX = (width - padX * 2) / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const p = d.pages || 0;
    const x = padX + i * stepX;
    const y = height - padY - Math.round((p / maxPages) * (height - padY * 2));
    return { x, y, p, label: d.label };
  });

  const pathD = points.map((pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `L ${pt.x} ${pt.y}`)).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

  const circles = points.map(pt => `
    <circle cx="${pt.x}" cy="${pt.y}" r="${pt.p > 0 ? 4 : 2.5}" fill="${pt.p > 0 ? '#2563eb' : '#94a3b8'}" stroke="#fff" stroke-width="1.5">
      <title>${pt.label}: ${pt.p} бет</title>
    </circle>
  `).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <!-- Тор сызықтары -->
      <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="${padX}" y1="${height / 2}" x2="${width - padX}" y2="${height / 2}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3"/>
      <!-- Аймақ және сызық -->
      <path d="${areaD}" fill="url(#areaGradient)"/>
      <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
    </svg>
  `;
}

/**
 * 3. SVG Дөңгелек / Donut диаграмма (Жанрлар үлесі)
 */
function renderDonutChartSvg(data = []) {
  const genres = data.length ? data : [
    { genre: 'Повесть', count: 1, percent: 50 },
    { genre: 'Ертегі', count: 1, percent: 30 },
    { genre: 'Басқа', count: 1, percent: 20 }
  ];

  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
  const size = 160;
  const r = 50;
  const cx = 80;
  const cy = 80;
  const strokeWidth = 24;
  const circ = 2 * Math.PI * r;

  let accOffset = 0;
  const total = genres.reduce((a, g) => a + (g.count || 1), 0);

  const slices = genres.map((g, i) => {
    const pct = g.percent || Math.round(((g.count || 1) / total) * 100);
    const strokeDash = (pct / 100) * circ;
    const strokeOffset = -accOffset;
    accOffset += strokeDash;
    const col = colors[i % colors.length];

    return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent"
        stroke="${col}" stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDash} ${circ - strokeDash}"
        stroke-dashoffset="${strokeOffset}">
        <title>${g.genre}: ${pct}% (${g.pages || 0} бет)</title>
      </circle>
    `;
  }).join('');

  const legend = genres.map((g, i) => `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; margin-bottom:6px;">
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="width:10px; height:10px; background:${colors[i % colors.length]}; border-radius:50%;"></span>
        <span style="font-weight:700; color:var(--text-main);">${g.genre}</span>
      </div>
      <span style="color:var(--text-muted);">${g.percent || 10}% (${g.pages || 0} бет)</span>
    </div>
  `).join('');

  return `
    <div style="display:flex; align-items:center; justify-content:space-around; flex-wrap:wrap; gap:16px;">
      <div style="position:relative; width:${size}px; height:${size}px;">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="transform: rotate(-90deg);">
          ${slices}
        </svg>
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;">
          <div style="font-size:16px; font-weight:900; color:var(--text-main);">${genres.length}</div>
          <div style="font-size:10px; color:var(--text-muted);">жанр</div>
        </div>
      </div>
      <div style="flex:1; min-width:140px;">
        ${legend}
      </div>
    </div>
  `;
}

/**
 * 4. Оқу күнтізбесі (Activity Heatmap)
 */
function renderCalendarHeatmap(calendar = []) {
  if (!calendar.length) return '<div style="font-size:12px; color:var(--text-muted); text-align:center;">Күнтізбе деректері жоқ</div>';

  const levelColors = ['#e2e8f0', '#86efac', '#4ade80', '#22c55e', '#15803d'];

  return `
    <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; max-width:320px; margin:0 auto;">
      ${calendar.map(d => {
        const col = levelColors[d.level || 0];
        const dayNum = d.date.slice(8, 10);
        return `
          <div style="aspect-ratio:1; background:${col}; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:${d.level >= 2 ? '#fff' : '#64748b'}; border:${d.isToday ? '2px solid #eab308' : 'none'}; cursor:pointer;" title="${d.date}: ${d.pages} бет оқылды">
            ${dayNum}
          </div>
        `;
      }).join('')}
    </div>
  `;
}
