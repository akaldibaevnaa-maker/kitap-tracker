// ==============================================================================
// «ОҚЫРМАН КҮНДЕЛІГІ» — 3D GAMIFIED ELECTRONIC READING DIARY & CALENDAR
// Иллюстрацияланған күнтізбе, талдау парақтары, дәйексөздер мен аудио-рефлексия
// ==============================================================================
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal } from '../ui.js';
import { generateQrSvg } from '../qr.js';
import { generateMascotSvg } from '../mascot.js';

export async function renderDiaryView(container) {
  container.innerHTML = `
    <div style="text-align:center; padding: 50px 20px;">
      <div style="font-size:36px; animation:treeSway 1s infinite alternate;">📖</div>
      <p style="color:var(--text-muted); font-weight:700; margin-top:10px;">${t('diary_title')} жүктелуде...</p>
    </div>
  `;

  try {
    const [diaryData, shelfData, diaryBooksData] = await Promise.all([
      api.getDiary(),
      api.getShelf(),
      api.getDiaryBooks()
    ]);
    renderDiaryLayout(container, diaryData, shelfData, diaryBooksData?.entries || []);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color); padding:20px; font-weight:700;">Қате: ${err.message}</div>`;
  }
}

function renderDiaryLayout(container, diaryData, shelfData, diaryBooks) {
  let mainMode = 'calendar'; // 'calendar' | 'electronic_cards' | 'quotes_feed'
  let currentScope = 'my'; // 'my' | 'class'
  let activeTab = 'all';

  // Күнтізбе күйі
  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth(); // 0-11
  let selectedDateStr = now.toISOString().slice(0, 10);

  const { entries = [], class_entries = [], stats = {} } = diaryData;
  const availableBooks = [
    ...(shelfData.reading || []),
    ...(shelfData.finished || []),
    ...(shelfData.want || [])
  ];

  // URL-де ?bookId= белгіленген болса, автоматты түрде сол кітаптың күнделігін ашу
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const autoBookId = urlParams.get('bookId');
  if (autoBookId) {
    setTimeout(() => {
      openBookDiaryModal(Number(autoBookId), availableBooks, () => renderDiaryView(container));
    }, 200);
  }

  // Күндер бойынша жазбаларды картаға түсіру (YYYY-MM-DD -> [entries])
  const dateEntriesMap = {};
  function addEntryToDate(dateStr, entry) {
    if (!dateStr) return;
    const cleanDate = dateStr.slice(0, 10);
    if (!dateEntriesMap[cleanDate]) dateEntriesMap[cleanDate] = [];
    dateEntriesMap[cleanDate].push(entry);
  }

  entries.forEach(e => {
    addEntryToDate(e.log_date || e.created_at, e);
  });

  diaryBooks.forEach(b => {
    if (b.finish_date) {
      addEntryToDate(b.finish_date, {
        kind: 'finished_book',
        title: b.title,
        book_title: b.title,
        author: b.author,
        pages: b.total_pages,
        opinion: b.opinion,
        impression: b.impression,
        summary: b.summary,
        favorite_character: b.favorite_character,
        rating: b.rating
      });
    } else if (b.start_date) {
      addEntryToDate(b.start_date, {
        kind: 'started_book',
        title: b.title,
        book_title: b.title,
        author: b.author,
        pages: b.pages_read,
        opinion: b.opinion
      });
    }
  });

  const monthNamesKk = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];
  const weekDaysKk = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн', 'Жк'];

  // -------------------------------------------------------------
  // 1. ИЛЛЮСТРАЦИЯЛАНҒАН 3D ОҚУ КҮНТІЗБЕСІ (CALENDAR VIEW)
  // -------------------------------------------------------------
  function renderCalendarView() {
    const contentArea = container.querySelector('#diary-content-area');
    if (!contentArea) return;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Дүйсенбіден бастау (0: Дс, 6: Жк)

    // Алдыңғы айдың күндері
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    // Осы айдағы оқылған күндер саны
    let activeDaysCount = 0;
    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (dateEntriesMap[dStr] && dateEntriesMap[dStr].length > 0) activeDaysCount++;
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    contentArea.innerHTML = `
      <div class="reading-calendar-box">
        <!-- Күнтізбе тақырыбы мен айларды ауыстыру -->
        <div class="calendar-month-bar">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:32px;">📅</div>
            <div>
              <h2 style="font-size:22px; font-weight:900; color:var(--text-main); margin:0;">
                ${monthNamesKk[currentMonth]} ${currentYear} ж.
              </h2>
              <div style="font-size:12.5px; color:#166534; font-weight:700; margin-top:2px;">
                Осы айдағы белсенді оқу күндері: <strong>${activeDaysCount} күн</strong> 🌟
              </div>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn-3d btn-3d-yellow" id="btn-prev-month" style="padding:6px 14px; font-size:12px;">
              ← Алдыңғы ай
            </button>
            <button class="btn-3d btn-3d-yellow" id="btn-today-month" style="padding:6px 14px; font-size:12px;">
              Бүгін
            </button>
            <button class="btn-3d btn-3d-yellow" id="btn-next-month" style="padding:6px 14px; font-size:12px;">
              Келесі ай →
            </button>
          </div>
        </div>

        <!-- Апта күндері -->
        <div class="calendar-weekdays-row">
          ${weekDaysKk.map(w => `<div>${w}</div>`).join('')}
        </div>

        <!-- Күндер торы (Days Grid) -->
        <div class="calendar-days-grid">
          <!-- Алдыңғы айдың қалған күндері -->
          ${Array.from({ length: startingDayOfWeek }).map((_, idx) => {
            const dayNum = prevMonthLastDay - startingDayOfWeek + idx + 1;
            return `<div class="calendar-day-cell other-month"><div class="day-num-label">${dayNum}</div></div>`;
          }).join('')}

          <!-- Ағымдағы айдың күндері -->
          ${Array.from({ length: totalDays }).map((_, idx) => {
            const dayNum = idx + 1;
            const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayEntries = dateEntriesMap[dStr] || [];
            const hasReading = dayEntries.length > 0;
            const isToday = dStr === todayStr;
            const isSelected = dStr === selectedDateStr;

            return `
              <div class="calendar-day-cell ${hasReading ? 'has-reading' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'is-today' : ''}" data-date="${dStr}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="day-num-label" style="${isSelected ? 'color:#15803d;' : ''}">${dayNum}</span>
                  ${isToday ? '<span style="font-size:10px; background:#fef08a; color:#854d0e; padding:1px 5px; border-radius:6px; font-weight:800;">Бүгін</span>' : ''}
                </div>
                ${hasReading ? `
                  <div class="calendar-day-badge">
                    📖 ${dayEntries.length} жазба
                  </div>
                ` : `
                  <div style="height:16px;"></div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ТАҢДАЛҒАН КҮННІҢ ТОЛЫҚ ОҚУ ТАРИХЫ ПАНЕЛІ -->
      <div class="selected-day-history-panel" id="selected-day-panel">
        ${renderSelectedDateDetails(selectedDateStr)}
      </div>
    `;

    // Оқиғаларды байлау
    contentArea.querySelector('#btn-prev-month').onclick = () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendarView();
    };

    contentArea.querySelector('#btn-today-month').onclick = () => {
      const now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
      selectedDateStr = now.toISOString().slice(0, 10);
      renderCalendarView();
    };

    contentArea.querySelector('#btn-next-month').onclick = () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendarView();
    };

    contentArea.querySelectorAll('.calendar-day-cell[data-date]').forEach(cell => {
      cell.onclick = () => {
        selectedDateStr = cell.getAttribute('data-date');
        renderCalendarView();
      };
    });
  }

  function renderSelectedDateDetails(dateStr) {
    const dayEntries = dateEntriesMap[dateStr] || [];
    const formattedDate = dateStr;

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; border-bottom:2px solid #f1f5f9; padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:24px;">🗓️</span>
          <div>
            <h3 style="font-size:18px; font-weight:900; color:var(--text-main); margin:0;">
              ${formattedDate} күнгі оқу жазбалары
            </h3>
            <span style="font-size:12px; color:var(--text-muted); font-weight:700;">
              Барлығы: ${dayEntries.length} белсенділік
            </span>
          </div>
        </div>

        <div style="display:flex; gap:8px;">
          <button class="btn-3d btn-3d-green" id="btn-add-log-for-day" style="padding:7px 16px; font-size:12px;">
            ✍️ Жаңа күнделік жазбасы
          </button>
        </div>
      </div>

      ${dayEntries.length === 0 ? `
        <div style="text-align:center; padding:32px 16px; color:var(--text-muted);">
          <div style="font-size:36px; margin-bottom:8px;">📖</div>
          <div style="font-size:15px; font-weight:800; color:var(--text-main); margin-bottom:4px;">
            Бұл күні оқу жазбасы тіркелмеген
          </div>
          <p style="font-size:13px; max-width:420px; margin:0 auto 14px auto;">
            Оқыған беттеріңізді, дәйексөздеріңізді немесе кітаптан алған әсеріңізді жазып, күнделік парағын толтырыңыз!
          </p>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${dayEntries.map(e => `
            <div class="card" style="margin-bottom:0; padding:16px; border-left:5px solid ${e.kind === 'quote' ? 'var(--warm-yellow)' : e.kind === 'finished_book' ? '#10b981' : 'var(--primary-green)'}; box-shadow:0 4px 12px rgba(38,55,70,0.05);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:18px;">${e.kind === 'finished_book' ? '🏆' : e.kind === 'quote' ? '💬' : '📖'}</span>
                  <strong style="font-size:15px; color:var(--text-main);">${e.book_title || e.title || 'Кітап'}</strong>
                  ${e.author ? `<span style="font-size:12px; color:var(--text-muted);">(${e.author})</span>` : ''}
                </div>
                ${e.page ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:800;">${e.page}-бет</span>` : ''}
              </div>

              ${e.text ? `
                <div style="font-size:13.5px; color:#334155; line-height:1.5; font-style:${e.kind === 'quote' ? 'italic' : 'normal'}; background:#f8fafc; padding:10px 12px; border-radius:8px; margin-top:6px;">
                  ${e.kind === 'quote' ? `«${e.text}»` : e.text}
                </div>
              ` : ''}

              ${e.opinion ? `
                <div style="font-size:12.5px; color:#15803d; margin-top:6px; font-weight:700;">
                  💬 Пікір: <em>«${e.opinion}»</em>
                </div>
              ` : ''}

              ${e.favorite_character ? `
                <div style="font-size:12px; color:#7e22ce; margin-top:4px; font-weight:700;">
                  🎭 Кейіпкер: ${e.favorite_character}
                </div>
              ` : ''}

              ${e.summary ? `
                <div style="font-size:12px; color:#b45309; margin-top:4px;">
                  📝 Қорытынды: ${e.summary}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `}
    `;
  }

  // -------------------------------------------------------------
  // 2. ЭЛЕКТРОНДЫ КҮНДЕЛІК ПАРАҚТАРЫ (CARDS VIEW)
  // -------------------------------------------------------------
  function renderElectronicDiaryCards() {
    const contentArea = container.querySelector('#diary-content-area');
    if (!contentArea) return;

    if (!diaryBooks.length) {
      contentArea.innerHTML = `
        <div class="card" style="text-align:center; padding:40px; color:var(--text-muted); border-radius:var(--radius-lg); border:2px dashed #cbd5e1;">
          <div style="font-size:46px; margin-bottom:12px;">📖</div>
          <h3 style="font-size:20px; font-weight:900; color:var(--text-main); margin-bottom:8px;">
            Электронды күнделікке әзірге кітап тіркелмеген
          </h3>
          <p style="font-size:14px; max-width:480px; margin:0 auto 18px auto; line-height:1.5;">
            Оқыған немесе оқып жатқан кітаптарыңыз бойынша өз ойыңызды, ұнаған кейіпкеріңізді және алған әсеріңізді жазып, жеке оқырман күнделігіңізді қалыптастырыңыз!
          </p>
          <button class="btn-3d btn-3d-green" id="btn-empty-start-diary">
            ➕ Кітап бойынша күнделік бастау
          </button>
        </div>
      `;
      const btn = contentArea.querySelector('#btn-empty-start-diary');
      if (btn) btn.onclick = () => openSelectBookForDiaryModal(availableBooks, () => renderDiaryView(container));
      return;
    }

    contentArea.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:20px;">
        ${diaryBooks.map(b => renderElectronicBookCard(b)).join('')}
      </div>
    `;

    // Өңдеу батырмалары
    contentArea.querySelectorAll('.btn-edit-book-diary').forEach(btn => {
      btn.onclick = () => {
        const bookId = Number(btn.getAttribute('data-id'));
        openBookDiaryModal(bookId, availableBooks, () => renderDiaryView(container));
      };
    });
  }

  // -------------------------------------------------------------
  // 3. ДӘЙЕКСӨЗДЕР МЕН ПІКІРЛЕР ҚАБЫРҒАСЫ (QUOTES FEED)
  // -------------------------------------------------------------
  function renderQuotesFeed() {
    const contentArea = container.querySelector('#diary-content-area');
    if (!contentArea) return;

    const sourceList = currentScope === 'my' ? entries : class_entries;
    let filtered = sourceList;
    if (activeTab === 'quotes') filtered = sourceList.filter(e => e.kind === 'quote');
    else if (activeTab === 'audio') filtered = sourceList.filter(e => e.kind === 'audio');
    else if (activeTab === 'notes') filtered = sourceList.filter(e => e.kind === 'note' || e.kind === 'reflection');

    contentArea.innerHTML = `
      <!-- Статистика карточкалары (Менің жазбаларым үшін) -->
      ${currentScope === 'my' ? `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px; margin-bottom:20px;">
          <div class="card" style="padding:16px; margin-bottom:0; border-top:4px solid var(--primary-green); display:flex; align-items:center; gap:14px; border-radius:var(--radius-md); box-shadow:0 4px 12px rgba(35,132,81,0.08);">
            <div style="font-size:32px;">📚</div>
            <div>
              <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Барлық жазбам</div>
              <div style="font-size:22px; font-weight:900; color:var(--primary-green);">${stats.total || entries.length}</div>
            </div>
          </div>
          <div class="card" style="padding:16px; margin-bottom:0; border-top:4px solid var(--warm-yellow); display:flex; align-items:center; gap:14px; border-radius:var(--radius-md); box-shadow:0 4px 12px rgba(255,211,106,0.15);">
            <div style="font-size:32px;">💬</div>
            <div>
              <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Дәйексөздер</div>
              <div style="font-size:22px; font-weight:900; color:#d97706;">${stats.quotes || 0}</div>
            </div>
          </div>
          <div class="card" style="padding:16px; margin-bottom:0; border-top:4px solid #3b82f6; display:flex; align-items:center; gap:14px; border-radius:var(--radius-md); box-shadow:0 4px 12px rgba(59,130,246,0.08);">
            <div style="font-size:32px;">🎙️</div>
            <div>
              <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Аудио-рефлексия</div>
              <div style="font-size:22px; font-weight:900; color:#2563eb;">${stats.audio || 0}</div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Ішкі сүзгілер -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
        <div style="display:flex; gap:8px;">
          <button class="filter-chip ${activeTab === 'all' ? 'active' : ''} btn-sub-filter" data-tab="all">Барлығы</button>
          <button class="filter-chip ${activeTab === 'quotes' ? 'active' : ''} btn-sub-filter" data-tab="quotes">💬 Дәйексөздер</button>
          <button class="filter-chip ${activeTab === 'audio' ? 'active' : ''} btn-sub-filter" data-tab="audio">🎙️ Аудио</button>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-3d ${currentScope === 'my' ? 'btn-3d-green' : 'btn-3d-yellow'}" id="btn-scope-my" style="padding:6px 14px; font-size:12px;">👤 Менің жазбаларым</button>
          <button class="btn-3d ${currentScope === 'class' ? 'btn-3d-green' : 'btn-3d-yellow'}" id="btn-scope-class" style="padding:6px 14px; font-size:12px;">👥 Сынып қабырғасы</button>
        </div>
      </div>

      <!-- Жазбалар тізімі -->
      <div id="quotes-entries-list" style="display:flex; flex-direction:column; gap:14px;">
        ${filtered.length ? filtered.map(item => renderDiaryCard(item, currentScope === 'class')).join('') : `
          <div class="card" style="text-align:center; padding:36px; color:var(--text-muted); border-radius:var(--radius-lg);">
            Жазбалар табылмады.
          </div>
        `}
      </div>
    `;

    // Ішкі сүзгілер
    contentArea.querySelectorAll('.btn-sub-filter').forEach(b => {
      b.onclick = () => {
        activeTab = b.getAttribute('data-tab');
        renderQuotesFeed();
      };
    });

    const bMy = contentArea.querySelector('#btn-scope-my');
    if (bMy) {
      bMy.onclick = () => {
        currentScope = 'my';
        renderQuotesFeed();
      };
    }
    const bCls = contentArea.querySelector('#btn-scope-class');
    if (bCls) {
      bCls.onclick = () => {
        currentScope = 'class';
        renderQuotesFeed();
      };
    }
  }

  function renderLayout() {
    container.innerHTML = `
      <!-- ЖОҒАРҒЫ БАСТЫ 3D АЙДАР -->
      <div class="card" style="background:linear-gradient(135deg, #176B4D 0%, #238451 100%); color:#fff; padding:24px 22px; margin-bottom:20px; border-radius:var(--radius-lg); border-bottom:5px solid #14532d; box-shadow:0 10px 24px rgba(23,107,77,0.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="font-size:11.5px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#A9DDF5; margin-bottom:4px;">
              №290 орта мектеп · Оқу сауаттылығы · 2026 ж.
            </div>
            <h1 style="font-size:24px; font-weight:900; margin:0 0 6px 0; color:#fff; display:flex; align-items:center; gap:10px;">
              <span>📖</span> ELECTRONIC READING DIARY — ЭЛЕКТРОНДЫ ОҚЫРМАН КҮНДЕЛІГІ
            </h1>
            <p style="margin:0; font-size:13.5px; color:#f0fdf4; max-width:680px; line-height:1.5;">
              Әр оқыған кітабыңыз бойынша кейіпкерлерді талдап, шығармадан алған әсеріңіз бен қорытындыңызды жазыңыз. Электронды портфолиоңызды PDF форматында жүктеп, жеке кітап сөреңізді дамытыңыз!
            </p>
          </div>

          <!-- Басты әрекет түймелері -->
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn-3d btn-3d-yellow" id="btn-download-diary-pdf" style="padding:9px 18px; font-size:12.5px;">
              📥 PDF Портфолио жүктеу
            </button>
            <button class="btn-3d btn-3d-blue" id="btn-add-diary-book" style="padding:9px 18px; font-size:12.5px;">
              ➕ Жаңа кітап қосу
            </button>
          </div>
        </div>
      </div>

      <!-- РЕДИНГ БАДДИ MASCOT ТҮСІНДІРМЕСІ -->
      <div style="display:flex; align-items:center; gap:16px; background:#ffffff; border:2px solid #FFD36A; border-radius:var(--radius-lg); padding:14px 20px; box-shadow:0 6px 18px rgba(255,211,106,0.2); margin-bottom:20px;">
        <div style="flex-shrink:0;">
          ${generateMascotSvg('fox', 'reading', 70)}
        </div>
        <div style="flex:1;">
          <div style="font-size:11px; font-weight:800; color:#d97706; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px;">
            🦊 Kitap Dos оқырман күнделігі туралы:
          </div>
          <div style="font-size:13.5px; font-weight:700; color:var(--text-main); line-height:1.45;">
            Күнделікті оқу жазбалары — сенің интеллектуалды қазынаң! Күнтізбеден оқыған күндеріңді бақылап, кітаптардың түйінді ойларын жадында сақта.
          </div>
        </div>
      </div>

      <!-- БАСТЫ РЕЖИМ ҚОСҚЫШ (3 РЕЖИМ) -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
        <div style="background:#fff; padding:6px; border-radius:14px; display:inline-flex; border:1.5px solid #cbd5e1; gap:6px; box-shadow:0 4px 10px rgba(0,0,0,0.04);">
          <button class="btn-3d ${mainMode === 'calendar' ? 'btn-3d-green' : 'btn-3d-yellow'}" id="btn-mode-calendar" style="font-size:12.5px; padding:7px 16px;">
            📅 Оқу күнтізбесі
          </button>
          <button class="btn-3d ${mainMode === 'electronic_cards' ? 'btn-3d-green' : 'btn-3d-yellow'}" id="btn-mode-cards" style="font-size:12.5px; padding:7px 16px;">
            📖 Электронды күнделік (${diaryBooks.length})
          </button>
          <button class="btn-3d ${mainMode === 'quotes_feed' ? 'btn-3d-green' : 'btn-3d-yellow'}" id="btn-mode-quotes" style="font-size:12.5px; padding:7px 16px;">
            💬 Дәйексөздер қабырғасы (${entries.length})
          </button>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn-3d btn-3d-yellow" id="btn-quick-add-quote" style="padding:7px 16px; font-size:12.5px;">
            ✍️ Дәйексөз жазу
          </button>
          <button class="btn-3d btn-3d-coral" id="btn-quick-add-audio" style="padding:7px 16px; font-size:12.5px;">
            🎙️ Аудио жазу
          </button>
        </div>
      </div>

      <!-- Негізгі мазмұн контейнері -->
      <div id="diary-content-area"></div>
    `;

    // Режим ауыстыру
    container.querySelector('#btn-mode-calendar').onclick = () => {
      mainMode = 'calendar';
      renderLayout();
    };
    container.querySelector('#btn-mode-cards').onclick = () => {
      mainMode = 'electronic_cards';
      renderLayout();
    };
    container.querySelector('#btn-mode-quotes').onclick = () => {
      mainMode = 'quotes_feed';
      renderLayout();
    };

    // PDF жүктеу
    container.querySelector('#btn-download-diary-pdf').onclick = async () => {
      try {
        const res = await api.getDiaryPortfolio();
        openDiaryPortfolioPrintModal(res.portfolio);
      } catch (err) {
        showToast('Портфолионы жүктеу қатесі: ' + err.message, 'error');
      }
    };

    // Жаңа кітап бойынша күнделік толтыру
    container.querySelector('#btn-add-diary-book').onclick = () => {
      openSelectBookForDiaryModal(availableBooks, () => renderDiaryView(container));
    };

    // Дәйексөз / Аудио
    container.querySelector('#btn-quick-add-quote').onclick = () => openAddQuoteModal(availableBooks, () => renderDiaryView(container));
    container.querySelector('#btn-quick-add-audio').onclick = () => openAddAudioModal(availableBooks, () => renderDiaryView(container));

    if (mainMode === 'calendar') {
      renderCalendarView();
    } else if (mainMode === 'electronic_cards') {
      renderElectronicDiaryCards();
    } else {
      renderQuotesFeed();
    }
  }

  renderLayout();
}

// -------------------------------------------------------------
// ЭЛЕКТРОНДЫ КІТАП КАРТАСЫ (БАРЛЫҚ МІНДЕТТІ ӨРІСТЕРІМЕН)
// -------------------------------------------------------------
function renderElectronicBookCard(b) {
  const stars = '⭐'.repeat(Math.max(1, Math.min(5, b.rating || 5)));
  const progressPct = b.total_pages > 0 ? Math.min(100, Math.round((b.pages_read / b.total_pages) * 100)) : 0;
  const isFinished = b.finish_date || b.status === 'finished' || progressPct >= 100;

  return `
    <div class="card electronic-diary-card" style="display:flex; flex-direction:column; justify-content:space-between; border-left:6px solid ${isFinished ? '#10b981' : '#0d9488'}; background:#fff; box-shadow:0 6px 18px rgba(0,0,0,0.06); border-radius:var(--radius-lg); padding:20px; margin-bottom:0;">
      <div>
        <!-- Кітап атауы, автор және QR -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:14px; border-bottom:1px solid #f1f5f9; padding-bottom:12px;">
          <div style="display:flex; gap:12px; align-items:center;">
            <div style="width:48px; height:68px; background:${b.cover_color || '#0d9488'}; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:26px; color:#fff; flex-shrink:0; box-shadow:0 4px 8px rgba(0,0,0,0.15);">
              ${b.cover_emoji || '📖'}
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="badge" style="background:${isFinished ? '#dcfce7; color:#15803d;' : '#e0f2fe; color:#0369a1;'}; font-size:10.5px; font-weight:800;">
                  ${isFinished ? 'Оқылып бітті ✓' : 'Оқу үстінде 📖'}
                </span>
                <span style="font-size:12px;">${stars}</span>
              </div>
              <h3 style="font-size:16px; font-weight:900; margin:4px 0 2px 0; color:var(--text-main); line-height:1.3;">
                ${b.title}
              </h3>
              <div style="font-size:12px; color:var(--text-muted);">
                Автор: <strong>${b.author}</strong>
              </div>
            </div>
          </div>
          <div>
            <span class="badge" style="background:#f1f5f9; color:#475569; font-size:11px; font-weight:700;">
              ${b.genre || 'Көркем әдебиет'}
            </span>
          </div>
        </div>

        <!-- Оқу мерзімі мен оқылған беттер көрсеткіші -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin-bottom:14px; font-size:11.5px;">
          <div>
            <span style="color:#64748b;">Басталған күні:</span>
            <strong style="color:var(--text-main); display:block; margin-top:2px;">${b.start_date || '—'}</strong>
          </div>
          <div>
            <span style="color:#64748b;">Аяқталған күні:</span>
            <strong style="color:var(--text-main); display:block; margin-top:2px;">${b.finish_date || 'Оқу барысында'}</strong>
          </div>
          <div style="grid-column:1 / -1; margin-top:4px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:#64748b;">Оқылған беттер:</span>
              <strong style="color:#0f766e;">${b.pages_read} / ${b.total_pages} бет (${progressPct}%)</strong>
            </div>
            <div style="width:100%; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
              <div style="width:${progressPct}%; height:100%; background:${isFinished ? '#10b981' : '#0d9488'}; border-radius:4px;"></div>
            </div>
          </div>
        </div>

        <!-- ОҚЫРМАН КҮНДЕЛІГІНІҢ 4 МІНДЕТТІ ӨРІСІ -->
        <div style="display:flex; flex-direction:column; gap:10px; font-size:12px;">
          <!-- 1. Кітап туралы пікір -->
          <div style="background:#f0fdf4; border-left:3.5px solid #16a34a; padding:8px 12px; border-radius:6px;">
            <div style="font-weight:800; color:#15803d; font-size:11px; text-transform:uppercase;">💬 Кітап туралы пікірім:</div>
            <div style="color:#1e293b; font-style:italic; margin-top:3px; line-height:1.45;">
              ${b.opinion ? `«${b.opinion}»` : '<span style="color:#94a3b8; font-style:normal;">Әзірге пікір жазылмаған. «Өңдеу» батырмасы арқылы қосыңыз.</span>'}
            </div>
          </div>

          <!-- 2. Ең ұнаған кейіпкер -->
          <div style="background:#fdf4ff; border-left:3.5px solid #c026d3; padding:8px 12px; border-radius:6px;">
            <div style="font-weight:800; color:#a21caf; font-size:11px; text-transform:uppercase;">🎭 Ең ұнаған кейіпкерім:</div>
            <div style="color:#1e293b; margin-top:3px; font-weight:700;">
              ${b.favorite_character || '<span style="color:#94a3b8; font-weight:normal;">Кейіпкер көрсетілмеген.</span>'}
            </div>
          </div>

          <!-- 3. Шығармадан алған әсері -->
          <div style="background:#eff6ff; border-left:3.5px solid #2563eb; padding:8px 12px; border-radius:6px;">
            <div style="font-weight:800; color:#1d4ed8; font-size:11px; text-transform:uppercase;">✨ Шығармадан алған әсерім:</div>
            <div style="color:#1e293b; margin-top:3px; line-height:1.45;">
              ${b.impression || '<span style="color:#94a3b8;">Алған әсер жазылмаған.</span>'}
            </div>
          </div>

          <!-- 4. Қысқаша қорытынды -->
          <div style="background:#fffbeb; border-left:3.5px solid #f59e0b; padding:8px 12px; border-radius:6px;">
            <div style="font-weight:800; color:#b45309; font-size:11px; text-transform:uppercase;">📝 Қысқаша қорытынды:</div>
            <div style="color:#1e293b; margin-top:3px; line-height:1.45;">
              ${b.summary || '<span style="color:#94a3b8;">Қорытынды жазылмаған.</span>'}
            </div>
          </div>
        </div>
      </div>

      <!-- Әрекет түймесі -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:12px; margin-top:14px;">
        <span style="font-size:11px; color:#94a3b8;">
          ${b.updated_at ? `Соңғы жаңарту: ${b.updated_at.slice(0, 10)}` : 'Жаңа жазба'}
        </span>
        <button class="btn-3d btn-3d-green btn-edit-book-diary" data-id="${b.book_id}" style="padding:6px 14px; font-size:12px;">
          ✏️ Күнделікті толтыру / өңдеу
        </button>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// КҮНДЕЛІК ТОЛТЫРУ / ӨҢДЕУ МОДАЛІ
// -------------------------------------------------------------
async function openBookDiaryModal(bookId, availableBooks, onSuccess) {
  let initialData = null;
  try {
    const res = await api.getDiaryBook(bookId);
    initialData = res;
  } catch (err) {
    showToast('Кітап мәліметтерін жүктеу мүмкін болмады: ' + err.message, 'error');
    return;
  }

  const { book, diary } = initialData;

  const modalHtml = `
    <form id="form-edit-book-diary" style="display:flex; flex-direction:column; gap:12px; font-family:inherit;">
      <div style="display:flex; align-items:center; gap:12px; background:#f0fdfa; border:1px solid #99f6e4; padding:10px 14px; border-radius:8px;">
        <div style="font-size:28px;">📖</div>
        <div>
          <h3 style="font-size:16px; font-weight:800; color:#0f766e; margin:0;">${book.title}</h3>
          <div style="font-size:12px; color:#64748b;">${book.author} · ${book.genre || 'Әдебиет'}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label class="form-label">Оқу басталған күн:</label>
          <input type="date" class="form-input" id="inp-diary-start-date" required value="${diary.start_date || new Date().toISOString().slice(0, 10)}" />
        </div>
        <div>
          <label class="form-label">Аяқталған күн (оқылып бітсе):</label>
          <input type="date" class="form-input" id="inp-diary-finish-date" value="${diary.finish_date || ''}" />
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label class="form-label">Жалпы бет саны:</label>
          <input type="number" class="form-input" id="inp-diary-total-pages" required min="1" value="${diary.total_pages || book.total_pages || 100}" />
        </div>
        <div>
          <label class="form-label">Оқылған беттер саны:</label>
          <input type="number" class="form-input" id="inp-diary-pages-read" required min="0" value="${diary.pages_read || 0}" />
        </div>
      </div>

      <div>
        <label class="form-label">Кітап туралы пікір (несімен ұнады/ұнамады?):</label>
        <textarea class="form-textarea" id="inp-diary-opinion" rows="2" placeholder="Кітап бойынша жалпы әсеріңіз бен бағаңыз...">${diary.opinion || ''}</textarea>
      </div>

      <div>
        <label class="form-label">Ең ұнаған кейіпкер және себебі:</label>
        <input type="text" class="form-input" id="inp-diary-favorite-character" placeholder="Мысалы: Қожа — оның тапқырлығы мен адалдығы ұнады" value="${diary.favorite_character || ''}" />
      </div>

      <div>
        <label class="form-label">Шығармадан алған әсері (қандай сезім тудырды?):</label>
        <textarea class="form-textarea" id="inp-diary-impression" rows="2" placeholder="Шығарманы оқу барысында қандай толғаныстар мен сезімдер болды?">${diary.impression || ''}</textarea>
      </div>

      <div>
        <label class="form-label">Қысқаша қорытынды (негізгі түйін):</label>
        <textarea class="form-textarea" id="inp-diary-summary" rows="2" placeholder="Шығарманың негізгі идеясы мен оқырманға берер ғибраты...">${diary.summary || ''}</textarea>
      </div>

      <div>
        <label class="form-label">Кітапқа қоятын бағаңыз (1-5 жұлдыз):</label>
        <select class="form-input" id="inp-diary-rating">
          <option value="5" ${diary.rating === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ Өте керемет (5/5)</option>
          <option value="4" ${diary.rating === 4 ? 'selected' : ''}>⭐⭐⭐⭐ Жақсы кітап (4/5)</option>
          <option value="3" ${diary.rating === 3 ? 'selected' : ''}>⭐⭐⭐ Орташа (3/5)</option>
          <option value="2" ${diary.rating === 2 ? 'selected' : ''}>⭐⭐ Ұнаңқырамады (2/5)</option>
          <option value="1" ${diary.rating === 1 ? 'selected' : ''}>⭐ Түсініксіз (1/5)</option>
        </select>
      </div>

      <div style="margin-top:10px; display:flex; justify-content:flex-end; gap:8px;">
        <button type="submit" class="btn-3d btn-3d-green">
          💾 Күнделікке сақтау (+25 XP)
        </button>
      </div>
    </form>
  `;

  openModal('Электронды оқырман күнделігін толтыру', modalHtml);

  setTimeout(() => {
    const form = document.getElementById('form-edit-book-diary');
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        start_date: document.getElementById('inp-diary-start-date').value,
        finish_date: document.getElementById('inp-diary-finish-date').value || null,
        total_pages: parseInt(document.getElementById('inp-diary-total-pages').value, 10),
        pages_read: parseInt(document.getElementById('inp-diary-pages-read').value, 10),
        opinion: document.getElementById('inp-diary-opinion').value.trim(),
        favorite_character: document.getElementById('inp-diary-favorite-character').value.trim(),
        impression: document.getElementById('inp-diary-impression').value.trim(),
        summary: document.getElementById('inp-diary-summary').value.trim(),
        rating: parseInt(document.getElementById('inp-diary-rating').value, 10)
      };

      try {
        await api.saveDiaryBook(bookId, payload);
        showToast('Оқырман күнделігі сәтті сақталды! +25 XP марапатталды 🌟', 'success');
        document.getElementById('modal-close-btn')?.click();
        if (onSuccess) onSuccess();
      } catch (err) {
        showToast('Сақтау қатесі: ' + err.message, 'error');
      }
    };
  }, 50);
}

// Толтыру үшін сөреден кітап таңдау модалі
function openSelectBookForDiaryModal(availableBooks, onSuccess) {
  if (!availableBooks.length) {
    showToast('Сөреңізде кітаптар жоқ. Алдымен кітапханадан кітап таңдаңыз.', 'info');
    window.location.hash = '#/shelf';
    return;
  }

  const modalHtml = `
    <div style="display:flex; flex-direction:column; gap:8px;">
      <p style="font-size:13px; color:#64748b; margin-bottom:8px;">
        Күнделік жазбасын толтыру үшін төмендегі кітаптардың бірін таңдаңыз:
      </p>
      <div style="display:flex; flex-direction:column; gap:8px; max-height:280px; overflow-y:auto;">
        ${availableBooks.map(b => `
          <button class="btn btn-secondary btn-select-diary-book" data-id="${b.id}" style="text-align:left; display:flex; justify-content:space-between; align-items:center; padding:12px; border-radius:10px;">
            <div>
              <div style="font-weight:800; font-size:13.5px; color:var(--text-main);">${b.title}</div>
              <div style="font-size:11.5px; color:var(--text-muted);">${b.author}</div>
            </div>
            <span style="font-size:12px; color:var(--primary-green); font-weight:800;">Таңдау →</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  openModal('Күнделік толтыратын кітапты таңдаңыз', modalHtml);

  setTimeout(() => {
    document.querySelectorAll('.btn-select-diary-book').forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.getAttribute('data-id'));
        document.getElementById('modal-close-btn')?.click();
        openBookDiaryModal(id, availableBooks, onSuccess);
      };
    });
  }, 50);
}

