// Мәтінді оқу көрінісі (Reader) — Кәсіби EdTech құралдарымен (Таймер, Сөздік, Қаріп, Түнгі режим)
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal } from '../ui.js';

let readingSeconds = 0;
let readingInterval = null;

// Әдеби түсіндірме сөздік қоры
const LITERARY_GLOSSARY = [
  { word: 'Алтын сақа', desc: 'Қорғасын құйылған, алтынмен апталған асықтың ардақты түрі. Ертегілерде құдіреттілік пен балалық шақтың нышаны.' },
  { word: 'Апан', desc: 'Қасқыр, түлкі секілді түз аңдарының табиғи ін-ұясы, күшіктерін өсіретін жасырын орны.' },
  { word: 'Бекзат', desc: 'Тегі асыл, мінезі көркем, тәрбиелі әрі мәдениетті адам.' },
  { word: 'Бөлтірік', desc: 'Қасқырдың жас күшігі.' },
  { word: 'Жусан', desc: 'Қазақ даласының хош иісті, дәрілік көпжылдық өсімдігі. Шығармаларда туған жер мен сағыныштың белгісі.' },
  { word: 'Жыра', desc: 'Су ағыны мен жаңбырдан пайда болған терең сай-сала, ойпатты жер.' },
  { word: 'Көксерек', desc: 'Көк жүнді, ерекше батыр әрі қатал түз бөрісіне берілетін атау.' },
  { word: 'Қарасөз', desc: 'Абай Құнанбайұлының ғылым, дін, адамгершілік пен қоғам жайлы жазған философиялық қарасөздері.' },
  { word: 'Парасат', desc: 'Терең ақыл, кемеңгерлік, жақсы мен жаманды ажырата білетін жоғары рухани сана.' },
  { word: 'Тұлпар', desc: 'Жүйрік, батырлар мінетін қанатты сәйгүлік ат.' },
  { word: 'Түз тағысы', desc: 'Қолға үйренбейтін, далада еркін өскен жабайы аң (қасқыр, бүркіт т.б.).' }
];

