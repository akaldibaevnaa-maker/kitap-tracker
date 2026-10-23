// «Оқырман күнделігі» — Дәйексөздер (цитаталар), Аудио-рефлексиялар және ой-пікірлер галереясы
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal } from '../ui.js';

export async function renderDiaryView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">${t('diary_title')} жүктелуде...</p>
    </div>
  `;

  try {
    const [diaryData, shelfData] = await Promise.all([
      api.getDiary(),
      api.getShelf()
    ]);
    renderDiaryLayout(container, diaryData, shelfData);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
  }
}

function renderDiaryLayout(container, diaryData, shelfData) {
  let currentScope = 'my'; // 'my' | 'class'
  let activeTab = 'all';
  const { entries = [], class_entries = [], stats = {} } = diaryData;
  const availableBooks = [
    ...(shelfData.reading || []),
    ...(shelfData.finished || []),
    ...(shelfData.want || [])
  ];

  function renderList() {
    const listContainer = container.querySelector('#diary-entries-list');
    if (!listContainer) return;

    const sourceList = currentScope === 'my' ? entries : class_entries;
    let filtered = sourceList;
    if (activeTab === 'quotes') filtered = sourceList.filter(e => e.kind === 'quote');
    else if (activeTab === 'audio') filtered = sourceList.filter(e => e.kind === 'audio');
    else if (activeTab === 'notes') filtered = sourceList.filter(e => e.kind === 'note' || e.kind === 'reflection');

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="card" style="text-align:center; padding:40px; color:var(--text-muted);">
          <div style="font-size:36px; margin-bottom:10px;">${currentScope === 'my' ? '📖' : '👥'}</div>
          <p style="font-size:15px; margin-bottom:12px;">
            ${currentScope === 'my' ? t('diary_empty') : 'Сыныптастардың жазбалары әзірге жоқ немесе сүзгі бойынша табылмады.'}
          </p>
          ${currentScope === 'my' ? `
            <div style="display:flex; justify-content:center; gap:10px;">
              <button class="btn btn-primary btn-sm" id="btn-empty-add-quote">✍️ Дәйексөз жазу</button>
              <button class="btn btn-accent btn-sm" id="btn-empty-add-audio">🎙️ Аудио жазу</button>
            </div>
          ` : ''}
        </div>
      `;
      const eqBtn = listContainer.querySelector('#btn-empty-add-quote');
      if (eqBtn) eqBtn.onclick = () => openAddQuoteModal(availableBooks, () => renderDiaryView(container));
      const eaBtn = listContainer.querySelector('#btn-empty-add-audio');
      if (eaBtn) eaBtn.onclick = () => openAddAudioModal(availableBooks, () => renderDiaryView(container));
      return;
    }

    listContainer.innerHTML = filtered.map(item => renderDiaryCard(item, currentScope === 'class')).join('');

    // Лайк батырмаларын басуды өңдеу
    listContainer.querySelectorAll('.btn-diary-like').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const countEl = btn.querySelector('.like-num');
        const currentCount = parseInt(countEl?.textContent || '0', 10);
        if (btn.classList.contains('liked')) {
          btn.classList.remove('liked');
          btn.style.color = '';
          btn.style.borderColor = '';
          if (countEl) countEl.textContent = Math.max(0, currentCount - 1);
        } else {
          btn.classList.add('liked');
          btn.style.color = '#e11d48';
          btn.style.borderColor = '#fda4af';
          btn.style.background = '#ffe4e6';
          if (countEl) countEl.textContent = currentCount + 1;
          showToast('Сыныптасыңызға қолдау білдірдіңіз! ❤️', 'success');
        }
      };
    });
  }

  function renderContent() {
    const isMy = currentScope === 'my';
    const classCount = class_entries.length;
    const sourceList = isMy ? entries : class_entries;

    container.innerHTML = `
      <!-- Жоғарғы айдар -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <h2 style="font-size:24px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <span>📝</span> ${t('diary_title')}
          </h2>
          <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">
            ${isMy ? t('diary_subtitle') : '11А сынып оқушыларының оқыған кітаптарынан дәйексөздер мен пікірлер қабырғасы'}
          </p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="btn-add-quote">
            ✍️ ${t('diary_add_quote')}
          </button>
          <button class="btn btn-accent btn-sm" id="btn-record-audio">
            🎙️ ${t('diary_record_audio')}
          </button>
        </div>
      </div>

      <!-- Басты қосқыш (Менің күнделігім / Сыныптың оқырман қабырғасы) -->
      <div style="display:flex; justify-content:center; margin-bottom:18px;">
        <div style="background:var(--bg-soft); padding:4px; border-radius:12px; display:inline-flex; border:1px solid var(--border-color); gap:4px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <button class="btn btn-sm ${isMy ? 'btn-primary' : 'btn-secondary'}" id="scope-btn-my" style="border-radius:8px; font-weight:700; padding:8px 18px;">
            👤 Менің күнделігім (${entries.length})
          </button>
          <button class="btn btn-sm ${!isMy ? 'btn-primary' : 'btn-secondary'}" id="scope-btn-class" style="border-radius:8px; font-weight:700; padding:8px 18px;">
            👥 Сыныптың оқырман қабырғасы (${classCount})
          </button>
        </div>
      </div>

      <!-- Статистика карточкалары -->
      ${isMy ? `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
          <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid var(--primary-green); display:flex; align-items:center; gap:12px;">
            <div style="font-size:28px;">📚</div>
            <div>
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Барлық жазбам</div>
              <div style="font-size:20px; font-weight:800; color:var(--primary-green);">${stats.total || entries.length}</div>
            </div>
          </div>
          <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid var(--accent-gold); display:flex; align-items:center; gap:12px;">
            <div style="font-size:28px;">✨</div>
            <div>
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Дәйексөздерім</div>
              <div style="font-size:20px; font-weight:800; color:var(--accent-gold-dark);">${stats.quotes || entries.filter(e => e.kind === 'quote').length}</div>
            </div>
          </div>
          <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #3b82f6; display:flex; align-items:center; gap:12px;">
            <div style="font-size:28px;">🎙️</div>
            <div>
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Аудио-ойларым</div>
              <div style="font-size:20px; font-weight:800; color:#2563eb;">${stats.audio || entries.filter(e => e.kind === 'audio').length}</div>
            </div>
          </div>
        </div>
      ` : `
        <div class="card" style="padding:16px; margin-bottom:20px; background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border:1px solid #86efac; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:32px;">🌟</div>
            <div>
              <div style="font-weight:800; font-size:15px; color:#166534;">Сыныптастардың кітап қазынасы</div>
              <div style="font-size:12px; color:#15803d;">Сыныптастарыңның тапқан әсерлі қанатты сөздері мен пікірлерін оқып, шабыт ал!</div>
            </div>
          </div>
          <div style="font-size:13px; font-weight:700; color:#166534; background:white; padding:6px 14px; border-radius:20px; border:1px solid #bbf7d0;">
            Барлығы: ${classCount} жазба
          </div>
        </div>
      `}

      <!-- Сүзгі қойындылары -->
      <div style="display:flex; gap:8px; border-bottom:2px solid var(--border-color); padding-bottom:8px; margin-bottom:16px; overflow-x:auto;">
        <button class="btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}" data-dtab="all">
          ${isMy ? t('diary_tab_all') : 'Барлық жазбалар'} (${sourceList.length})
        </button>
        <button class="btn btn-sm ${activeTab === 'quotes' ? 'btn-primary' : 'btn-secondary'}" data-dtab="quotes">
          ✨ ${t('diary_tab_quotes')} (${sourceList.filter(e => e.kind === 'quote').length})
        </button>
        ${isMy ? `
          <button class="btn btn-sm ${activeTab === 'audio' ? 'btn-primary' : 'btn-secondary'}" data-dtab="audio">
            🎙️ ${t('diary_tab_audio')} (${sourceList.filter(e => e.kind === 'audio').length})
          </button>
        ` : ''}
        <button class="btn btn-sm ${activeTab === 'notes' ? 'btn-primary' : 'btn-secondary'}" data-dtab="notes">
          💡 Ой-толғаулар (${sourceList.filter(e => e.kind === 'note' || e.kind === 'reflection').length})
        </button>
      </div>

      <!-- Жазбалар тізімі -->
      <div id="diary-entries-list" style="display:flex; flex-direction:column; gap:14px;"></div>
    `;

    renderList();

    // Қойындыларды ауыстыру
    container.querySelectorAll('[data-dtab]').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.getAttribute('data-dtab');
        container.querySelectorAll('[data-dtab]').forEach(b => {
          b.className = b.getAttribute('data-dtab') === activeTab ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
        });
        renderList();
      };
    });

    // Менің күнделігім / Сынып қабырғасы қосқышы
    const myBtn = container.querySelector('#scope-btn-my');
    if (myBtn) {
      myBtn.onclick = () => {
        currentScope = 'my';
        activeTab = 'all';
        renderContent();
      };
    }
    const classBtn = container.querySelector('#scope-btn-class');
    if (classBtn) {
      classBtn.onclick = () => {
        currentScope = 'class';
        activeTab = 'all';
        renderContent();
      };
    }

    container.querySelector('#btn-add-quote').onclick = () => openAddQuoteModal(availableBooks, () => renderDiaryView(container));
    container.querySelector('#btn-record-audio').onclick = () => openAddAudioModal(availableBooks, () => renderDiaryView(container));
  }

  renderContent();
}

