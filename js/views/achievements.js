// «Жетістіктерім» — Саяхат картасы, 3D марапаттар және ашық ұпай ережелері
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, AVATAR_MAP } from '../ui.js';

export async function renderAchievementsView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 50px 20px;">
      <div style="font-size:36px; margin-bottom:10px;">🏆</div>
      <p style="color:var(--text-muted); font-weight:700;">Жетістіктер мен 3D медальдар жүктелуде...</p>
    </div>
  `;

  try {
    const data = await api.getAchievements();
    renderContent(container, data);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color); padding:30px; text-align:center;">Қате: ${err.message}</div>`;
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

  // 3D Медальдар тізімі
  const medals3D = [
    {
      id: 'gold_master',
      title: '«Алтын Бәйтерек» медалі',
      type: 'gold',
      icon: '👑',
      desc: '700+ XP жинаған немесе 7-сатыға жеткен кемел оқырманға беріледі.',
      unlocked: xp >= 700,
      progress: `${Math.min(700, xp)} / 700 XP`
    },
    {
      id: 'emerald_scholar',
      title: '«Зерделі оқырман» медалі',
      type: 'emerald',
      icon: '💎',
      desc: 'Тұрақты кітап оқу сериясын 7 күн сақтаған және 100+ бет оқыған оқушыға беріледі.',
      unlocked: (streak?.count || 0) >= 7 || (stats?.total_pages || 0) >= 100,
      progress: `${streak?.count || 0} күн серия`
    },
    {
      id: 'silver_explorer',
      title: '«Оқиға бағдаршысы» медалі',
      type: 'silver',
      icon: '🧭',
      desc: '3 кітапты толық аяқтап, саяхат картасының барлық бекеттерін өткенге табысталады.',
      unlocked: (stats?.finished || 0) >= 3,
      progress: `${stats?.finished || 0} / 3 кітап`
    },
    {
      id: 'bronze_starter',
      title: '«Алғашқы қадам» медалі',
      type: 'bronze',
      icon: '🌱',
      desc: 'Кітап әлеміне саяхат бастап, алғашқы оқу жазбасын тіркеген оқушыға беріледі.',
      unlocked: xp >= 10,
      progress: xp >= 10 ? 'Орындалды' : '0/1 жазба'
    }
  ];

  container.innerHTML = `
    <!-- Жоғарғы айдар -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
      <div>
        <h2 style="font-size:24px; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:10px;">
          <span>🏆</span> ${t('achieve_title')}
        </h2>
        <p style="font-size:14px; color:var(--text-muted); margin-top:2px;">
          Сенің оқудағы жеке дамуың, 3D медальдарың, ашылған марапаттарың мен жинаған тәжірибең (XP).
        </p>
      </div>
      <div style="display:flex; gap:8px;">
        <a href="#/world" class="btn btn-secondary btn-sm">← Менің әлемім</a>
        <a href="#/tree" class="btn btn-primary btn-sm">🌳 Кітап ағашы</a>
      </div>
    </div>

    <!-- Жалпы даму көрсеткіштерінің картасы -->
    <div class="card" style="background:linear-gradient(135deg, #176B4D 0%, #11533b 60%, #1c3d33 100%); color:#ffffff; border-radius:var(--radius-lg); padding:24px; margin-bottom:24px; box-shadow:0 12px 30px rgba(23, 107, 77, 0.25);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
        <div style="display:flex; align-items:center; gap:18px;">
          <div style="width:72px; height:72px; background:rgba(255,255,255,0.18); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:40px; border:3px solid #E8B95C; position:relative; box-shadow:0 6px 18px rgba(0,0,0,0.2);">
            ${equipped.avatar ? getAvatarEmoji(equipped.avatar) : '🦊'}
            ${equipped.decor ? `<span style="position:absolute; top:-8px; right:-8px; font-size:22px;">${getDecorEmoji(equipped.decor)}</span>` : ''}
          </div>
          <div>
            <div style="font-size:12px; color:#E8B95C; font-weight:800; text-transform:uppercase; letter-spacing:1px;">
              Жалпы оқырман мәртебесі
            </div>
            <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
              <span style="font-size:32px; font-weight:900; color:#ffffff;">+${xp} XP</span>
              <span class="badge-crystal" style="font-size:13px; padding:6px 14px; background:rgba(255,255,255,0.2); border-color:rgba(255,255,255,0.4); color:#fff;">💎 ${crystals || 0} Кристалл</span>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:14px; flex-wrap:wrap;">
          <div style="background:rgba(255,255,255,0.12); border-radius:12px; padding:10px 16px; text-align:center; min-width:85px;">
            <div style="font-size:22px; font-weight:900; color:#fde68a;">🔥 ${streak?.count || 0}</div>
            <div style="font-size:11px; color:#DDF1E5;">Күн сериясы</div>
          </div>
          <div style="background:rgba(255,255,255,0.12); border-radius:12px; padding:10px 16px; text-align:center; min-width:85px;">
            <div style="font-size:22px; font-weight:900; color:#ffffff;">${stats.days || 0}</div>
            <div style="font-size:11px; color:#DDF1E5;">Оқу күні</div>
          </div>
          <div style="background:rgba(255,255,255,0.12); border-radius:12px; padding:10px 16px; text-align:center; min-width:85px;">
            <div style="font-size:22px; font-weight:900; color:#ffffff;">${stats.finished || 0}</div>
            <div style="font-size:11px; color:#DDF1E5;">Аяқталған кітап</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 1. 3D МЕДАЛЬДАР МЕН МАРАПАТТАР ВИТРИНАСЫ -->
    <div class="card" style="margin-bottom:24px; padding:22px;">
      <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span>🎖️</span> <span>3D Оқырман Медальдары</span>
        </div>
        <span style="font-size:12px; font-weight:800; color:var(--primary-green); background:#DDF1E5; padding:4px 12px; border-radius:20px;">
          Интерактивті 3D параллакс
        </span>
      </div>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:18px;">
        Медальдардың үстіне тінтуірді апарып, 3D айналуы мен жылтыр жарығын көріңіз:
      </p>

      <div class="awards-3d-grid" id="medals-3d-container">
        ${medals3D.map(m => `
          <div class="award-3d-card medal-interactive-item ${m.unlocked ? 'unlocked' : 'locked'}" data-medal="${m.id}" style="${m.unlocked ? 'border:1.5px solid #E8B95C;' : 'opacity:0.75;'}">
            <div class="award-medal-circle ${m.type}">
              ${m.icon}
            </div>
            <h4 style="font-size:15px; font-weight:900; color:var(--text-main); margin:0 0 4px 0;">
              ${m.title}
            </h4>
            <p style="font-size:11px; color:var(--text-muted); line-height:1.4; margin:0 0 10px 0; min-height:32px;">
              ${m.desc}
            </p>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:800; padding:4px 8px; background:var(--bg-soft); border-radius:6px;">
              <span>${m.progress}</span>
              <span style="color:${m.unlocked ? '#166534' : '#64748b'};">
                ${m.unlocked ? '✓ Иеленді' : '🔒 Құлып'}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 2. КЕҢЕЙТІЛГЕН ЖЕТІСТІКТЕР ГАЛЕРЕЯСЫ (RICH BADGES) -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span>🌟</span> <span>Барлық жетістік белгілері</span>
        </div>
        <span style="font-size:12px; font-weight:800; color:var(--text-muted);">
          Ашылған: ${(richBadges || []).filter(b => b.unlocked).length} / ${(richBadges || []).length}
        </span>
      </div>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
        Кітап оқу, квиздер тапсыру және күнделікті белсенділік арқылы жаңа дәрежелерді аш!
      </p>

      <div class="rich-badge-grid">
        ${(richBadges || []).map(b => `
          <div class="rich-badge-card ${b.unlocked ? 'unlocked' : 'locked'}" style="border-radius:var(--radius-md);">
            <div class="rich-badge-icon" style="background:${b.unlocked ? b.color + '22' : 'var(--bg-soft)'}; border:2px solid ${b.unlocked ? b.color : 'var(--border-color)'}; font-size:24px;">
              ${b.icon}
            </div>
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                <h4 style="font-size:14px; font-weight:800; margin:0; color:${b?.unlocked ? 'var(--text-main)' : 'var(--text-muted)'};">
                  ${b?.title || 'Марапат'}
                </h4>
                <span class="badge" style="font-size:10px; font-weight:800; background:${b.unlocked ? '#DDF1E5' : 'var(--bg-soft)'}; color:${b.unlocked ? '#176B4D' : 'var(--text-muted)'};">
                  ${b.unlocked ? '✓ Ашылды' : '🔒 Құлып'}
                </span>
              </div>
              <p style="font-size:12px; color:var(--text-muted); margin:4px 0 6px 0; line-height:1.3;">
                ${b.desc}
              </p>
              <div style="font-size:11px; font-weight:800; color:${b.unlocked ? b.color : 'var(--text-muted)'};">
                Барысы: ${b.progress}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 3. АВАТАР БЕЗЕНДІРУЛЕРІ (Қауырсын, жұлдыз, бас киім) -->
    <div class="card" style="margin-bottom:24px;">
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

    <!-- 4. ВИРТУАЛДЫ СӨРЕ ЗАТТАРЫ -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-title">
        <span>🪴</span> ${t('achieve_items')}
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:12px;">
        ${shelfItems.map(it => `
          <div style="background:var(--bg-soft); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-sm); text-align:center; opacity:${it.owned ? '1' : '0.5'};">
            <div style="font-size:32px;">${it.emoji}</div>
            <div style="font-size:13px; font-weight:800; margin-top:6px; color:var(--text-main);">${getItemName(it.id)}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${it.owned ? '✓ Сөреде бар' : '🔒 Әлі ашылмады'}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 5. АШЫҚ ЖӘНЕ ӘДІЛ ҰПАЙ ЕРЕЖЕЛЕРІ -->
    <div class="card" style="background:#fcfbf7; border:1px solid var(--border-color);">
      <div class="card-title">
        <span>⚖️</span> ${t('achieve_rules_title')}
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:12px; font-size:13px;">
        <div style="background:#fff; border:1px solid var(--border-color); padding:12px; border-radius:var(--radius-sm);">
          <strong style="color:var(--primary-green);">+${rules.daily_log || 10} XP:</strong> Күндегі алғашқы оқу жазбасы үшін
        </div>
        <div style="background:#fff; border:1px solid var(--border-color); padding:12px; border-radius:var(--radius-sm);">
          <strong style="color:#0284c7;">+${rules.game || 10} XP:</strong> Оқу ойынын алғаш орындағанда
        </div>
        <div style="background:#fff; border:1px solid var(--border-color); padding:12px; border-radius:var(--radius-sm);">
          <strong style="color:#7c3aed;">+${rules.reflection || 20} XP:</strong> Мұғалім қабылдаған рефлексия үшін
        </div>
        <div style="background:#fff; border:1px solid var(--border-color); padding:12px; border-radius:var(--radius-sm);">
          <strong style="color:var(--accent-gold-dark);">+${rules.book_finished || 50} XP:</strong> Кітапты толық аяқтағанда
        </div>
      </div>
      <div style="font-size:12px; color:var(--text-muted); margin-top:12px;">
        ℹ️ Бір күн оқымағаны үшін айыппұл немесе ұпай шегеру жоқ. Ақылы марапаттар немесе кездейсоқ ұтыстар жоқ.
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

function bindEvents(container) {
  // Әшекей тағу
  container.querySelectorAll('.btn-equip-decor').forEach(btn => {
    btn.onclick = async () => {
      const decorId = btn.getAttribute('data-id');
      try {
        await api.updateMe({ decor: decorId === 'none' ? null : decorId });
        showToast('Аватарыңыз жаңарды!', 'success');
        renderAchievementsView(container);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });

  // 3D Медальдардың интерактивті параллакс эффектісі
  container.querySelectorAll('.medal-interactive-item').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotX = -(y / rect.height) * 18;
      const rotY = (x / rect.width) * 18;
      card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.04)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}
