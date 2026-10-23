// «Кітап сөресі» — Кітап таңдау, жеке сөре, іздеу, сүзу және каталогқа кітап қосу
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal } from '../ui.js';

export async function renderShelfView(container) {
  let activeTab = 'all'; // 'all', 'reading', 'want', 'finished'
  let searchQuery = '';
  let selectedGrade = '';
  let selectedGenre = '';
  let selectedLang = '';

  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">${t('shelf_all')} жүктелуде...</p>
    </div>
  `;

  async function loadAndRender() {
    try {
      const [allBooksRes, myShelf] = await Promise.all([
        api.getBooks({
          q: searchQuery,
          grade: selectedGrade || undefined,
          genre: selectedGenre || undefined,
          lang: selectedLang || undefined
        }),
        api.getShelf()
      ]);

      renderLayout(allBooksRes, myShelf);
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
    }
  }

  function renderLayout(allRes, myShelf) {
    const { books = [], filters = { genres: [], interests: [], languages: [] } } = allRes || {};
    const safeMyShelf = myShelf || { reading: [], want: [], finished: [] };

    let displayBooks = [];
    if (activeTab === 'all') displayBooks = books;
    else if (activeTab === 'reading') displayBooks = safeMyShelf.reading || [];
    else if (activeTab === 'want') displayBooks = safeMyShelf.want || [];
    else if (activeTab === 'finished') displayBooks = safeMyShelf.finished || [];

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <h2 style="font-size:24px; font-weight:800; color:var(--text-main);">
          📖 ${t('nav_shelf')}
        </h2>
        <button class="btn btn-secondary btn-sm" id="btn-add-manual-book">
          ➕ ${t('shelf_add_manual')}
        </button>
      </div>

      <!-- Сөре қойындылары -->
      <div style="display:flex; gap:8px; border-bottom:2px solid var(--border-color); padding-bottom:8px; margin-bottom:16px; overflow-x:auto;">
        <button class="btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}" data-tab="all">
          ${t('shelf_all')} (${allRes?.total || books.length})
        </button>
        <button class="btn btn-sm ${activeTab === 'reading' ? 'btn-primary' : 'btn-secondary'}" data-tab="reading">
          📘 ${t('shelf_reading')} (${(safeMyShelf.reading || []).length})
        </button>
        <button class="btn btn-sm ${activeTab === 'want' ? 'btn-primary' : 'btn-secondary'}" data-tab="want">
          ⭐ ${t('shelf_want')} (${(safeMyShelf.want || []).length})
        </button>
        <button class="btn btn-sm ${activeTab === 'finished' ? 'btn-primary' : 'btn-secondary'}" data-tab="finished">
          🏆 ${t('shelf_finished')} (${(safeMyShelf.finished || []).length})
        </button>
      </div>

      <!-- Іздеу және сүзу блогы -->
      ${activeTab === 'all' ? `
        <div class="card" style="padding:14px; margin-bottom:20px;">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:10px;">
            <div>
              <input type="text" class="form-input" id="inp-search" value="${searchQuery}" placeholder="${t('shelf_search_ph')}">
            </div>
            <div>
              <select class="form-select" id="sel-grade">
                <option value="">Барлық сыныптар</option>
                ${[1,2,3,4,5,6,7,8,9,10,11].map(g => `<option value="${g}" ${selectedGrade == g ? 'selected' : ''}>${g}-сынып</option>`).join('')}
              </select>
            </div>
            <div>
              <select class="form-select" id="sel-genre">
                <option value="">Барлық жанрлар</option>
                ${(filters?.genres || []).map(gn => `<option value="${gn}" ${selectedGenre === gn ? 'selected' : ''}>${gn}</option>`).join('')}
              </select>
            </div>
            <div>
              <select class="form-select" id="sel-lang">
                <option value="">Барлық тілдер</option>
                <option value="kk" ${selectedLang === 'kk' ? 'selected' : ''}>Қазақша</option>
                <option value="ru" ${selectedLang === 'ru' ? 'selected' : ''}>Орысша</option>
              </select>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Кітап карточкаларының торы -->
      ${displayBooks.length === 0 ? `
        <div class="card" style="text-align:center; padding:24px; color:var(--text-muted); margin-bottom:16px;">
          <div style="font-size:36px; margin-bottom:8px;">📚</div>
          <p style="font-size:16px; font-weight:800; color:var(--text-main); margin-bottom:4px;">
            ${activeTab === 'reading' ? 'Әзірге оқылып жатқан кітап жоқ' : activeTab === 'want' ? 'Қалаулылар тізімі әзірге бос' : activeTab === 'finished' ? 'Әзірге аяқталған кітаптар жоқ' : 'Кітап табылған жоқ'}
          </p>
          <p style="font-size:13px; color:var(--text-muted); max-width:480px; margin:0 auto;">
            Оқу саяхатын бастау үшін мектеп бағдарламасындағы ұлттық әдебиетіміздің үздік туындыларынан бастауды ұсынамыз:
          </p>
        </div>

        <!-- Ұсынылатын алтын қор кітаптары (М. Әуезов, М. Шаханов, Б. Соқпақбаев) -->
        <div class="empty-starter-shelf">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
            <div style="font-weight:800; font-size:16px; color:#1e3a8a;">
              ⭐ Мектеп бағдарламасынан ұсынылатын алтын қор:
            </div>
            <span style="font-size:12px; background:#dbeafe; color:#1e40af; padding:3px 12px; border-radius:12px; font-weight:700;">
              Шыңға жетелейтін кітаптар
            </span>
          </div>

          <div class="starter-book-grid">
            ${renderStarterBooks(books)}
          </div>
        </div>
      ` : `
        <div class="book-grid">
          ${displayBooks.map(b => renderBookCard(b)).join('')}
        </div>
      `}
    `;

    bindEvents(container, loadAndRender);
  }

  function renderStarterBooks(allBooks) {
    const starterTitles = ['Абай жолы', 'Өркениеттің адасуы', 'Менің атым Қожа'];
    let chosen = allBooks.filter(b => starterTitles.some(t => b.title.includes(t)));
    if (chosen.length === 0) chosen = allBooks.slice(0, 3);

    return chosen.map(b => `
      <div class="starter-book-card">
        <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:10px;">
          <div style="width:48px; height:64px; background:${b.cover_color || '#2d6a4f'}; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:24px; color:#fff; flex-shrink:0;">
            ${b.cover_emoji || '📖'}
          </div>
          <div>
            <h4 style="font-size:15px; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">${b.title}</h4>
            <div style="font-size:12px; color:var(--text-muted);">${b.author}</div>
            <span class="badge" style="margin-top:4px; font-size:10px; background:#e0f2fe; color:#0369a1;">
              ${b.genre || 'Шедевр'}
            </span>
          </div>
        </div>
        <p style="font-size:12px; color:var(--text-muted); line-height:1.4; margin-bottom:12px;">
          ${(b.description || '').slice(0, 100)}...
        </p>
        <div style="display:flex; gap:8px;">
          <a href="#/book/${b.id}" class="btn btn-secondary btn-sm" style="flex:1;">
            Толығырақ
          </a>
          <button class="btn btn-primary btn-sm btn-start-journey" data-book-id="${b.id}" style="flex:1;">
            🚀 Оқуды бастау
          </button>
        </div>
      </div>
    `).join('');
  }

  function renderBookCard(b) {
    return `
      <div class="book-card">
        <div class="book-cover" style="background: ${b.cover_color || '#2e7d5b'};">
          <span>${b.cover_emoji || '📘'}</span>
        </div>
        <div class="book-info">
          <div class="book-title">${b.title}</div>
          <div class="book-author">${b.author}</div>
          <div class="book-meta">
            <span class="badge">${b.grade_min}-${b.grade_max} сынып</span>
            <span class="badge">${b.language === 'kk' ? 'Қазақша' : 'Орысша'}</span>
            ${b.genre ? `<span class="badge">${b.genre}</span>` : ''}
          </div>
          <p class="book-desc">${b.description || 'Сипаттамасы жоқ.'}</p>
          
          <div style="margin-top:auto; padding-top:10px;">
            ${b.shelf?.status === 'reading' ? `
              <div style="margin-bottom:8px;">
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" style="width:${b.shelf.percent || 0}%;"></div>
                </div>
                <div style="font-size:11px; text-align:right; color:var(--text-muted);">${b.shelf.percent || 0}% оқылды</div>
              </div>
            ` : ''}

            <div style="display:flex; gap:6px;">
              <a href="#/book/${b.id}" class="btn btn-secondary btn-sm" style="flex:1;">
                Толығырақ
              </a>
              ${b.shelf?.status !== 'reading' && b.shelf?.status !== 'finished' ? `
                <button class="btn btn-primary btn-sm btn-start-journey" data-book-id="${b.id}" style="flex:1;">
                  ${t('shelf_btn_start_journey')}
                </button>
              ` : `
                <a href="#/world" class="btn btn-primary btn-sm" style="flex:1;">
                  Жалғастыру
                </a>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents(container, reload) {
    // Қойындыларды басу
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.getAttribute('data-tab');
        reload();
      };
    });

    // Іздеу
    const searchInp = container.querySelector('#inp-search');
    if (searchInp) {
      searchInp.oninput = (e) => {
        searchQuery = e.target.value;
      };
      searchInp.onkeydown = (e) => {
        if (e.key === 'Enter') reload();
      };
    }

    const selGrade = container.querySelector('#sel-grade');
    if (selGrade) selGrade.onchange = (e) => { selectedGrade = e.target.value; reload(); };

    const selGenre = container.querySelector('#sel-genre');
    if (selGenre) selGenre.onchange = (e) => { selectedGenre = e.target.value; reload(); };

    const selLang = container.querySelector('#sel-lang');
    if (selLang) selLang.onchange = (e) => { selectedLang = e.target.value; reload(); };

    // «Саяхатты бастау» батырмалары
    container.querySelectorAll('.btn-start-journey').forEach(btn => {
      btn.onclick = async () => {
        const bookId = Number(btn.getAttribute('data-book-id'));
        try {
          await api.updateShelfBook(bookId, { status: 'reading', goalText: 'Күніне 10-15 минут оқу' });
          showToast('Саяхат басталды! Кітап басты кабинетке қосылды.', 'success');
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
              Үйдегі немесе кітапханадан алған кітабыңды қос. Жалпы бет саны нақты басылымыңа сәйкес болуы керек.
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
              <div class="form-help">Белгісіз кітап деректерін ойдан шығармаңыз, қолыңыздағы кітапқа қараңыз.</div>
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