// -------------------------------------------------------------
// ЭЛЕКТРОНДЫ ПОРТФОЛИОНЫ PDF БАСЫП ШЫҒАРУ МОДАЛІ
// -------------------------------------------------------------
function openDiaryPortfolioPrintModal(portfolio) {
  const { school, student_name, class_name, stats, entries, generated_at } = portfolio;

  const modalHtml = `
    <div id="printable-diary-portfolio-container" style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="text-align:center; margin-bottom:14px;" class="no-print">
        <button class="btn-3d btn-3d-green" onclick="window.print();" style="padding:10px 22px;">
          🖨️ PDF форматында сақтау / Басып шығару
        </button>
      </div>

      <div style="background:#fff; border:2px solid #0f766e; border-radius:12px; padding:28px 24px;">
        <!-- Мектеп ресми тақырыбы -->
        <div style="text-align:center; border-bottom:2px solid #0f766e; padding-bottom:14px; margin-bottom:18px;">
          <div style="font-size:11px; font-weight:800; color:#0f766e; letter-spacing:1.5px; text-transform:uppercase;">
            Қазақстан Республикасы Оқу-ағарту министрлігі · ${school}
          </div>
          <h2 style="font-size:22px; font-weight:900; color:#0f172a; margin:6px 0 2px 0;">
            ОҚУШЫНЫҢ ЭЛЕКТРОНДЫ ОҚЫРМАН КҮНДЕЛІГІ МЕН ПОРТФОЛИОСЫ
          </h2>
          <div style="font-size:14px; font-weight:700; color:#0369a1;">
            Оқушы: <strong>${student_name}</strong> | Сынып: <strong>${class_name}</strong>
          </div>
          <div style="font-size:11px; color:#64748b; margin-top:4px;">
            Қалыптастырылған уақыты: ${generated_at} · Жүйе: Kitap Tracker 2026
          </div>
        </div>

        <!-- Оқырмандық негізгі көрсеткіштер төлқұжаты -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px; padding:12px; margin-bottom:20px; text-align:center;">
          <div>
            <div style="font-size:10px; color:#0f766e; font-weight:800; text-transform:uppercase;">Оқылған кітаптар</div>
            <div style="font-size:18px; font-weight:900; color:#0f172a;">${stats.finished_books} кітап</div>
          </div>
          <div>
            <div style="font-size:10px; color:#0f766e; font-weight:800; text-transform:uppercase;">Оқылған беттер</div>
            <div style="font-size:18px; font-weight:900; color:#0f172a;">${stats.total_pages} бет</div>
          </div>
          <div>
            <div style="font-size:10px; color:#0f766e; font-weight:800; text-transform:uppercase;">Оқуға жұмсалған уақыт</div>
            <div style="font-size:18px; font-weight:900; color:#0f172a;">${stats.total_minutes} минут</div>
          </div>
          <div>
            <div style="font-size:10px; color:#0f766e; font-weight:800; text-transform:uppercase;">Кітап ағашының сатысы</div>
            <div style="font-size:15px; font-weight:900; color:#047857;">${stats.tree_icon || '🌳'} ${stats.tree_name}</div>
          </div>
        </div>

        <!-- Күнделік жазбаларының тізімі -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${entries && entries.length ? entries.map((e, idx) => `
            <div style="border:1px solid #cbd5e1; border-radius:8px; padding:14px; background:#fff; page-break-inside:avoid;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
                <div>
                  <span style="font-size:11px; font-weight:800; color:#0f766e;">№${idx + 1} КІТАП КАРТАСЫ:</span>
                  <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin:2px 0;">
                    «${e.title}» — ${e.author}
                  </h3>
                  <div style="font-size:11px; color:#64748b;">
                    Жанры: ${e.genre || 'Көркем әдебиет'} | Басталған күні: ${e.start_date || '—'} | Аяқталған: ${e.finish_date || 'Оқу барысында'} | Оқылған: ${e.pages_read} / ${e.total_pages} бет
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="width:65px; height:65px; display:inline-block;">
                    ${e.qr_svg}
                  </div>
                  <div style="font-size:8px; color:#94a3b8; margin-top:2px;">QR Төлқұжат</div>
                </div>
              </div>

              <!-- Мәтіндік талдау блогы -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px;">
                <div style="background:#f8fafc; padding:8px 10px; border-radius:6px; border-left:3px solid #16a34a;">
                  <strong>💬 Кітап туралы пікір:</strong>
                  <div style="margin-top:2px; font-style:italic; color:#334155;">«${e.opinion || 'Пікір жазылмаған'}»</div>
                </div>
                <div style="background:#f8fafc; padding:8px 10px; border-radius:6px; border-left:3px solid #c026d3;">
                  <strong>🎭 Ең ұнаған кейіпкер:</strong>
                  <div style="margin-top:2px; color:#334155;">${e.favorite_character || 'Көрсетілмеген'}</div>
                </div>
                <div style="background:#f8fafc; padding:8px 10px; border-radius:6px; border-left:3px solid #2563eb;">
                  <strong>✨ Шығармадан алған әсері:</strong>
                  <div style="margin-top:2px; color:#334155;">${e.impression || 'Жазылмаған'}</div>
                </div>
                <div style="background:#f8fafc; padding:8px 10px; border-radius:6px; border-left:3px solid #f59e0b;">
                  <strong>📝 Қысқаша қорытынды:</strong>
                  <div style="margin-top:2px; color:#334155;">${e.summary || 'Жазылмаған'}</div>
                </div>
              </div>
            </div>
          `).join('') : `
            <div style="text-align:center; padding:20px; color:#94a3b8;">Әзірге күнделік парақтары толтырылмаған.</div>
          `}
        </div>

        <!-- Төменгі қолтаңба орындары -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; border-top:1px solid #cbd5e1; padding-top:14px; font-size:12px;">
          <div>
            <strong>Сынып жетекшісі:</strong> _________________ (қолы)
          </div>
          <div>
            <strong>Мектеп кітапханашысы:</strong> _________________ (қолы)
          </div>
          <div>
            <strong>Оқушы қолы:</strong> _________________
          </div>
        </div>
      </div>
    </div>
  `;

  openModal('Оқушының ресми электронды оқырман күнделігі', modalHtml);
}