function renderDiaryCard(item, isClassView = false) {
  const isQuote = item.kind === 'quote';
  const isAudio = item.kind === 'audio';
  const dateStr = item.created_at ? item.created_at.slice(0, 10) : '';

  const avatarEmoji = {
    fox: '🦊',
    owl: '🦉',
    bear: '🐻',
    wolf: '🐺',
    horse: '🐎',
    eagle: '🦅',
    cat: '🐱',
    panda: '🐼'
  }[item.student_avatar] || '📖';

  return `
    <div class="card" style="padding:16px; margin-bottom:0; border-left:4px solid ${isQuote ? 'var(--accent-gold)' : isAudio ? '#3b82f6' : 'var(--primary-green)'}; transition:transform 0.2s ease, box-shadow 0.2s ease;">
      ${(isClassView || item.student_nickname) ? `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--border-color); flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:50%; background:var(--bg-soft); display:flex; align-items:center; justify-content:center; font-size:20px; border:1px solid var(--border-color);">
              ${avatarEmoji}
            </div>
            <div>
              <div style="font-weight:700; font-size:14px; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                <span>${item.student_nickname || 'Оқушы'}</span>
                ${item.is_own ? '<span class="badge" style="background:#dcfce7; color:#166534; font-size:10px; padding:2px 6px;">Сіздің жазбаңыз</span>' : ''}
              </div>
              <div style="font-size:11px; color:var(--text-muted);">${dateStr} · 11А сынып</div>
            </div>
          </div>
          <span class="badge" style="background:var(--bg-soft); color:var(--text-main); font-weight:600; font-size:12px; border:1px solid var(--border-color);">
            📖 «${item.book_title}»
          </span>
        </div>
      ` : `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">${isQuote ? '✨' : isAudio ? '🎙️' : '💡'}</span>
            <span style="font-weight:700; font-size:14px; color:var(--text-main);">
              ${isQuote ? 'Кітаптан дәйексөз' : isAudio ? 'Аудио-рефлексия' : 'Оқырман ойы'}
            </span>
            <span class="badge" style="background:var(--bg-soft); color:var(--text-muted); font-size:11px;">
              «${item.book_title}»
            </span>
          </div>
          <span style="font-size:11px; color:var(--text-muted);">${dateStr}</span>
        </div>
      `}

      ${isQuote ? `
        <blockquote style="margin:8px 0; padding:12px 16px; background:#fffcf2; border-left:3px solid var(--accent-gold); border-radius:4px; font-style:italic; font-size:14px; line-height:1.6; color:#78350f;">
          «${item.text}»
        </blockquote>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:12px; color:var(--text-muted); margin-top:6px; flex-wrap:wrap;">
          <div>
            ${item.thoughts ? `<span style="font-style:normal; color:var(--text-main);">💭 <em>«${item.thoughts}»</em></span>` : ''}
          </div>
          <div style="display:flex; gap:8px;">
            ${item.quote_author ? `<span>— <strong>${item.quote_author}</strong></span>` : ''}
            ${item.page ? `<span>(${item.page}-бет)</span>` : ''}
          </div>
        </div>
      ` : isAudio ? `
        <div style="margin:10px 0; background:#f0f9ff; border:1px solid #bae6fd; border-radius:var(--radius-sm); padding:12px;">
          <div style="font-size:13px; font-weight:600; color:#0369a1; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <span>🎵 Дауыстық пікір:</span>
            <span style="font-size:11px; color:var(--text-muted);">${item.text}</span>
          </div>
          ${item.audio_url ? `
            <audio controls src="${item.audio_url}" style="width:100%; height:36px;"></audio>
          ` : `
            <div style="font-size:12px; color:var(--text-muted); font-style:italic;">
              (Дауыстық жазба сақталды)
            </div>
          `}
        </div>
      ` : `
        <div style="font-size:14px; line-height:1.6; color:var(--text-main); margin:6px 0; background:var(--bg-soft); padding:12px; border-radius:6px;">
          ${item.text}
        </div>
        ${item.page ? `<div style="font-size:11px; color:var(--text-muted); text-align:right;">${item.page}-бетті оқығаннан кейін</div>` : ''}
      `}

      ${(isClassView || item.student_nickname) ? `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px dashed var(--border-color); font-size:12px;">
          <span style="color:var(--text-muted);">Автор: <strong>${item.book_author || 'Қазақ әдебиеті'}</strong></span>
          <button class="btn btn-sm btn-secondary btn-diary-like" data-id="${item.id}" style="padding:4px 12px; border-radius:14px; font-size:12px;">
            ❤️ Ұнады <span class="like-num">1</span>
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function openAddQuoteModal(books, onSaved) {
  if (books.length === 0) {
    showToast('Алдымен кітап сөресінен кітап таңдаңыз!', 'error');
    return;
  }

  openModal({
    title: '✨ Кітаптан дәйексөз (цитата) қосу',
    bodyHtml: `
      <div class="form-group">
        <label class="form-label">Кітапты таңдаңыз</label>
        <select class="form-select" id="inp-quote-book">
          ${(books || []).map(b => `<option value="${b?.id || 1}">${b?.title || 'Кітап'} (${b?.author || ''})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ұнаған дәйексөз немесе нақыл сөз</label>
        <textarea class="form-textarea" id="inp-quote-text" rows="3" placeholder="Мысалы: Тек жүрекпен ғана анық көруге болады..." required></textarea>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div class="form-group">
          <label class="form-label">Кейіпкер немесе автор</label>
          <input type="text" class="form-input" id="inp-quote-author" placeholder="Мысалы: Түлкі">
        </div>
        <div class="form-group">
          <label class="form-label">Бет нөмірі (міндетті емес)</label>
          <input type="number" class="form-input" id="inp-quote-page" placeholder="Мысалы: 24">
        </div>
      </div>
      <div class="form-help">
        💡 Дәйексөз қосу арқылы сен сөз қазынаңды молайтасың және <strong>+5 XP</strong> жинайсың!
      </div>
    `,
    saveText: 'Күнделікке қосу (+5 XP)',
    onSave: async (modalEl) => {
      const book_id = Number(modalEl.querySelector('#inp-quote-book').value);
      const text = modalEl.querySelector('#inp-quote-text').value.trim();
      const quote_author = modalEl.querySelector('#inp-quote-author').value.trim();
      const page = modalEl.querySelector('#inp-quote-page').value;

      if (!text) {
        showToast('Дәйексөз мәтінін жазыңыз!', 'error');
        return false;
      }

      try {
        await api.addDiaryEntry({
          book_id,
          kind: 'quote',
          text,
          quote_author,
          page: page ? Number(page) : null
        });
        showToast('Дәйексөз күнделікке сақталды! +5 XP', 'success');
        onSaved();
        return true;
      } catch (err) {
        showToast(err.message || 'Сақтау қатесі', 'error');
        return false;
      }
    }
  });
}

function openAddAudioModal(books, onSaved) {
  if (books.length === 0) {
    showToast('Алдымен кітап сөресінен кітап таңдаңыз!', 'error');
    return;
  }

  let mediaRecorder = null;
  let audioChunks = [];
  let audioBlob = null;
  let audioBase64 = null;
  let recordTimer = null;
  let seconds = 0;

  openModal({
    title: '🎙️ Аудио-рефлексия жазу',
    bodyHtml: `
      <div class="form-group">
        <label class="form-label">Кітапты таңдаңыз</label>
        <select class="form-select" id="inp-audio-book">
          ${(books || []).map(b => `<option value="${b?.id || 1}">${b?.title || 'Кітап'} (${b?.author || ''})</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Аудио тақырыбы / қысқаша түйін</label>
        <input type="text" class="form-input" id="inp-audio-title" placeholder="Мысалы: Кейіпкердің ерлігі туралы менің ойым" value="Оқыған бөлім туралы пікірім">
      </div>

      <div style="background:var(--bg-soft); border:2px dashed var(--border-color); border-radius:var(--radius-sm); padding:20px; text-align:center; margin-bottom:12px;">
        <div id="rec-status-icon" style="font-size:36px; margin-bottom:8px;">🎙️</div>
        <div id="rec-status-text" style="font-weight:700; font-size:14px; color:var(--text-main); margin-bottom:6px;">
          Микрофонға сөйлеуге дайын
        </div>
        <div id="rec-timer" style="font-size:20px; font-weight:800; font-family:monospace; color:var(--primary-green); margin-bottom:12px;">
          00:00
        </div>

        <div style="display:flex; justify-content:center; gap:10px; margin-bottom:12px;">
          <button type="button" class="btn btn-accent" id="btn-start-record">
            🔴 Жазуды бастау
          </button>
          <button type="button" class="btn btn-secondary" id="btn-stop-record" style="display:none;">
            ⏹️ Тоқтату
          </button>
        </div>

        <div id="audio-preview-wrap" style="display:none; margin-top:10px;">
          <div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Жазылған аудионы тыңдау:</div>
          <audio id="audio-preview-player" controls style="width:100%; height:36px;"></audio>
        </div>
      </div>

      <div class="form-help">
        💡 Оқыған үзіндіңіз туралы 15-60 секунд өз сөзіңізбен ой айтып жазыңыз (+5 XP)
      </div>
    `,
    saveText: 'Күнделікке сақтау (+5 XP)',
    onSave: async (modalEl) => {
      const book_id = Number(modalEl.querySelector('#inp-audio-book').value);
      const text = modalEl.querySelector('#inp-audio-title').value.trim() || 'Аудио-рефлексия';

      try {
        await api.addDiaryEntry({
          book_id,
          kind: 'audio',
          text,
          audio_url: audioBase64 || null
        });
        showToast('Аудио-рефлексия сәтті сақталды! +5 XP', 'success');
        onSaved();
        return true;
      } catch (err) {
        showToast(err.message || 'Сақтау қатесі', 'error');
        return false;
      }
    }
  });

  setTimeout(() => {
    const startBtn = document.getElementById('btn-start-record');
    const stopBtn = document.getElementById('btn-stop-record');
    const statusText = document.getElementById('rec-status-text');
    const statusIcon = document.getElementById('rec-status-icon');
    const timerEl = document.getElementById('rec-timer');
    const previewWrap = document.getElementById('audio-preview-wrap');
    const previewPlayer = document.getElementById('audio-preview-player');

    if (!startBtn) return;

    startBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          if (previewPlayer) previewPlayer.src = audioUrl;
          if (previewWrap) previewWrap.style.display = 'block';

          const reader = new FileReader();
          reader.onloadend = () => {
            audioBase64 = reader.result;
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        seconds = 0;
        recordTimer = setInterval(() => {
          seconds++;
          const m = String(Math.floor(seconds / 60)).padStart(2, '0');
          const s = String(seconds % 60).padStart(2, '0');
          if (timerEl) timerEl.textContent = `${m}:${s}`;
        }, 1000);

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        statusText.textContent = 'Дауыс жазылып жатыр... Сөйлей беріңіз!';
        statusIcon.textContent = '🔴';
      } catch (err) {
        showToast('Микрофонға рұқсат берілмеді немесе табылмады.', 'error');
        statusText.textContent = 'Микрофон қолжетімсіз (Мәтіндік пікір ретінде сақталады)';
      }
    };

    if (stopBtn) {
      stopBtn.onclick = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        clearInterval(recordTimer);
        startBtn.style.display = 'inline-flex';
        startBtn.textContent = '🔄 Қайта жазу';
        stopBtn.style.display = 'none';
        statusText.textContent = 'Жазу аяқталды! Төменнен тыңдап көре аласыз:';
        statusIcon.textContent = '✅';
      };
    }
  }, 100);
}