export async function renderReaderView(container, bookId, chapterIdx = 1) {
  if (readingInterval) {
    clearInterval(readingInterval);
    readingInterval = null;
  }
  readingSeconds = 0;

  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">Мәтін жүктелуде...</p>
    </div>
  `;

  try {
    const data = await api.getChapter(bookId, chapterIdx);
    renderContent(container, data, bookId, Number(chapterIdx));
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
  }
}

function renderContent(container, data, bookId, chapterIdx) {
  const { book, chapter, count, shelf } = data;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
      <a href="#/book/${bookId}" class="btn btn-secondary btn-sm">← Кітапқа оралу</a>
      
      <!-- Оқу таймері -->
      <div id="reader-timer-badge" style="background:var(--bg-soft); border:1px solid var(--border-color); padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:6px;">
        <span>⏱️ Оқу уақыты:</span> <span id="timer-display" style="color:var(--primary-green);">00:00</span>
      </div>

      <!-- Баптаулар: қаріп және режим -->
      <div style="display:flex; align-items:center; gap:6px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-reader-glossary" title="Әдеби сөздік көмекшісі">
          📖 Сөздік
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-font-dec" title="Қаріпті кішірейту">A-</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-font-inc" title="Қаріпті үлкейту">A+</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-theme-toggle" title="Оқу реңкін ауыстыру (Ашық / Сепия / Түнгі)">🎨</button>
      </div>
    </div>

    <!-- Мәтін карточкасы -->
    <div class="card reader-paper" id="reader-text-card" style="padding: 36px 30px; max-width:760px; margin:0 auto 24px auto; transition:all 0.3s ease; box-shadow:0 4px 20px rgba(0,0,0,0.06);">
      <div style="border-bottom:1px solid var(--border-color); padding-bottom:14px; margin-bottom:24px;">
        <div style="font-size:12px; color:var(--primary-green); font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">
          ${book?.title || 'Кітап'} • ${chapter?.page_start || 1}-${chapter?.page_end || 1} беттер
        </div>
        <h2 style="font-size:24px; font-weight:800; margin-top:6px; color:var(--text-main);">${chapter?.title || 'Бөлім'}</h2>
      </div>

      <div id="reader-body-text" style="font-size:17px; line-height:1.8; color:#1f2937; white-space:pre-line; font-family:Georgia, serif;">
        ${chapter.body}
      </div>

      <!-- Бөлім соңындағы әрекеттер -->
      <div style="border-top:1px solid var(--border-color); padding-top:20px; margin-top:34px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <button class="btn btn-accent" id="btn-quick-log">
          ✍️ Осы бөлімді оқыдым деп белгілеу (${chapter.page_end}-бет)
        </button>

        <div style="display:flex; gap:8px;">
          ${chapterIdx > 1 ? `
            <a href="#/read/${bookId}/${chapterIdx - 1}" class="btn btn-secondary btn-sm">
              ← Алдыңғы бөлім
            </a>
          ` : ''}
          ${chapterIdx < count ? `
            <a href="#/read/${bookId}/${chapterIdx + 1}" class="btn btn-primary btn-sm">
              Келесі бөлім →
            </a>
          ` : `
            <a href="#/play" class="btn btn-primary btn-sm">
              🎯 Ойын алаңына өту
            </a>
          `}
        </div>
      </div>
    </div>
  `;

  // Таймерді іске қосу
  const timerDisplay = container.querySelector('#timer-display');
  readingInterval = setInterval(() => {
    readingSeconds++;
    const m = Math.floor(readingSeconds / 60);
    const s = readingSeconds % 60;
    if (timerDisplay) {
      timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
  }, 1000);

  // Қаріп өлшемін баптау
  let currentFontSize = 17;
  const bodyText = container.querySelector('#reader-body-text');
  container.querySelector('#btn-font-inc').onclick = () => {
    if (currentFontSize < 24) {
      currentFontSize += 2;
      bodyText.style.fontSize = `${currentFontSize}px`;
    }
  };
  container.querySelector('#btn-font-dec').onclick = () => {
    if (currentFontSize > 13) {
      currentFontSize -= 2;
      bodyText.style.fontSize = `${currentFontSize}px`;
    }
  };

  // Реңктерді ауыстыру (Light / Sepia / Night)
  let currentThemeIdx = 0;
  const themes = [
    { bg: '#ffffff', text: '#1f2937' },
    { bg: '#fbf0d9', text: '#5c3d1e' }, // Сепия
    { bg: '#1e293b', text: '#e2e8f0' }  // Түнгі режим
  ];
  const cardEl = container.querySelector('#reader-text-card');
  container.querySelector('#btn-theme-toggle').onclick = () => {
    currentThemeIdx = (currentThemeIdx + 1) % themes.length;
    const th = themes[currentThemeIdx];
    cardEl.style.backgroundColor = th.bg;
    bodyText.style.color = th.text;
  };

  // Сөздік көмекшісі модалі
  container.querySelector('#btn-reader-glossary').onclick = () => {
    openModal({
      title: '📖 Кітап оқылымына арналған сөздік көмекшісі',
      bodyHtml: `
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
          Мәтіндерде кездесетін қазақы көнерген, тарихи және сирек сөздердің түсіндірме анықтамалығы:
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; padding-right:6px;">
          ${LITERARY_GLOSSARY.map(g => `
            <div style="background:var(--bg-soft); padding:10px 14px; border-radius:6px; border-left:3px solid var(--primary-green);">
              <div style="font-weight:800; font-size:14px; color:var(--primary-green); margin-bottom:2px;">
                ${g.word}
              </div>
              <div style="font-size:13px; color:var(--text-main); line-height:1.4;">
                ${g.desc}
              </div>
            </div>
          `).join('')}
        </div>
      `
    });
  };

  // Оқуды белгілеу батырмасы
  const quickLogBtn = container.querySelector('#btn-quick-log');
  if (quickLogBtn) {
    quickLogBtn.onclick = () => {
      const estimatedMinutes = Math.max(5, Math.ceil(readingSeconds / 60));

      openModal({
        title: t('log_modal_title'),
        bodyHtml: `
          <div class="form-group">
            <label class="form-label">${t('log_last_page')}</label>
            <input type="number" class="form-input" id="inp-r-page" value="${chapter.page_end}" min="1" max="${book.total_pages || 5000}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('log_minutes')} (таймер бойынша)</label>
            <input type="number" class="form-input" id="inp-r-minutes" value="${estimatedMinutes}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('log_note')}</label>
            <textarea class="form-textarea" id="inp-r-note" rows="2" placeholder="Осы бөлімнен нені байқадың?"></textarea>
          </div>
        `,
        saveText: t('log_save_btn'),
        onSave: async (modalEl) => {
          const page = Number(modalEl.querySelector('#inp-r-page').value);
          const minutes = Number(modalEl.querySelector('#inp-r-minutes').value) || null;
          const note = modalEl.querySelector('#inp-r-note').value;
          try {
            const res = await api.addLog(bookId, { page, minutes, note });
            showToast(`Оқу белгіленді! +${res.xp_awarded} XP`, 'success');
            return true;
          } catch (err) {
            showToast(`Қате: ${err.message}`, 'error');
            return false;
          }
        }
      });
    };
  }
}