// -------------------------------------------------------------
// ДӘЙЕКСӨЗ ҚОСУ МОДАЛІ
// -------------------------------------------------------------
function openAddQuoteModal(availableBooks, onSuccess) {
  if (!availableBooks.length) {
    showToast('Сөреңізде кітаптар жоқ. Алдымен кітапханадан кітап таңдаңыз.', 'info');
    window.location.hash = '#/shelf';
    return;
  }

  const modalHtml = `
    <form id="form-add-quote" style="display:flex; flex-direction:column; gap:12px;">
      <div>
        <label class="form-label">${t('diary_select_book')}:</label>
        <select class="form-input" id="inp-quote-book" required>
          ${availableBooks.map(b => `<option value="${b.id}">${b.title} (${b.author})</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="form-label">${t('diary_quote_text')}:</label>
        <textarea class="form-textarea" id="inp-quote-text" rows="3" required placeholder="Кітаптан ұнаған әсерлі дәйексөзді жазыңыз..."></textarea>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label class="form-label">Кейіпкер немесе автор:</label>
          <input type="text" class="form-input" id="inp-quote-author" placeholder="Мысалы: Қожа немесе Абай" />
        </div>
        <div>
          <label class="form-label">Бет нөмірі (міндетті емес):</label>
          <input type="number" class="form-input" id="inp-quote-page" min="1" placeholder="Беті" />
        </div>
      </div>
      <div>
        <label class="form-label">Өз ойыңыз немесе түсініктеме:</label>
        <textarea class="form-textarea" id="inp-quote-thoughts" rows="2" placeholder="Бұл дәйексөз сізге несімен ұнады?"></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="submit" class="btn-3d btn-3d-green">💾 Дәйексөзді сақтау</button>
      </div>
    </form>
  `;

  openModal('Жаңа дәйексөз қосу', modalHtml);

  setTimeout(() => {
    const form = document.getElementById('form-add-quote');
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const book_id = Number(document.getElementById('inp-quote-book').value);
      const text = document.getElementById('inp-quote-text').value.trim();
      const quote_author = document.getElementById('inp-quote-author').value.trim();
      const page = document.getElementById('inp-quote-page').value;
      const thoughts = document.getElementById('inp-quote-thoughts').value.trim();

      try {
        await api.addDiaryEntry({
          book_id,
          kind: 'quote',
          text,
          quote_author,
          page: page ? Number(page) : null,
          thoughts
        });
        showToast('Дәйексөз күнделікке сәтті қосылды! 🌟', 'success');
        document.getElementById('modal-close-btn')?.click();
        if (onSuccess) onSuccess();
      } catch (err) {
        showToast('Қате: ' + err.message, 'error');
      }
    };
  }, 50);
}

// АУДИО ЖАЗУ МОДАЛІ
function openAddAudioModal(availableBooks, onSuccess) {
  if (!availableBooks.length) {
    showToast('Сөреңізде кітаптар жоқ.', 'info');
    return;
  }

  const modalHtml = `
    <div style="display:flex; flex-direction:column; gap:14px; text-align:center;">
      <div style="font-size:36px;">🎙️</div>
      <h3 style="font-size:16px; font-weight:800; margin:0;">Аудио-рефлексия жазу</h3>
      <p style="font-size:13px; color:var(--text-muted); margin:0;">
        Оқыған кітабыңыздан алған әсеріңізді дауыстап жазыңыз.
      </p>

      <div style="text-align:left;">
        <label class="form-label">${t('diary_select_book')}:</label>
        <select class="form-input" id="inp-audio-book" required>
          ${availableBooks.map(b => `<option value="${b.id}">${b.title} (${b.author})</option>`).join('')}
        </select>
      </div>

      <div style="background:var(--bg-soft); padding:16px; border-radius:12px; border:1px solid var(--border-color);">
        <div id="audio-record-status" style="font-size:13px; font-weight:700; color:#475569; margin-bottom:10px;">
          Жазуға дайын
        </div>
        <button class="btn-3d btn-3d-coral" id="btn-toggle-record">
          🔴 Жазуды бастау
        </button>
      </div>

      <div>
        <label class="form-label" style="text-align:left;">Қысқаша тақырыбы немесе ойыңыз:</label>
        <input type="text" class="form-input" id="inp-audio-note" placeholder="Мысалы: Кейіпкердің ерлігі туралы ойым" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn-3d btn-3d-green" id="btn-save-audio" disabled>
          💾 Аудионы сақтау
        </button>
      </div>
    </div>
  `;

  openModal('Аудио-рефлексия жазу', modalHtml);

  setTimeout(() => {
    let recording = false;
    let timer = null;
    let seconds = 0;
    const statusEl = document.getElementById('audio-record-status');
    const toggleBtn = document.getElementById('btn-toggle-record');
    const saveBtn = document.getElementById('btn-save-audio');

    if (toggleBtn) {
      toggleBtn.onclick = () => {
        if (!recording) {
          recording = true;
          seconds = 0;
          toggleBtn.textContent = '⏹️ Жазуды тоқтату';
          toggleBtn.style.background = '#dc2626';
          timer = setInterval(() => {
            seconds++;
            const m = String(Math.floor(seconds / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            if (statusEl) statusEl.textContent = `🎙️ Жазылуда... ${m}:${s}`;
          }, 1000);
        } else {
          recording = false;
          clearInterval(timer);
          toggleBtn.textContent = '🔄 Қайта жазу';
          toggleBtn.style.background = '';
          if (statusEl) statusEl.textContent = `✅ Дауыстық жазба дайын (${seconds} сек)`;
          if (saveBtn) saveBtn.disabled = false;
        }
      };
    }

    if (saveBtn) {
      saveBtn.onclick = async () => {
        const book_id = Number(document.getElementById('inp-audio-book').value);
        const note = document.getElementById('inp-audio-note').value.trim() || 'Аудио-рефлексия жазбасы';

        try {
          await api.addDiaryEntry({
            book_id,
            kind: 'audio',
            text: note,
            audio_url: 'mock_audio_record.webm'
          });
          showToast('Аудио-рефлексия күнделікке сақталды! 🌟', 'success');
          document.getElementById('modal-close-btn')?.click();
          if (onSuccess) onSuccess();
        } catch (err) {
          showToast('Қате: ' + err.message, 'error');
        }
      };
    }
  }, 50);
}

function renderDiaryCard(item, isClassView = false) {
  const isQuote = item.kind === 'quote';
  const isAudio = item.kind === 'audio';
  const dateStr = item.created_at ? item.created_at.slice(0, 10) : '';

  return `
    <div class="card" style="padding:18px; margin-bottom:0; border-left:5px solid ${isQuote ? 'var(--warm-yellow)' : isAudio ? '#3b82f6' : 'var(--primary-green)'}; border-radius:var(--radius-md); box-shadow:0 4px 12px rgba(38,55,70,0.05);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:800; font-size:14px; color:var(--text-main);">${item.book_title || 'Кітап'}</span>
        <span style="font-size:11.5px; color:var(--text-muted); font-weight:700;">${dateStr}</span>
      </div>
      <div style="font-size:13.5px; color:#334155; line-height:1.5; font-style:${isQuote ? 'italic' : 'normal'};">
        ${isQuote ? `«${item.text}»` : item.text}
      </div>
      ${item.quote_author ? `<div style="font-size:11.5px; color:#0369a1; margin-top:6px; font-weight:800;">— ${item.quote_author} ${item.page ? `(${item.page}-бет)` : ''}</div>` : ''}
    </div>
  `;
}
