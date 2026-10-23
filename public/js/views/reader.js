// Мәтінді оқу көрінісі (Reader)
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal } from '../ui.js';

export async function renderReaderView(container, bookId, chapterIdx = 1) {
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
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <a href="#/book/${bookId}" class="btn btn-secondary btn-sm">← Кітапқа оралу</a>
      <span style="font-size:13px; color:var(--text-muted); font-weight:600;">
        Бөлім: ${chapterIdx} / ${count}
      </span>
    </div>

    <!-- Мәтін карточкасы -->
    <div class="card" style="padding: 30px 24px; max-width:760px; margin:0 auto 24px auto;">
      <div style="border-bottom:1px solid var(--border-color); padding-bottom:14px; margin-bottom:20px;">
        <div style="font-size:13px; color:var(--primary-green); font-weight:700; text-transform:uppercase;">
          ${book?.title || 'Кітап'} • ${chapter?.page_start || 1}-${chapter?.page_end || 1} беттер
        </div>
        <h2 style="font-size:24px; font-weight:800; margin-top:4px;">${chapter?.title || 'Бөлім'}</h2>
      </div>

      <div style="font-size:17px; line-height:1.75; color:#1f2937; white-space:pre-line; font-family:Georgia, serif;">
        ${chapter.body}
      </div>

      <!-- Бөлім соңындағы әрекеттер -->
      <div style="border-top:1px solid var(--border-color); padding-top:20px; margin-top:30px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
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

  const quickLogBtn = container.querySelector('#btn-quick-log');
  if (quickLogBtn) {
    quickLogBtn.onclick = () => {
      openModal({
        title: t('log_modal_title'),
        bodyHtml: `
          <div class="form-group">
            <label class="form-label">${t('log_last_page')}</label>
            <input type="number" class="form-input" id="inp-r-page" value="${chapter.page_end}" min="1" max="${book.total_pages || 5000}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('log_minutes')}</label>
            <input type="number" class="form-input" id="inp-r-minutes" value="10">
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
