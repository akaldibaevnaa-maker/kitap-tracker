// «Ортақ миссия» және «Сынып рейтингі» (Leaderboard)
import { api } from '../api.js';
import { t } from '../i18n.js';

export async function renderMissionView(container) {
  let activeTab = 'garden'; // 'garden' немесе 'leaderboard'

  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">Мәліметтер жүктелуде...</p>
    </div>
  `;

  async function loadAndRender() {
    try {
      const [missionData, leaderboardData] = await Promise.all([
        api.getMission().catch(() => ({ class: null, missions: [] })),
        api.getLeaderboard().catch(() => ({ class_name: null, leaderboard: [] })),
      ]);
      render(missionData, leaderboardData);
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
    }
  }

  function render(data, lbData) {
    const { class: cls, missions } = data;
    const leaderboard = lbData.leaderboard || [];
    const className = cls?.name || lbData.class_name || 'Сынып';

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <h2 style="font-size:24px; font-weight:800; color:var(--text-main);">
            ${activeTab === 'garden' ? '🌱 Білім бағы (Ортақ миссия)' : '🏆 Сынып рейтингі (Көшбасшылар тақтасы)'}
          </h2>
          <div style="font-size:13px; color:var(--text-muted);">
            Сынып: <strong>${className}</strong> · Тұрақты оқу дағдысы мен ортақ жеңіс
          </div>
        </div>
      </div>

      <!-- Қойындылар (Tabs) -->
      <div style="display:flex; gap:8px; border-bottom:2px solid var(--border-color); padding-bottom:8px; margin-bottom:20px;">
        <button class="btn btn-sm ${activeTab === 'garden' ? 'btn-primary' : 'btn-secondary'}" id="tab-garden">
          🌱 Білім бағы
        </button>
        <button class="btn btn-sm ${activeTab === 'leaderboard' ? 'btn-primary' : 'btn-secondary'}" id="tab-leaderboard">
          🏆 Сынып рейтингі
        </button>
      </div>

      <div id="mission-tab-content">
        ${activeTab === 'garden' ? renderGardenView(cls, missions) : renderLeaderboardView(leaderboard)}
      </div>
    `;

    container.querySelector('#tab-garden').onclick = () => {
      activeTab = 'garden';
      loadAndRender();
    };
    container.querySelector('#tab-leaderboard').onclick = () => {
      activeTab = 'leaderboard';
      loadAndRender();
    };
  }

  function renderGardenView(cls, missions) {
    if (!cls || missions.length === 0) {
      return `
        <div class="card" style="text-align:center; padding:40px;">
          <div style="font-size:40px; margin-bottom:10px;">🌱</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:8px;">Ортақ миссия әлі басталмаған</h3>
          <p style="font-size:14px; color:var(--text-muted);">
            Мұғалім сыныпқа ортақ миссия тағайындаған кезде, бұл жерде бірлескен «Білім бағы» көрінеді.
          </p>
        </div>
      `;
    }

    const mainMission = missions[0] || { title: 'Ортақ сынып миссиясы', percent: 0, progress: 0, target: 50, remaining: 50, mine: 0 };
    const pct = mainMission.percent || 0;

    let gardenIcons = '🌱';
    if (pct > 25) gardenIcons = '🌱 🌿';
    if (pct > 50) gardenIcons = '🌿 🌳 🌸';
    if (pct > 75) gardenIcons = '🌳 🍎 🌺 🌳';
    if (pct >= 100) gardenIcons = '🌳 🍎 🌺 🌳 🦋 🌻 🍏 🌳';

    return `
      <!-- Виртуалды «Білім бағы» көрінісі -->
      <div class="garden-container">
        <div style="font-size:14px; font-weight:700; color:#065f46; margin-bottom:6px; text-transform:uppercase;">
          ${mainMission.title || 'Ортақ сынып миссиясы'}
        </div>
        <div class="garden-visual">
          ${gardenIcons}
        </div>
        <div style="font-size:18px; font-weight:800; color:#14213d; margin-bottom:8px;">
          ${mainMission.progress || 0} / ${mainMission.target || 50} үлес жиналды (${pct}%)
        </div>
        <div style="width:80%; max-width:400px;">
          <div class="progress-bar-wrap" style="height:14px;">
            <div class="progress-bar-fill" style="width:${pct}%; background:#16a34a;"></div>
          </div>
        </div>

        <div class="garden-stats">
          <div class="garden-stat-item">
            <div style="color:var(--text-muted); font-size:11px;">СЫНЫП МАҚСАТЫ</div>
            <div style="color:var(--primary-green); font-size:18px;">${mainMission.target || 50}</div>
          </div>
          <div class="garden-stat-item">
            <div style="color:var(--text-muted); font-size:11px;">ҚАЛҒАНЫ</div>
            <div style="color:var(--accent-gold-dark); font-size:18px;">${mainMission.remaining || 0}</div>
          </div>
          <div class="garden-stat-item" style="border:2px solid #16a34a;">
            <div style="color:var(--text-muted); font-size:11px;">СЕНІҢ ҮЛЕСІҢ ⭐</div>
            <div style="color:#16a34a; font-size:18px;">${mainMission.mine || 0}</div>
          </div>
        </div>
      </div>

      <!-- Түсіндірме ескертпесі -->
      <div class="card" style="background:#f8fafc; border-left:4px solid #3b82f6;">
        <h4 style="font-size:15px; font-weight:700; margin-bottom:6px;">Миссия қалай орындалады?</h4>
        <p style="font-size:13px; color:#475569; line-height:1.5;">
          Әрбір оқушыдан бірдей көлемде кітап оқу талап етілмейді. Сен өзіңнің мүмкіндігіңе қарай күнделікті кітап оқып, ойыңмен бөліссең болғаны — сенің әрбір қадамың сынып бағына бір жаңа жеміс пен көшет сыйлайды!
        </p>
      </div>

      <!-- Барлық сынып миссиялары -->
      ${missions.length > 1 ? `
        <div class="card">
          <div class="card-title">Қосымша сынып мақсаттары</div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${missions.slice(1).map(m => `
              <div style="background:var(--bg-soft); padding:12px 16px; border-radius:var(--radius-sm);">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                  <strong>${m?.title || 'Миссия'}</strong>
                  <span>${m?.progress || 0} / ${m?.target || 0} (${m?.percent || 0}%)</span>
                </div>
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" style="width:${m.percent}%;"></div>
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                  Сенің қосқан үлесің: <strong>${m.mine || 0}</strong>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  function renderLeaderboardView(leaderboard) {
    if (leaderboard.length === 0) {
      return `
        <div class="card" style="text-align:center; padding:30px; color:var(--text-muted);">
          Сыныпта әзірге рейтинг деректері жоқ.
        </div>
      `;
    }

    return `
      <!-- Көшбасшылар подиумы (Top 3) -->
      ${leaderboard.length >= 3 ? `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:24px;">
          <!-- 1-орын -->
          <div class="card" style="text-align:center; border:2px solid #eab308; background:linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); margin:0; padding:18px;">
            <div style="font-size:36px; margin-bottom:4px;">🥇</div>
            <div class="podium-rank rank-1" style="margin-bottom:8px;">1-орын</div>
            <div style="font-size:24px;">${leaderboard[0].avatar === 'owl' ? '🦉' : leaderboard[0].avatar === 'bear' ? '🐻' : '🦊'}</div>
            <div style="font-weight:800; font-size:16px; margin:4px 0;">${leaderboard[0].nickname}</div>
            <div style="font-size:12px; color:#854d0e; font-weight:700;">
              ${leaderboard[0].tree.icon} «${leaderboard[0].tree.name}»
            </div>
            <div style="margin-top:8px; font-weight:800; color:var(--primary-green); font-size:15px;">
              +${leaderboard[0].xp} XP · 💎 ${leaderboard[0].crystals || 0}
            </div>
          </div>

          <!-- 2-орын -->
          <div class="card" style="text-align:center; border:2px solid #94a3b8; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); margin:0; padding:18px;">
            <div style="font-size:32px; margin-bottom:4px;">🥈</div>
            <div class="podium-rank rank-2" style="margin-bottom:8px;">2-орын</div>
            <div style="font-size:24px;">${leaderboard[1].avatar === 'owl' ? '🦉' : leaderboard[1].avatar === 'bear' ? '🐻' : '🦊'}</div>
            <div style="font-weight:800; font-size:16px; margin:4px 0;">${leaderboard[1].nickname}</div>
            <div style="font-size:12px; color:#334155; font-weight:700;">
              ${leaderboard[1].tree.icon} «${leaderboard[1].tree.name}»
            </div>
            <div style="margin-top:8px; font-weight:800; color:var(--primary-green); font-size:15px;">
              +${leaderboard[1].xp} XP · 💎 ${leaderboard[1].crystals || 0}
            </div>
          </div>

          <!-- 3-орын -->
          <div class="card" style="text-align:center; border:2px solid #fdba74; background:linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); margin:0; padding:18px;">
            <div style="font-size:32px; margin-bottom:4px;">🥉</div>
            <div class="podium-rank rank-3" style="margin-bottom:8px;">3-орын</div>
            <div style="font-size:24px;">${leaderboard[2].avatar === 'owl' ? '🦉' : leaderboard[2].avatar === 'bear' ? '🐻' : '🦊'}</div>
            <div style="font-weight:800; font-size:16px; margin:4px 0;">${leaderboard[2].nickname}</div>
            <div style="font-size:12px; color:#9a3412; font-weight:700;">
              ${leaderboard[2].tree.icon} «${leaderboard[2].tree.name}»
            </div>
            <div style="margin-top:8px; font-weight:800; color:var(--primary-green); font-size:15px;">
              +${leaderboard[2].xp} XP · 💎 ${leaderboard[2].crystals || 0}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Толық кесте -->
      <div class="card" style="padding:16px; overflow-x:auto;">
        <table class="leaderboard-table">
          <thead>
            <tr style="text-align:left; font-size:12px; color:var(--text-muted); text-transform:uppercase;">
              <th style="padding:10px 14px;">Орын</th>
              <th style="padding:10px 14px;">Оқушы</th>
              <th style="padding:10px 14px;">«Бәйтерек» ағашы</th>
              <th style="padding:10px 14px;">Серия</th>
              <th style="padding:10px 14px;">7 күндік оқу</th>
              <th style="padding:10px 14px; text-align:right;">Жалпы ұпай</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboard.map((item) => `
              <tr class="leaderboard-row ${item.is_current ? 'is-me' : ''}">
                <td class="leaderboard-cell" style="font-weight:800; width:50px;">
                  ${item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                </td>
                <td class="leaderboard-cell">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:22px;">${item.avatar === 'owl' ? '🦉' : item.avatar === 'bear' ? '🐻' : '🦊'}</span>
                    <div>
                      <strong style="color:var(--text-main); font-size:14px;">${item.nickname}</strong>
                      ${item.is_current ? '<span class="badge" style="background:#22c55e; color:#fff; font-size:10px; margin-left:6px;">Сен</span>' : ''}
                    </div>
                  </div>
                </td>
                <td class="leaderboard-cell">
                  <span style="font-weight:700; font-size:13px; color:#166534;">
                    ${item.tree.icon} ${item.tree.name}
                  </span>
                  <div style="font-size:11px; color:var(--text-muted);">${item.tree.level}-деңгей</div>
                </td>
                <td class="leaderboard-cell">
                  <span class="badge-streak" style="font-size:11px;">
                    🔥 ${item.streak || 0} күн
                  </span>
                </td>
                <td class="leaderboard-cell">
                  <div style="font-weight:700; font-size:13px;">${item.weekly_minutes || 0} мин</div>
                  <div style="font-size:11px; color:var(--text-muted);">${item.weekly_pages || 0} бет оқылды</div>
                </td>
                <td class="leaderboard-cell" style="text-align:right;">
                  <span style="font-weight:800; font-size:15px; color:var(--primary-green);">
                    +${item.xp} XP
                  </span>
                  <div>
                    <span class="badge-crystal" style="font-size:10px; padding:2px 6px;">
                      💎 ${item.crystals || 0}
                    </span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  loadAndRender();
}
