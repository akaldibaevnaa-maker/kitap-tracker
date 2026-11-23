/**
 * KitapTracker — Біріккен «Кітап сөресі & QR-Кітапхана» модулі
 * Мектеп кітапханасының толық интерактивті QR-каталогы, оқушының жеке сөресі,
 * тікелей QR-сканері және кітапхана жапсырмаларын басып шығару жүйесі.
 */
import { api } from '../api.js';
import { openModal, showToast, openCertificateModal } from '../ui.js';
import { generateQrSvg } from '../qr.js';
import { t } from '../i18n.js';

export async function renderQrLibraryView(container, initialTab = 'catalog') {
  container.innerHTML = `
    <div style="text-align:center; padding: 50px 20px;">
      <div style="font-size:36px; margin-bottom:10px;">⏳</div>
      <p style="color:var(--text-muted); font-size:15px; font-weight:600;">Кітап сөресі мен QR-кітапхана жүктелуде...</p>
    </div>
  `;

  try {
    const [catalogData, shelfData, allBooksRes] = await Promise.all([
      api.getLibraryQrCatalog().catch(() => ({ catalog: [], school: '№290 орта мектеп' })),
      api.getShelf().catch(() => ({ reading: [], want: [], finished: [] })),
      api.getBooks().catch(() => ({ books: [], filters: { genres: [], interests: [], languages: [] } }))
    ]);

    renderUnifiedLayout(container, {
      catalogData,
      shelfData: shelfData || { reading: [], want: [], finished: [] },
      allBooks: allBooksRes?.books || catalogData?.catalog || [],
      filters: allBooksRes?.filters || { genres: [], interests: [], languages: [] },
      initialTab
    });
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="color:var(--danger-color); text-align:center; padding:30px;">
        <h3>⚠️ Қате пайда болды</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Қайта жүктеу</button>
      </div>
    `;
  }
}

function renderUnifiedLayout(container, data) {
  const { catalogData, shelfData, filters, initialTab } = data;
  const school = catalogData?.school || '№290 орта мектеп';
  const rawCatalog = catalogData?.catalog || [];

  // Әр каталог кітабының сөредегі күйін біріктіру
  const catalog = rawCatalog.map(b => {
    const reading = (shelfData.reading || []).find(s => s.id === b.id);
    const finished = (shelfData.finished || []).find(s => s.id === b.id);
    const want = (shelfData.want || []).find(s => s.id === b.id);
    let shelfStatus = null;
    let percent = 0;
    if (reading) {
      shelfStatus = 'reading';
      percent = reading.shelf?.percent || 0;
    } else if (finished) {
      shelfStatus = 'finished';
      percent = 100;
    } else if (want) {
      shelfStatus = 'want';
      percent = 0;
    }
    return { ...b, shelfStatus, percent };
  });

  let activeTab = initialTab === 'shelf' ? 'reading' : initialTab || 'catalog'; // 'catalog', 'reading', 'want', 'finished', 'scanner'
  let searchQuery = '';
  let activeGenre = 'all';
  let selectedGrade = '';
  let selectedLang = '';

  const allGenres = ['all', ...new Set([
    ...(filters?.genres || []),
    ...catalog.map(b => b.genre).filter(Boolean)
  ])];

  function renderView() {
    container.innerHTML = `
      <!-- Басты тақырып және әрекеттер -->
      <div class="card" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%); color:#fff; padding:24px 20px; margin-bottom:20px; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.12);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="font-size:11px; font-weight:800; letter-spacing:1px; opacity:0.85; text-transform:uppercase;">
              ${school} · Бірыңғай цифрлық кітап ортасы
            </div>
            <h1 style="font-size:24px; font-weight:900; margin:6px 0 8px 0; color:#fff; display:flex; align-items:center; gap:8px;">
              <span>📚</span> КІТАП СӨРЕСІ & QR-КІТАПХАНА
            </h1>
            <p style="margin:0; font-size:14px; opacity:0.95; max-width:680px; line-height:1.4;">
              Мектеп қорындағы барлық кітаптар, жеке оқырман сөреңіз және телефон камерасымен жылдам оқуға арналған бірыңғай QR-кітапхана хабы.
            </p>
          </div>

          <!-- Жоғарғы басты батырмалар -->
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-add-manual-book" style="background:#fff; color:#0f172a; font-weight:700; border:none;">
              ➕ Жаңа кітап қосу
            </button>
            <button class="btn btn-primary btn-sm" id="btn-print-qr-stickers" style="background:#f59e0b; border-color:#d97706; color:#0f172a; font-weight:800;">
              🖨️ Жапсырмалар (PDF)
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-print-qr-catalog" style="background:rgba(255,255,255,0.2); border-color:rgba(255,255,255,0.4); color:#fff; font-weight:700;">
              📋 Ресми каталог (PDF)
            </button>
          </div>
        </div>
      </div>

      <!-- Басты бөлімдер қойындылары (Tabs) -->
      <div style="display:flex; gap:8px; border-bottom:2px solid var(--border-color); padding-bottom:8px; margin-bottom:20px; overflow-x:auto;">
        <button class="btn btn-sm ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'} btn-main-tab" data-tab="catalog" style="font-weight:700;">
          🏷️ Мектептің QR-каталогы (${catalog.length})
        </button>
        <button class="btn btn-sm ${activeTab === 'reading' ? 'btn-primary' : 'btn-secondary'} btn-main-tab" data-tab="reading" style="font-weight:700;">
          📘 Оқылып жатқан (${(shelfData.reading || []).length})
        </button>
        <button class="btn btn-sm ${activeTab === 'want' ? 'btn-primary' : 'btn-secondary'} btn-main-tab" data-tab="want" style="font-weight:700;">
          ⭐ Жоспарда (${(shelfData.want || []).length})
        </button>
        <button class="btn btn-sm ${activeTab === 'finished' ? 'btn-primary' : 'btn-secondary'} btn-main-tab" data-tab="finished" style="font-weight:700;">
          🏆 Аяқталған (${(shelfData.finished || []).length})
        </button>
        <button class="btn btn-sm ${activeTab === 'scanner' ? 'btn-primary' : 'btn-secondary'} btn-main-tab" data-tab="scanner" style="font-weight:700; background:${activeTab === 'scanner' ? 'var(--primary-color)' : '#ecfdf5'}; color:${activeTab === 'scanner' ? '#fff' : '#047857'}; border-color:#a7f3d0;">
          📷 QR Сканер / Шифрмен іздеу
        </button>
      </div>

      <!-- Қойынды мазмұны -->
      <div id="tab-content-container"></div>
    `;

    bindTabEvents();
    renderActiveTabContent();
  }

  function bindTabEvents() {
    container.querySelectorAll('.btn-main-tab').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.getAttribute('data-tab');
        renderView();
      };
    });

    const addManualBtn = container.querySelector('#btn-add-manual-book');
    if (addManualBtn) {
      addManualBtn.onclick = () => openManualAddBookModal();
    }

    const printStickersBtn = container.querySelector('#btn-print-qr-stickers');
    if (printStickersBtn) {
      printStickersBtn.onclick = () => openPrintStickersModal(catalog, school);
    }

    const printCatalogBtn = container.querySelector('#btn-print-qr-catalog');
    if (printCatalogBtn) {
      printCatalogBtn.onclick = () => openPrintCatalogModal(catalog, school);
    }
  }

  function renderActiveTabContent() {
    const contentBox = container.querySelector('#tab-content-container');
    if (!contentBox) return;

    if (activeTab === 'catalog') {
      renderCatalogTab(contentBox);
    } else if (activeTab === 'reading') {
      renderShelfListTab(contentBox, shelfData.reading || [], 'reading', 'Қазіргі уақытта оқылып жатқан кітап жоқ. Каталогтан ұнаған кітапты таңдап, оқуды бастаңыз!');
    } else if (activeTab === 'want') {
      renderShelfListTab(contentBox, shelfData.want || [], 'want', 'Оқу жоспарында әзірге кітап жоқ. Каталогтан кітаптарды таңдап, сөреңізге қосыңыз!');
    } else if (activeTab === 'finished') {
      renderShelfListTab(contentBox, shelfData.finished || [], 'finished', 'Әзірге толық аяқталған кітап жоқ. Оқуды жалғастырып, оқырман сертификаттарын алыңыз!');
    } else if (activeTab === 'scanner') {
      renderScannerTab(contentBox);
    }
  }

  // 1. МЕКТЕП КІТАПХАНАСЫНЫҢ QR-КАТАЛОГЫ
  function renderCatalogTab(box) {
    box.innerHTML = `
      <!-- Іздеу және жанрлық сүзгілер -->
      <div class="card" style="padding:14px 18px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="flex:1; min-width:240px;">
          <input type="text" class="form-input" id="inp-search-qr-catalog" value="${searchQuery}" placeholder="🔍 Кітап атауы, авторы немесе шифрі бойынша іздеу..." />
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;" id="qr-genre-filters">
          ${allGenres.slice(0, 6).map(g => `
            <button class="btn btn-sm ${g === activeGenre ? 'btn-primary' : 'btn-secondary'} btn-qr-genre" data-genre="${g}">
              ${g === 'all' ? 'Барлық кітаптар' : g}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Кітаптар торы -->
      <div id="qr-books-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:18px;"></div>
    `;

    function updateCatalogGrid() {
      const grid = box.querySelector('#qr-books-grid');
      if (!grid) return;

      let filtered = catalog;
      if (activeGenre !== 'all') {
        filtered = filtered.filter(b => b.genre === activeGenre);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(b =>
          (b.title || '').toLowerCase().includes(q) ||
          (b.author || '').toLowerCase().includes(q) ||
          (b.library_code || '').toLowerCase().includes(q)
        );
      }

      if (!filtered.length) {
        grid.innerHTML = `
          <div class="card" style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:40px; margin-bottom:8px;">🔍</div>
            <p style="font-size:15px; font-weight:600;">Сұраныс бойынша ешбір кітап табылмады.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(b => {
        let statusBadge = '';
        if (b.shelfStatus === 'reading') {
          statusBadge = `<span class="badge" style="background:#dbeafe; color:#1e40af; font-size:10px; font-weight:800;">📘 Оқылуда (${b.percent}%)</span>`;
        } else if (b.shelfStatus === 'finished') {
          statusBadge = `<span class="badge" style="background:#dcfce7; color:#166534; font-size:10px; font-weight:800;">🏆 Оқылды</span>`;
        } else if (b.shelfStatus === 'want') {
          statusBadge = `<span class="badge" style="background:#fef3c7; color:#92400e; font-size:10px; font-weight:800;">⭐ Жоспарда</span>`;
        }

        return `
          <div class="card book-qr-card" style="display:flex; flex-direction:column; justify-content:space-between; background:#fff; border:1px solid #cbd5e1; border-radius:12px; padding:16px; transition:transform 0.15s, box-shadow 0.15s;">
            <div>
              <!-- Жоғарғы реквизиттер -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:800; font-family:monospace;">
                  ${b.library_code}
                </span>
                <div style="display:flex; gap:4px; align-items:center;">
                  ${statusBadge}
                  <span class="badge" style="background:#f1f5f9; color:#475569; font-size:10px;">
                    ${b.genre || 'Әдебиет'}
                  </span>
                </div>
              </div>

              <!-- Мұқаба және атау -->
              <div style="display:flex; gap:12px; margin-bottom:12px;">
                <div style="width:52px; height:74px; background:${b.cover_color || '#3b82f6'}; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:28px; color:#fff; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                  ${b.cover_emoji || '📖'}
                </div>
                <div>
                  <h3 style="font-size:15px; font-weight:800; margin:0 0 4px 0; color:#0f172a; line-height:1.3;">
                    ${b.title}
                  </h3>
                  <div style="font-size:12px; color:#64748b; font-weight:500;">${b.author}</div>
                  <div style="font-size:11px; color:#94a3b8; margin-top:3px;">${b.total_pages} бет</div>
                </div>
              </div>

              <!-- QR-код бейнесі (сканерлеу үшін) -->
              <div style="text-align:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; margin-bottom:14px;">
                <div style="display:inline-block; width:125px; height:125px; background:#fff; padding:6px; border-radius:8px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                  ${b.qr_svg}
                </div>
                <div style="font-size:10px; color:#64748b; margin-top:6px; font-weight:600;">
                  📱 Камерамен сканерлеп оқыңыз
                </div>
              </div>
            </div>

            <!-- Батырмалар -->
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary btn-sm btn-zoom-qr" data-id="${b.id}" style="flex:1; font-size:11px; font-weight:700;" title="Үлкейтіп көру">
                  🔍 Үлкейту
                </button>
                <a href="#/book/${b.id}" class="btn btn-primary btn-sm" style="flex:1.2; font-size:11px; font-weight:700; text-align:center; background:#0284c7; border-color:#0369a1;">
                  📖 Оқуға өту
                </a>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary btn-sm btn-qr-to-diary" data-id="${b.id}" style="flex:1; font-size:11px; color:#0369a1; border-color:#bae6fd; background:#f0f9ff;">
                  📝 Күнделік
                </button>
                ${!b.shelfStatus ? `
                  <button class="btn btn-secondary btn-sm btn-quick-add-shelf" data-id="${b.id}" style="flex:1; font-size:11px; color:#15803d; border-color:#bbf7d0; background:#f0fdf4;">
                    ➕ Сөреге қосу
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Оқиғалар
      grid.querySelectorAll('.btn-zoom-qr').forEach(btn => {
        btn.onclick = () => {
          const id = Number(btn.getAttribute('data-id'));
          const b = catalog.find(item => item.id === id);
          if (b) openQrCardModal(b);
        };
      });

      grid.querySelectorAll('.btn-qr-to-diary').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-id');
          window.location.hash = `#/diary?bookId=${id}`;
        };
      });

      grid.querySelectorAll('.btn-quick-add-shelf').forEach(btn => {
        btn.onclick = async () => {
          const id = Number(btn.getAttribute('data-id'));
          try {
            await api.updateShelfBook(id, { status: 'reading', goalText: 'Күніне 10-15 минут оқу' });
            showToast('Кітап оқылып жатқан сөреңізге қосылды!', 'success');
            renderQrLibraryView(container, 'reading');
          } catch (err) {
            showToast(err.message, 'error');
          }
        };
      });
    }

    const searchInp = box.querySelector('#inp-search-qr-catalog');
    if (searchInp) {
      searchInp.oninput = (e) => {
        searchQuery = e.target.value.trim();
        updateCatalogGrid();
      };
    }

    box.querySelectorAll('.btn-qr-genre').forEach(btn => {
      btn.onclick = () => {
        box.querySelectorAll('.btn-qr-genre').forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        activeGenre = btn.getAttribute('data-genre');
        updateCatalogGrid();
      };
    });

    updateCatalogGrid();
  }

  // 2. ОҚУШЫНЫҢ ЖЕКЕ СӨРЕСІ (Оқылып жатқан, Жоспарда, Аяқталған)
  function renderShelfListTab(box, list, type, emptyMsg) {
    if (!list.length) {
      box.innerHTML = `
        <div class="card" style="text-align:center; padding:50px 20px;">
          <div style="font-size:48px; margin-bottom:12px;">📭</div>
          <h3 style="font-size:18px; font-weight:800; color:#334155; margin-bottom:6px;">Бұл бөлімде кітап жоқ</h3>
          <p style="font-size:14px; color:var(--text-muted); max-width:440px; margin:0 auto 16px auto;">${emptyMsg}</p>
          <button class="btn btn-primary" id="btn-goto-catalog" style="font-weight:700;">
            🏷️ Мектеп каталогынан кітап таңдау
          </button>
        </div>
      `;
      const btn = box.querySelector('#btn-goto-catalog');
      if (btn) {
        btn.onclick = () => {
          activeTab = 'catalog';
          renderView();
        };
      }
      return;
    }

    box.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(290px, 1fr)); gap:18px;">
        ${list.map(b => {
          const percent = b.shelf?.percent ?? (b.total_pages ? Math.min(100, Math.round(((b.current_page || 0) / b.total_pages) * 100)) : 0);
          return `
            <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; background:#fff; border:1px solid #cbd5e1; border-radius:12px; padding:16px;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:800;">
                    ${type === 'reading' ? '📘 Оқылып жатыр' : type === 'finished' ? '🏆 Аяқталған' : '⭐ Жоспарда'}
                  </span>
                  <span class="badge" style="background:#f1f5f9; color:#475569; font-size:10px;">
                    ${b.genre || 'Әдебиет'}
                  </span>
                </div>

                <div style="display:flex; gap:12px; margin-bottom:12px;">
                  <div style="width:52px; height:74px; background:${b.cover_color || '#3b82f6'}; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:28px; color:#fff; flex-shrink:0;">
                    ${b.cover_emoji || '📖'}
                  </div>
                  <div style="flex:1;">
                    <h3 style="font-size:16px; font-weight:800; margin:0 0 4px 0; color:#0f172a; line-height:1.3;">
                      ${b.title}
                    </h3>
                    <div style="font-size:12px; color:#64748b;">${b.author}</div>
                    <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${b.total_pages} бет</div>
                  </div>
                </div>

                <!-- Прогресс индикаторы -->
                <div style="margin-bottom:14px;">
                  <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; margin-bottom:4px; color:#475569;">
                    <span>Оқу прогресі</span>
                    <span>${percent}%</span>
                  </div>
                  <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                    <div style="background:${percent >= 100 ? '#10b981' : '#3b82f6'}; width:${percent}%; height:100%; transition:width 0.3s;"></div>
                  </div>
                </div>
              </div>

              <!-- Батырмалар -->
              <div style="display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; gap:6px;">
                  <a href="#/book/${b.id}" class="btn btn-primary btn-sm" style="flex:1; font-size:12px; font-weight:700; text-align:center;">
                    📖 Толық қарау
                  </a>
                  <a href="#/read/${b.id}/1" class="btn btn-secondary btn-sm" style="flex:1; font-size:12px; font-weight:700; text-align:center; background:#f0fdf4; color:#15803d; border-color:#bbf7d0;">
                    🚀 Оқуды бастау
                  </a>
                </div>
                <div style="display:flex; gap:6px;">
                  <a href="#/diary?bookId=${b.id}" class="btn btn-secondary btn-sm" style="flex:1; font-size:11px; color:#0369a1; border-color:#bae6fd; background:#f0f9ff; text-align:center;">
                    📝 Күнделікке жазу
                  </a>
                  ${type === 'finished' ? `
                    <button class="btn btn-secondary btn-sm btn-view-cert" data-title="${b.title}" data-author="${b.author}" style="flex:1; font-size:11px; background:#fffbeb; color:#92400e; border-color:#fde68a;">
                      🏆 Сертификат
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    box.querySelectorAll('.btn-view-cert').forEach(btn => {
      btn.onclick = () => {
        openCertificateModal({
          studentName: 'Оқырман',
          bookTitle: btn.getAttribute('data-title'),
          author: btn.getAttribute('data-author'),
          certCode: 'CERT-' + Math.random().toString(36).slice(2, 8).toUpperCase()
        });
      };
    });
  }

  // 3. КАМЕРАМЕН QR СКАНЕРЛЕУ НЕМЕСЕ ШИФРМЕН КІТАПҚА ӨТУ
  function renderScannerTab(box) {
    box.innerHTML = `
      <div class="card" style="max-width:560px; margin:0 auto; padding:24px; text-align:center;">
        <div style="font-size:44px; margin-bottom:8px;">📷</div>
        <h2 style="font-size:20px; font-weight:900; color:#0f172a; margin-bottom:6px;">
          QR-кодты сканерлеу немесе Кітап шифрін енгізу
        </h2>
        <p style="font-size:13px; color:#64748b; margin-bottom:20px; line-height:1.5;">
          Кітаптың мұқабасындағы немесе кітапхана этикеткасындағы QR-кодты сканерлеңіз немесе төмендегі өріске кітап нөмірін/шифрін жазыңыз.
        </p>

        <!-- Камера видео көрсетілімі -->
        <div id="camera-scanner-wrapper" style="margin-bottom:20px;">
          <div id="camera-placeholder" style="background:#f1f5f9; border:2px dashed #94a3b8; border-radius:12px; padding:30px 20px; margin-bottom:12px;">
            <div style="font-size:32px; margin-bottom:8px;">📸</div>
            <p style="font-size:13px; color:#475569; margin-bottom:12px;">
              Камераны қосу арқылы физикалық кітаптағы QR-кодты тікелей сканерлей аласыз
            </p>
            <button class="btn btn-primary" id="btn-start-camera" style="font-weight:700;">
              📹 Камераны іске қосу
            </button>
          </div>
          <video id="scanner-video" style="display:none; width:100%; max-height:280px; border-radius:12px; background:#000; object-fit:cover;" autoplay playsinline></video>
        </div>

        <div style="display:flex; align-items:center; gap:10px; margin:20px 0;">
          <div style="flex:1; height:1px; background:#e2e8f0;"></div>
          <span style="font-size:12px; color:#94a3b8; font-weight:700;">НЕМЕСЕ ШИФР БОЙЫНША ІЗДЕУ</span>
          <div style="flex:1; height:1px; background:#e2e8f0;"></div>
        </div>

        <!-- Тікелей шифр енгізу формасы -->
        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <input type="text" class="form-input" id="inp-book-code" placeholder="Мысалы: №290-КИТ-005 немесе 5" style="font-size:14px; font-weight:700; text-align:center;" />
          <button class="btn btn-primary" id="btn-jump-to-book" style="font-weight:700; white-space:nowrap; background:#0284c7; border-color:#0369a1;">
            🚀 Кітапқа өту
          </button>
        </div>
        <div style="font-size:11px; color:#64748b;">
          💡 Кеңес: «5» немесе «№290-КИТ-005» деп жазсаңыз, Абайдың «Қара сөздері» бірден ашылады.
        </div>
      </div>
    `;

    // Шифр бойынша секіру
    const jumpBtn = box.querySelector('#btn-jump-to-book');
    const codeInp = box.querySelector('#inp-book-code');
    const doJump = () => {
      const val = (codeInp.value || '').trim();
      if (!val) {
        showToast('Кітап нөмірін немесе шифрін енгізіңіз', 'error');
        return;
      }
      // Санды анықтау
      const numMatch = val.match(/\d+/);
      if (numMatch) {
        const bookId = Number(numMatch[0]);
        window.location.hash = `#/book/${bookId}`;
      } else {
        // Атауы бойынша табу
        const found = catalog.find(b => b.title.toLowerCase().includes(val.toLowerCase()));
        if (found) {
          window.location.hash = `#/book/${found.id}`;
        } else {
          showToast('Кітап табылмады. Қайта тексеріңіз.', 'error');
        }
      }
    };

    if (jumpBtn) jumpBtn.onclick = doJump;
    if (codeInp) {
      codeInp.onkeydown = (e) => {
        if (e.key === 'Enter') doJump();
      };
    }

    // Камераны қосу
    const startCamBtn = box.querySelector('#btn-start-camera');
    const videoEl = box.querySelector('#scanner-video');
    const placeholder = box.querySelector('#camera-placeholder');

    if (startCamBtn && videoEl) {
      startCamBtn.onclick = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Браузер камераны қолдамайды немесе рұқсат шектелген', 'error');
            return;
          }
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          videoEl.srcObject = stream;
          videoEl.style.display = 'block';
          if (placeholder) placeholder.style.display = 'none';
          showToast('Камера қосылды! QR-кодты экранға жақындатыңыз', 'info');
        } catch (err) {
          showToast(`Камераға қолжетімділік берілмеді: ${err.message}`, 'error');
        }
      };
    }
  }

  // 4. ҚОЛМЕН ЖАҢА КІТАП ҚОСУ МОДАЛІ
  function openManualAddBookModal() {
    openModal({
      title: 'Жаңа кітапты сөреге қосу',
      bodyHtml: `
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">
          Үйдегі немесе кітапханадан алған кітабыңды қос. Ол жеке сөреңізде сақталып, оқу прогресін белгілеуге мүмкіндік береді.
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" style="font-weight:700;">Кітап атауы *</label>
          <input type="text" class="form-input" id="inp-m-title" required placeholder="Мысалы: Батырлар жыры">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" style="font-weight:700;">Авторы *</label>
          <input type="text" class="form-input" id="inp-m-author" required placeholder="Мысалы: Халық мұрасы">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" style="font-weight:700;">Жалпы бет саны *</label>
          <input type="number" class="form-input" id="inp-m-pages" min="1" max="5000" required placeholder="Мысалы: 120">
          <div class="form-help" style="font-size:11px; color:#64748b; margin-top:3px;">Қолыңыздағы кітаптың соңғы нөмірленген бетін жазыңыз.</div>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" style="font-weight:700;">Жанры</label>
          <input type="text" class="form-input" id="inp-m-genre" placeholder="Мысалы: Жыр-дастан, Әңгіме">
        </div>
      `,
      saveText: 'Сөреге сақтау',
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
          showToast('Кітап сәтті қосылды!', 'success');
          renderQrLibraryView(container, 'reading');
          return true;
        } catch (err) {
          showToast(`Қате: ${err.message}`, 'error');
          return false;
        }
      }
    });
  }

  renderView();
}

