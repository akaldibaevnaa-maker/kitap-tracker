/**
 * KitapTracker — «Кітап сөресі» (Book Shelf)
 * Modern EdTech + Gamification интерфейсі
 * Әр карточкада:
 * - Кітап мұқабасы
 * - Атауы
 * - Автор
 * - Жанры
 * - Сыныбы
 * - Оқу мәртебесі
 * - «Толығырақ» батырмасы
 * - «Жалғастыру» немесе «Оқуды бастау» батырмасы
 * Көрнекі іздеу мен интерактивті сүзгілер
 */
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal, openCertificateModal } from '../ui.js';

export async function renderShelfView(container) {
  let activeTab = 'all'; // 'all', 'reading', 'want', 'finished'
  let searchQuery = '';
  let selectedGrade = '';
  let selectedGenre = 'all';
  let selectedLang = '';

  container.innerHTML = `
    <div style="text-align:center; padding: 50px 20px;">
      <div style="font-size:36px; margin-bottom:10px;">📚</div>
      <p style="color:var(--text-muted); font-size:15px; font-weight:700;">Кітап сөресі жүктелуде...</p>
    </div>
  `;

  async function loadAndRender() {
    try {
      const [allBooksRes, myShelf] = await Promise.all([
        api.getBooks({
          q: searchQuery,
          grade: selectedGrade || undefined,
          genre: selectedGenre !== 'all' ? selectedGenre : undefined,
          lang: selectedLang || undefined
        }),
        api.getShelf()
      ]);

      renderLayout(allBooksRes, myShelf);
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="color:var(--danger-color); text-align:center; padding:30px;">
          <h3>⚠️ Сөрені жүктеу қатесі</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary" onclick="window.location.reload()">Қайта жүктеу</button>
        </div>
      `;
    }
  }

  function renderLayout(allRes, myShelf) {
    const { books = [], filters = { genres: [], interests: [], languages: [] } } = allRes || {};
    const safeMyShelf = myShelf || { reading: [], want: [], finished: [] };

    // Әр кітаптың оқу мәртебесін бекіту
    const readingMap = new Map((safeMyShelf.reading || []).map(b => [b.id, b]));
    const wantMap = new Map((safeMyShelf.want || []).map(b => [b.id, b]));
    const finishedMap = new Map((safeMyShelf.finished || []).map(b => [b.id, b]));

    function enrichBook(b) {
      const reading = readingMap.get(b.id);
      const finished = finishedMap.get(b.id);
      const want = wantMap.get(b.id);
      let status = 'new';
      let percent = 0;
      let currentPage = 0;

      if (reading) {
        status = 'reading';
        percent = reading.shelf?.percent || b.shelf?.percent || 0;
        currentPage = reading.shelf?.current_page || b.shelf?.current_page || 0;
      } else if (finished) {
        status = 'finished';
        percent = 100;
        currentPage = b.total_pages || 100;
      } else if (want) {
        status = 'want';
        percent = 0;
      }
      return { ...b, shelfStatus: status, percent, currentPage };
    }

    let displayBooks = [];
    if (activeTab === 'all') {
      displayBooks = books.map(enrichBook);
    } else if (activeTab === 'reading') {
      displayBooks = (safeMyShelf.reading || []).map(enrichBook);
    } else if (activeTab === 'want') {
      displayBooks = (safeMyShelf.want || []).map(enrichBook);
    } else if (activeTab === 'finished') {
      displayBooks = (safeMyShelf.finished || []).map(enrichBook);
    }

    const allGenres = ['all', ...new Set([
      ...(filters?.genres || []),
      ...books.map(b => b.genre).filter(Boolean)
    ])];

    container.innerHTML = `
      <!-- Жоғарғы баннер мен айдар -->
      <div class="card" style="background: linear-gradient(135deg, #176B4D 0%, #11533b 50%, #263746 100%); color:#ffffff; padding:24px 22px; border-radius:var(--radius-lg); margin-bottom:20px; box-shadow:0 8px 24px rgba(23, 107, 77, 0.25);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#E8B95C; margin-bottom:4px;">
              №290 орта мектеп · Цифрлық оқу қоры
            </div>
            <h1 style="font-size:24px; font-weight:900; margin:0 0 6px 0; color:#ffffff; display:flex; align-items:center; gap:10px;">
              <span>📚</span> КІТАП СӨРЕСІ
            </h1>
            <p style="margin:0; font-size:14px; color:#DDF1E5; max-width:640px; line-height:1.4;">
              Мектеп оқу бағдарламасы мен әлем әдебиетінің таңдаулы туындылары. Өзіңізге ұнаған шығарманы таңдап, оқу саяхатын бастаңыз!
            </p>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-add-manual-book" style="background:#ffffff; color:var(--primary-green); font-weight:800; border:none; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
              ➕ Каталогта жоқ кітапты қосу
            </button>
            <a href="#/qr-library" class="btn btn-secondary btn-sm" style="background:rgba(255,255,255,0.18); color:#ffffff; border:1px solid rgba(255,255,255,0.3); font-weight:700;">
              🏷️ Мектептің QR-Каталогы →
            </a>
          </div>
        </div>
      </div>

      <!-- Сөре қойындылары (Tabs) -->
      <div style="display:flex; gap:8px; border-bottom:2px solid var(--border-color); padding-bottom:8px; margin-bottom:18px; overflow-x:auto;">
        <button class="btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'} btn-shelf-tab" data-tab="all" style="font-weight:800;">
          📚 Барлық кітаптар (${allRes?.total || books.length})
        </button>
        <button class="btn btn-sm ${activeTab === 'reading' ? 'btn-primary' : 'btn-secondary'} btn-shelf-tab" data-tab="reading" style="font-weight:800;">
          📘 Оқылып жатқан (${(safeMyShelf.reading || []).length})
        </button>
        <button class="btn btn-sm ${activeTab === 'want' ? 'btn-primary' : 'btn-secondary'} btn-shelf-tab" data-tab="want" style="font-weight:800;">
          ⭐ Оқығым келеді (${(safeMyShelf.want || []).length})
        </button>
        <button class="btn btn-sm ${activeTab === 'finished' ? 'btn-primary' : 'btn-secondary'} btn-shelf-tab" data-tab="finished" style="font-weight:800;">
          🏆 Аяқталған кітаптар (${(safeMyShelf.finished || []).length})
        </button>
      </div>

      <!-- Көрнекі іздеу және интерактивті сүзгілер блогы -->
      <div class="card" style="padding:16px; margin-bottom:22px; background:var(--bg-card); border:1px solid var(--border-color);">
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:12px;">
          <!-- Іздеу жолағы -->
          <div style="grid-column: 1 / -1; position:relative;">
            <input type="text" class="form-input" id="inp-search" value="${searchQuery}" placeholder="🔍 Кітап атауы, авторы немесе кілт сөздері бойынша жылдам іздеу..." style="padding-left:14px; font-size:14px;">
          </div>

          <!-- Сынып сүзгісі -->
          <div>
            <label class="form-label" style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px;">
              🎓 Сынып бойынша сүзу:
            </label>
            <select class="form-select" id="sel-grade">
              <option value="">Барлық сыныптар</option>
              ${[1,2,3,4,5,6,7,8,9,10,11].map(g => `<option value="${g}" ${selectedGrade == g ? 'selected' : ''}>${g}-сынып</option>`).join('')}
            </select>
          </div>

          <!-- Тіл сүзгісі -->
          <div>
            <label class="form-label" style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px;">
              🌐 Тілі бойынша сүзу:
            </label>
            <select class="form-select" id="sel-lang">
              <option value="">Барлық тілдер</option>
              <option value="kk" ${selectedLang === 'kk' ? 'selected' : ''}>Қазақша</option>
              <option value="ru" ${selectedLang === 'ru' ? 'selected' : ''}>Орысша</option>
            </select>
          </div>
        </div>

        <!-- Жанрлық чипстер (Interactive Genre Chips) -->
        <div>
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-bottom:6px;">
            🏷️ Танымал жанрлар:
          </div>
          <div class="filter-chip-group">
            ${allGenres.slice(0, 8).map(g => `
              <button type="button" class="filter-chip ${g === selectedGenre ? 'active' : ''} btn-genre-chip" data-genre="${g}">
                ${g === 'all' ? 'Барлық жанрлар' : g}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Кітап карточкаларының заманауи торы -->
      ${displayBooks.length === 0 ? `
        <div class="card" style="text-align:center; padding:36px 20px; color:var(--text-muted); margin-bottom:20px;">
          <div style="font-size:44px; margin-bottom:10px;">🔍</div>
          <h3 style="font-size:18px; font-weight:800; color:var(--text-main); margin-bottom:6px;">
            ${activeTab === 'reading' ? 'Әзірге оқылып жатқан кітап жоқ' : activeTab === 'want' ? 'Қалаулылар тізімі әзірге бос' : activeTab === 'finished' ? 'Әзірге аяқталған кітаптар жоқ' : 'Сұранысыңызға сай кітап табылмады'}
          </h3>
          <p style="font-size:13px; color:var(--text-muted); max-width:480px; margin:0 auto 16px auto;">
            Сүзгіні тазартып, басқа санаттарды қарап көріңіз немесе мектептің алтын қорынан оқуды бастаңыз.
          </p>
          <button class="btn btn-secondary btn-sm" id="btn-clear-filters">
            🔄 Сүзгілерді бастапқы күйге қайтару
          </button>
        </div>

        <!-- Ұсынылатын алтын қор -->
        <div class="empty-starter-shelf" style="margin-top:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
            <div style="font-weight:900; font-size:17px; color:#176B4D; display:flex; align-items:center; gap:8px;">
              <span>⭐</span> Мектеп бағдарламасынан ұсынылатын алтын қор:
            </div>
            <span style="font-size:12px; background:#DDF1E5; color:#176B4D; padding:3px 12px; border-radius:12px; font-weight:800;">
              Шыңға жетелейтін туындылар
            </span>
          </div>

          <div class="starter-book-grid">
            ${renderStarterBooks(books)}
          </div>
        </div>
      ` : `
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
          ${displayBooks.map(b => renderModernBookCard(b)).join('')}
        </div>
      `}
    `;

    bindEvents(container, loadAndRender);
  }

  function renderStarterBooks(allBooks) {
    const starterTitles = ['Абай жолы', 'Өркениеттің адасуы', 'Менің атым Қожа', 'Қара сөздер'];
    let chosen = (allBooks || []).filter(b => b && b.title && starterTitles.some(t => b.title.includes(t)));
    if (chosen.length === 0) chosen = (allBooks || []).slice(0, 3);

    return chosen.map(b => `
      <div class="starter-book-card" style="background:#ffffff; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px; box-shadow:var(--shadow-xs);">
        <div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:10px;">
          <div class="edtech-cover-wrap" style="background:${b?.cover_color || '#176B4D'}; width:54px; height:76px; font-size:28px;">
            ${b?.cover_emoji || '📖'}
          </div>
          <div>
            <h4 style="font-size:15px; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">${b?.title || 'Кітап'}</h4>
            <div style="font-size:12px; color:var(--text-muted); font-weight:600;">${b?.author || ''}</div>
            <span class="badge" style="margin-top:6px; font-size:10px; background:#DDF1E5; color:#176B4D; font-weight:800;">
              ${b?.genre || 'Әдебиет'} · ${b?.grade_min || 5}-${b?.grade_max || 9} сынып
            </span>
          </div>
        </div>
        <p style="font-size:12px; color:var(--text-muted); line-height:1.4; margin-bottom:12px;">
          ${(b?.description || '').slice(0, 95)}...
        </p>
        <div style="display:flex; gap:8px;">
          <a href="#/book/${b?.id || 1}" class="btn btn-secondary btn-sm" style="flex:1; font-weight:700;">
            Толығырақ
          </a>
          <button class="btn btn-primary btn-sm btn-start-journey" data-book-id="${b?.id || 1}" style="flex:1; font-weight:800;">
            🚀 Оқуды бастау
          </button>
        </div>
      </div>
    `).join('');
  }

  // Заманауи EdTech кітап карточкасы
  function renderModernBookCard(b) {
    // 1. Оқу мәртебесінің белгісі (Status Badge)
    let statusBadge = '';
    if (b.shelfStatus === 'reading') {
      statusBadge = `<span class="badge" style="background:#dbeafe; color:#1e40af; font-size:11px; font-weight:800;">📘 Оқылуда (${b.percent}%)</span>`;
    } else if (b.shelfStatus === 'finished') {
      statusBadge = `<span class="badge" style="background:#DDF1E5; color:#176B4D; font-size:11px; font-weight:800;">🏆 Оқылды</span>`;
    } else if (b.shelfStatus === 'want') {
      statusBadge = `<span class="badge" style="background:#fef3c7; color:#92400e; font-size:11px; font-weight:800;">⭐ Жоспарда</span>`;
    } else {
      statusBadge = `<span class="badge" style="background:#f1f5f9; color:#475569; font-size:11px; font-weight:700;">✨ Жаңа</span>`;
    }

    // 2. Сынып деңгейі
    const gradeText = b.grade_min && b.grade_max
      ? `${b.grade_min}-${b.grade_max} сынып`
      : `${b.grade_min || b.grade || '5'}-сынып`;

    return `
      <div class="edtech-shelf-card" data-book-id="${b.id}">
        <div>
          <!-- Жоғарғы мета реквизиттер: Сынып, Жанр, Оқу мәртебесі -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:6px; flex-wrap:wrap;">
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="badge" style="background:#f1f5f9; color:#334155; font-size:11px; font-weight:800;">
                🎓 ${gradeText}
              </span>
              <span class="badge" style="background:#f8fafc; border:1px solid #e2e8f0; color:#64748b; font-size:10px;">
                ${b.genre || 'Әдебиет'}
              </span>
            </div>
            <div>
              ${statusBadge}
            </div>
          </div>

          <!-- Кітап мұқабасы, Атауы және Авторы -->
          <div style="display:flex; gap:14px; margin-bottom:12px;">
            <!-- Мұқаба -->
            <div class="edtech-cover-wrap" style="background:${b?.cover_color || '#176B4D'};">
              ${b?.cover_emoji || '📖'}
            </div>

            <!-- Атауы мен авторы -->
            <div style="flex:1; min-width:0;">
              <h3 style="font-size:16px; font-weight:900; margin:0 0 4px 0; color:var(--text-main); line-height:1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
                ${b?.title || 'Кітап атауы'}
              </h3>
              <div style="font-size:13px; color:var(--text-muted); font-weight:600; margin-bottom:4px;">
                ${b?.author || 'Белгісіз автор'}
              </div>
              <div style="font-size:11px; color:#94a3b8; font-weight:600;">
                📄 ${b?.total_pages || 100} бет · ${b.language === 'ru' ? 'Орысша' : 'Қазақша'}
              </div>
            </div>
          </div>

          <!-- Қысқаша сипаттамасы -->
          <p style="font-size:12px; color:var(--text-muted); line-height:1.4; margin:0 0 12px 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${b.description || 'Шығарманың негізгі мазмұны мен кейіпкерлер тағлымы.'}
          </p>

          <!-- Оқылым прогресс сызығы (егер оқылуда болса) -->
          ${b.shelfStatus === 'reading' ? `
            <div style="margin-bottom:12px; background:#f8fafc; padding:8px 10px; border-radius:8px; border:1px solid #e2e8f0;">
              <div class="progress-bar-wrap" style="height:8px; margin:0 0 4px 0;">
                <div class="progress-bar-fill" style="width:${b.percent}%; background:linear-gradient(90deg, #176B4D, #22c55e);"></div>
              </div>
              <div style="font-size:11px; display:flex; justify-content:space-between; font-weight:700; color:var(--text-muted);">
                <span>${b.percent}% оқылды</span>
                <span>${b.currentPage} / ${b.total_pages} бет</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Төменгі әрекет батырмалары: «Толығырақ» және «Жалғастыру» / «Оқуды бастау» -->
        <div style="margin-top:auto; padding-top:10px; border-top:1px solid var(--border-light);">
          <div style="display:flex; gap:8px;">
            <a href="#/book/${b.id}" class="btn btn-secondary btn-sm" style="flex:1; font-weight:700; font-size:12px;">
              🔍 Толығырақ
            </a>

            ${b.shelfStatus === 'reading' ? `
              <a href="#/read/${b.id}/1" class="btn btn-primary btn-sm" style="flex:1.2; font-weight:800; font-size:12px;">
                📖 Жалғастыру
              </a>
            ` : b.shelfStatus === 'finished' ? `
              <button type="button" class="btn btn-secondary btn-sm btn-get-cert" data-book-id="${b.id}" data-book-title="${b.title}" style="flex:1.2; font-weight:800; font-size:12px; background:#fef3c7; border-color:#fde68a; color:#92400e;">
                🏆 Сертификат
              </button>
            ` : `
              <button type="button" class="btn btn-primary btn-sm btn-start-journey" data-book-id="${b.id}" style="flex:1.2; font-weight:800; font-size:12px;">
                🚀 Оқуды бастау
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents(container, reload) {
    // Сертификат алу батырмалары
    container.querySelectorAll('.btn-get-cert').forEach(btn => {
      btn.onclick = async () => {
        const title = btn.getAttribute('data-book-title');
        let nickname = 'Оқырман';
        try {
          const me = await api.me();
          if (me?.user?.nickname) nickname = me.user.nickname;
        } catch {}
        openCertificateModal(nickname, title);
      };
    });

    // Қойындыларды ауыстыру
    container.querySelectorAll('.btn-shelf-tab').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.getAttribute('data-tab');
        reload();
      };
    });

    // Жанр чипстерін басу
    container.querySelectorAll('.btn-genre-chip').forEach(btn => {
      btn.onclick = () => {
        selectedGenre = btn.getAttribute('data-genre');
        reload();
      };
    });

    // Іздеу жолағы
    const searchInp = container.querySelector('#inp-search');
    if (searchInp) {
      let timeout;
      searchInp.oninput = (e) => {
        clearTimeout(timeout);
        searchQuery = e.target.value.trim();
        timeout = setTimeout(() => reload(), 300);
      };
      searchInp.onkeydown = (e) => {
        if (e.key === 'Enter') reload();
      };
    }

    // Сынып және тіл фильтрлері
    const selGrade = container.querySelector('#sel-grade');
    if (selGrade) selGrade.onchange = (e) => { selectedGrade = e.target.value; reload(); };

    const selLang = container.querySelector('#sel-lang');
    if (selLang) selLang.onchange = (e) => { selectedLang = e.target.value; reload(); };

    // Сүзгілерді тазарту
    const clearBtn = container.querySelector('#btn-clear-filters');
    if (clearBtn) {
      clearBtn.onclick = () => {
        searchQuery = '';
        selectedGrade = '';
        selectedGenre = 'all';
        selectedLang = '';
        activeTab = 'all';
        reload();
      };
    }

    // «Оқуды бастау» батырмалары
    container.querySelectorAll('.btn-start-journey').forEach(btn => {
      btn.onclick = async () => {
        const bookId = Number(btn.getAttribute('data-book-id'));
        try {
          await api.updateShelfBook(bookId, { status: 'reading', goalText: 'Күніне 10-15 минут оқу' });
          showToast('Кітап оқу сөреңізге сәтті қосылды! Жол болсын! 🚀', 'success');
          window.location.hash = '#/world';
        } catch (err) {
          showToast(`Қате: ${err.message}`, 'error');
        }
      };
    });

    // Каталогта жоқ кітапты қолмен қосу модалы
    const addManualBtn = container.querySelector('#btn-add-manual-book');
    if (addManualBtn) {
      addManualBtn.onclick = () => {
        openModal({
          title: t('shelf_add_manual'),
          bodyHtml: `
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">
              Үйдегі немесе мектеп кітапханасынан алған кітабыңызды сөреге қосыңыз. Жалпы бет саны қолыңыздағы басылымға сай болуы шарт.
            </div>
            <div class="form-group">
              <label class="form-label">${t('shelf_manual_title')}</label>
              <input type="text" class="form-input" id="inp-m-title" required placeholder="Мысалы: Батырлар жыры">
            </div>
            <div class="form-group">
              <label class="form-label">${t('shelf_manual_author')}</label>
              <input type="text" class="form-input" id="inp-m-author" required placeholder="Мысалы: Халық мұрасы">
            </div>
            <div class="form-group">
              <label class="form-label">${t('shelf_manual_pages')}</label>
              <input type="number" class="form-input" id="inp-m-pages" min="1" max="5000" required placeholder="Мысалы: 120">
              <div class="form-help">Нақты бет санын көрсетіңіз.</div>
            </div>
            <div class="form-group">
              <label class="form-label">${t('shelf_filter_genre')}</label>
              <input type="text" class="form-input" id="inp-m-genre" placeholder="Мысалы: Жыр-дастан">
            </div>
          `,
          saveText: t('shelf_manual_save'),
          onSave: async (modalEl) => {
            const title = modalEl.querySelector('#inp-m-title').value.trim();
            const author = modalEl.querySelector('#inp-m-author').value.trim();
            const totalPages = Number(modalEl.querySelector('#inp-m-pages').value);
            const genre = modalEl.querySelector('#inp-m-genre').value.trim();

            if (!title || !author || !totalPages) {
              showToast('Барлық міндетті өрістерді толтырыңыз', 'error');
              return false;
            }

            try {
              await api.addBookManual({ title, author, totalPages, genre, language: 'kk' });
              showToast('Кітап жеке сөреңізге сәтті қосылды!', 'success');
              reload();
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

  loadAndRender();
}
