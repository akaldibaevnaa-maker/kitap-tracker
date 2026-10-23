// «Жетістіктерім» — Саяхат картасы, марапаттар және ашық ұпай ережелері
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, AVATAR_MAP } from '../ui.js';

export async function renderAchievementsView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">Жетістіктер жүктелуде...</p>
    </div>
  `;

  try {
    const data = await api.getAchievements();
    renderContent(container, data);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
  }
}

function renderContent(container, data) {
  const {
    xp = 0,
    crystals = 0,
    streak = { count: 0 },
    badges: richBadges = [],
    stats = {},
    rules = {},
    rewards = [],
    equipped = {},
    history = []
  } = data || {};

  const safeRewards = Array.isArray(rewards) ? rewards : [];
  const badges = safeRewards.filter(r => r.type === 'badge');
  const decors = safeRewards.filter(r => r.type === 'decor');
  const shelfItems = safeRewards.filter(r => r.type === 'shelf_item');
  const scenes = safeRewards.filter(r => r.type === 'scene');

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:24px; font-weight:800; color:var(--text-main);">
        🏆 ${t('achieve_title')}
      </h2>
      <p style="font-size:14px; color:var(--text-muted);">
        Сенің оқудағы жеке дамуың, ашылған марапаттарың мен жинаған тәжірибең (XP).
      </p>
    </div>

    <!-- Жалпы статистика карточкасы -->
    <div class="card" style="background:linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); border-left:4px solid var(--primary-green);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:64px; height:64px; background:var(--bg-soft); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:36px; border:2px solid var(--border-color); position:relative;">
            ${equipped.avatar ? getAvatarEmoji(equipped.avatar) : '🦊'}
            ${equipped.decor ? `<span style="position:absolute; top:-6px; right:-6px; font-size:20px;">${getDecorEmoji(equipped.decor)}</span>` : ''}
          </div>
          <div>
            <div style="font-size:13px; color:var(--text-muted); font-weight:700;">ЖАЛПЫ ДАМУ ДЕҢГЕЙІ</div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:28px; font-weight:900; color:var(--primary-green);">+${xp} XP</span>
              <span class="badge-crystal" style="font-size:13px; padding:4px 12px;">💎 ${crystals || 0} Кристалл</span>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:16px; flex-wrap:wrap;">
          <div style="text-align:center;">
            <div style="font-size:20px; font-weight:800; color:#c2410c;">🔥 ${streak?.count || 0}</div>
            <div style="font-size:11px; color:var(--text-muted);">Күн сериясы</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:20px; font-weight:800;">${stats.days}</div>
            <div style="font-size:11px; color:var(--text-muted);">Оқу күні</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:20px; font-weight:800;">${stats.games}</div>
            <div style="font-size:11px; color:var(--text-muted);">Ойын орындалды</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:20px; font-weight:800;">${stats.finished}</div>
            <div style="font-size:11px; color:var(--text-muted);">Аяқталған кітап</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 1. КЕҢЕЙТІЛГЕН ЖЕТІСТІКТЕР ГАЛЕРЕЯСЫ (RICH BADGES) -->
    <div class="card">
      <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span>🎖️</span> <span>Жетістіктер галереясы</span>
        </div>
        <span style="font-size:12px; font-weight:700; color:var(--text-muted);">
          Ашылған: ${(richBadges || []).filter(b => b.unlocked).length} / ${(richBadges || []).length}
        </span>
      </div>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
        Кітап оқып, квиздер тапсыру және күнделікті белсенділік арқылы жаңа дәрежелі бейдждерді аш!
      </p>

      <div class="rich-badge-grid">
        ${(richBadges || []).map(b => `
          <div class="rich-badge-card ${b.unlocked ? 'unlocked' : 'locked'}">
            <div class="rich-badge-icon" style="background:${b.unlocked ? b.color + '22' : 'var(--bg-soft)'}; border:2px solid ${b.unlocked ? b.color : 'var(--border-color)'};">
              ${b.icon}
            </div>
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                <h4 style="font-size:14px; font-weight:800; margin:0; color:${b.unlocked ? 'var(--text-main)' : 'var(--text-muted)'};">
                  ${b.title}
                </h4>
                <span class="badge" style="font-size:10px; background:${b.unlocked ? '#dcfce7' : 'var(--bg-soft)'}; color:${b.unlocked ? '#166534' : 'var(--text-muted)'};">
                  ${b.unlocked ? '✓ Ашылды' : '🔒 Құлып'}
                </span>
              </div>
              <p style="font-size:12px; color:var(--text-muted); margin:4px 0 6px 0; line-height:1.3;">
                ${b.desc}
              </p>
              <div style="font-size:11px; font-weight:700; color:${b.unlocked ? b.color : 'var(--text-muted)'};">
                Барысы: ${b.progress}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 2. АВАТАР БЕЗЕНДІРУЛЕРІ (Қауырсын, жұлдыз, бас киім) -->
    <div class="card">
      <div class="card-title">
        <span>🪶</span> ${t('achieve_decor')}
      </div>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
        Ашылған әшекейді басып, өз аватарыңа тағып ал:
      </p>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn-sm ${!equipped.decor ? 'btn-primary' : 'btn-secondary'} btn-equip-decor" data-id="none">
          Әшекейсіз
        </button>
        ${decors.map(d => `
          <button class="btn btn-sm ${equipped.decor === d.id ? 'btn-primary' : 'btn-secondary'} btn-equip-decor" data-id="${d.id}" ${d.owned ? '' : 'disabled style="opacity:0.5;"'}>
            <span>${d.emoji}</span>
            <span>${getDecorName(d.id)}</span>
            ${!d.owned ? '<small>(құлып)</small>' : ''}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- 3. ВИРТУАЛДЫ СӨРЕ ЗАТТАРЫ -->
    <div class="card">
      <div class="card-title">
        <span>🪴</span> ${t('achieve_items')}
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">
        ${shelfItems.map(it => `
          <div style="background:var(--bg-soft); border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm); text-align:center; opacity:${it.owned ? '1' : '0.5'};">
            <div style="font-size:28px;">${it.emoji}</div>
            <div style="font-size:12px; font-weight:700; margin-top:4px;">${getItemName(it.id)}</div>
            <div style="font-size:10px; color:var(--text-muted);">${it.owned ? 'Сөреде бар' : 'Әлі ашылмады'}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 4. АШЫҚ ЖӘНЕ ӘДІЛ ҰПАЙ ЕРЕЖЕЛЕРІ -->
    <div class="card" style="background:#f8fafc;">
      <div class="card-title">
        <span>⚖️</span> ${t('achieve_rules_title')}
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:13px;">
        <div style="background:#fff; border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm);">
          <strong>+${rules.daily_log} XP:</strong> Күндегі алғашқы оқу жазбасы үшін
        </div>
        <div style="background:#fff; border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm);">
          <strong>+${rules.game} XP:</strong> Оқу ойынын алғаш орындағанда
        </div>
        <div style="background:#fff; border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm);">
          <strong>+${rules.reflection} XP:</strong> Мұғалім қабылдаған рефлексия үшін
        </div>
        <div style="background:#fff; border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm);">
          <strong>+${rules.book_finished} XP:</strong> Кітапты толық аяқтағанда
        </div>
      </div>
      <div style="font-size:12px; color:var(--text-muted); margin-top:10px;">
        ℹ️ Бір күн оқымағаны үшін айыппұл/ұпай алу жоқ. Ақылы марапаттар мен кездейсоқ ұтыстар жоқ.
      </div>
    </div>
  `;

  bindEvents(container);
}

function getAvatarEmoji(name) {
  const map = { fox: '🦊', owl: '🦉', bear: '🐻', wolf: '🐺', horse: '🐎', eagle: '🦅', camel: '🐫', turtle: '🐢', cat: '🐱', panda: '🐼' };
  return map[name] || '🦊';
}

function getDecorEmoji(id) {
  const map = { decor_feather: '🪶', decor_star: '⭐', decor_tulip: '🌷', decor_cap: '🎓' };
  return map[id] || '';
}

function getDecorName(id) {
  const map = { decor_feather: 'Үкі қауырсыны', decor_star: 'Алтын жұлдыз', decor_tulip: 'Қызғалдақ', decor_cap: 'Ғалым бас киімі' };
  return map[id] || id;
}

function getItemName(id) {
  const map = { item_lamp: 'Шамшырақ', item_globe: 'Глобус', item_plant: 'Үй гүлі', item_dombra: 'Қасиетті Домбыра' };
  return map[id] || id;
}

function getBadgeName(id) {
  const map = {
    first_log: 'Алғашқы қадам',
    first_game: 'Зерек оқырман',
    story_path: 'Оқиға бағдаршысы',
    word_master: 'Сөз қазынасы',
    evidence_finder: 'Дәйек іздеуші',
    thinker: 'Терең ойшыл',
    week_reader: 'Тұрақты оқырман',
    summit: 'Кітап шыңы'
  };
  return map[id] || id;
}

function getBadgeCondition(id) {
  const map = {
    first_log: '1 оқу белгіленді',
    first_game: '1 ойын орындалды',
    story_path: 'Оқиғалар реті шешілді',
    word_master: 'Жаңа сөз сөйлемде қолданылды',
    evidence_finder: 'Мәтіннен дәлел табылды',
    thinker: 'Мұғалім пікірді қабылдады',
    week_reader: 'Аптада 3 күн оқылды',
    summit: '1 кітап толық аяқталды'
  };
  return map[id] || '';
}

function bindEvents(container) {
  container.querySelectorAll('.btn-equip-decor').forEach(btn => {
    btn.onclick = async () => {
      const decorId = btn.getAttribute('data-id');
      try {
        await api.updateProfile({ decor: decorId === 'none' ? null : decorId });
        showToast('Аватар безендіруі жаңарды!', 'success');
        renderAchievementsView(container);
      } catch (err) {
        showToast(`Қате: ${err.message}`, 'error');
      }
    };
  });
}