// Кітаптың QR-карточкасын модальде үлкейтіп көру
export function openQrCardModal(book) {
  const qrUrl = book.qr_url || `http://${window.location.host}/b/${book.id}`;
  const modalHtml = `
    <div style="text-align:center; padding:10px;">
      <div style="font-size:12px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin-bottom:4px;">
        №290 ОРТА МЕКТЕП КІТАПХАНАСЫ
      </div>
      <h2 style="font-size:20px; font-weight:900; color:#0f172a; margin:4px 0;">
        ${book.title}
      </h2>
      <div style="font-size:14px; color:#64748b; margin-bottom:16px;">
        Автор: <strong>${book.author}</strong> | Жанры: <strong>${book.genre || 'Әдебиет'}</strong>
      </div>

      <!-- Үлкен сканерленетін QR -->
      <div style="display:inline-block; padding:16px; background:#fff; border:2px solid #cbd5e1; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.08); margin-bottom:16px;">
        ${generateQrSvg(qrUrl, { size: 220, title: book.title })}
      </div>

      <div style="font-size:13px; font-weight:800; color:#0369a1; margin-bottom:4px; font-family:monospace;">
        Шифр: ${book.library_code || `№290-КИТ-${String(book.id).padStart(3, '0')}`}
      </div>
      <div style="font-size:12px; color:#475569; max-width:320px; margin:0 auto 16px auto;">
        Телефон камерасымен сканерлеңіз. Платформада кітап автоматты түрде ашылады!
      </div>

      <div style="display:flex; justify-content:center; gap:10px;">
        <a href="#/book/${book.id}" class="btn btn-primary" onclick="document.querySelector('.modal-close')?.click();">
          📖 Кітапты Kitap Tracker-де ашу
        </a>
        <button class="btn btn-secondary" onclick="window.print();">
          🖨️ Карточканы басып шығару
        </button>
      </div>
    </div>
  `;

  openModal('Кітаптың цифрлық QR-төлқұжаты', modalHtml);
}

// Мектеп кітаптарына жапсыратын QR-этикеткалар (Stickers) модалі
function openPrintStickersModal(catalog, school) {
  const modalHtml = `
    <div id="printable-stickers-container">
      <div style="text-align:center; margin-bottom:16px;" class="no-print">
        <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin-bottom:4px;">
          Мектеп кітапханасының QR-жапсырмалары (A4 дайын тор)
        </h3>
        <p style="font-size:12px; color:#64748b; margin-bottom:12px;">
          Бұл жапсырмаларды принтерден шығарып, нақты қағаз кітаптардың сыртына немесе кітапхана сөресіне жапсыруға болады.
        </p>
        <button class="btn btn-primary" onclick="window.print();" style="background:#1e3a8a;">
          🖨️ Жапсырмаларды басып шығару (Print)
        </button>
      </div>

      <!-- Жапсырмалар парағы -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; padding:10px; background:#fff;">
        ${catalog.map(b => `
          <div style="border:2px dashed #94a3b8; border-radius:6px; padding:10px; text-align:center; background:#fff; page-break-inside:avoid;">
            <div style="font-size:9px; font-weight:800; color:#1e3a8a; text-transform:uppercase;">
              ${school}
            </div>
            <div style="font-size:11px; font-weight:900; color:#0f172a; margin:2px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${b.title}
            </div>
            <div style="font-size:9px; color:#64748b; margin-bottom:6px;">
              ${b.author}
            </div>
            <div style="display:inline-block; width:90px; height:90px; margin-bottom:4px;">
              ${b.qr_svg}
            </div>
            <div style="font-size:9px; font-weight:800; color:#0369a1; font-family:monospace;">
              ${b.library_code}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  openModal('Кітапханалық QR-жапсырмалар', modalHtml);
}

// Толық ресми QR-каталог баспасы
function openPrintCatalogModal(catalog, school) {
  const modalHtml = `
    <div id="printable-catalog-container">
      <div style="text-align:center; margin-bottom:16px;" class="no-print">
        <button class="btn btn-primary" onclick="window.print();" style="background:#1e3a8a;">
          🖨️ Каталогты басып шығару (PDF)
        </button>
      </div>

      <div style="background:#fff; padding:24px; border:1px solid #cbd5e1; border-radius:8px;">
        <!-- Мектеп шапкасы -->
        <div style="text-align:center; border-bottom:2px solid #1e3a8a; padding-bottom:12px; margin-bottom:16px;">
          <div style="font-size:12px; font-weight:800; color:#1e3a8a; text-transform:uppercase;">
            Қазақстан Республикасы Оқу-ағарту министрлігі
          </div>
          <h2 style="font-size:20px; font-weight:900; color:#0f172a; margin:4px 0;">
            ${school.toUpperCase()}
          </h2>
          <div style="font-size:13px; font-weight:700; color:#0369a1;">
            МЕКТЕП КІТАПХАНАСЫНЫҢ ИНТЕРАКТИВТІ QR-КАТАЛОГЫ
          </div>
          <div style="font-size:11px; color:#64748b; margin-top:4px;">
            Жалпы тіркелген кітап саны: <strong>${catalog.length}</strong> | Қалыптастырылған уақыты: ${new Date().toISOString().slice(0, 10)}
          </div>
        </div>

        <!-- Кітаптардың кестелік каталогы -->
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #94a3b8; text-align:left;">
              <th style="padding:8px 6px; width:40px;">№</th>
              <th style="padding:8px 6px; width:80px;">QR-код</th>
              <th style="padding:8px 6px;">Кітап атауы мен Авторы</th>
              <th style="padding:8px 6px; width:100px;">Жанры</th>
              <th style="padding:8px 6px; width:60px;">Беті</th>
              <th style="padding:8px 6px; width:110px;">Кітапхана шифрі</th>
            </tr>
          </thead>
          <tbody>
            ${catalog.map((b, idx) => `
              <tr style="border-bottom:1px solid #e2e8f0; page-break-inside:avoid;">
                <td style="padding:8px 6px; font-weight:700; color:#64748b;">${idx + 1}</td>
                <td style="padding:8px 6px; text-align:center;">
                  <div style="width:60px; height:60px; display:inline-block;">
                    ${b.qr_svg}
                  </div>
                </td>
                <td style="padding:8px 6px;">
                  <div style="font-weight:800; font-size:13px; color:#0f172a;">${b.title}</div>
                  <div style="color:#64748b; font-size:11px;">${b.author}</div>
                </td>
                <td style="padding:8px 6px; color:#475569;">${b.genre || 'Әңгіме'}</td>
                <td style="padding:8px 6px; color:#475569;">${b.total_pages} бет</td>
                <td style="padding:8px 6px; font-weight:700; font-family:monospace; color:#0369a1;">
                  ${b.library_code}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  openModal('Мектеп кітапханасының ресми QR-каталогы', modalHtml);
}
