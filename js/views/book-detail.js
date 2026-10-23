// Кітаптың толық парақшасы: бөлімдер, саяхат картасы, тапсырмалар, рефлексия
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal, launchConfetti, openCharacterQuizModal } from '../ui.js';

export async function renderBookDetailView(container, bookId) {
  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">Кітап мәліметтері жүктелуде...</p>
    </div>
  `;

  try {
    const data = await api.getBook(bookId);
    let quiz = null;
    try {
      const resQ = await api.getQuiz(bookId);
      quiz = resQ?.quiz || resQ;
    } catch {
      // no quiz or not finished
    }
    renderLayout(container, { ...data, quiz });
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
  }
}

function renderLayout(container, data) {
  const { book, chapters, shelf, journey, tasks, reflection, logs } = data;
  const isReading = shelf?.status === 'reading';
  const isFinished = shelf?.status === 'finished';

  const stageNames = [t('stage_1'), t('stage_2'), t('stage_3'), t('stage_4'), t('stage_5')];

  container.innerHTML = `
    <div style="margin-bottom:16px;">
      <a href="#/shelf" class="btn btn-secondary btn-sm">← Кітап сөресіне қайту</a>
    </div>

    <!-- Кітап туралы негізгі ақпарат -->
    <div class="card">
      <div style="display:flex; gap:20px; flex-wrap:wrap;">
        <div style="width:90px; height:120px; background:${book.cover_color}; border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; font-size:48px; color:#fff;">
          ${book.cover_emoji}
        </div>
        <div style="flex:1; min-width:260px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <h2 style="font-size:22px; font-weight:800;">${book?.title || 'Кітап'}</h2>
          </div>
          <div style="font-size:14px; color:var(--text-muted); margin-bottom:8px;">${book.author}</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
            <span class="badge">${book.grade_min}-${book.grade_max} сынып</span>
            <span class="badge">${book.genre || 'Әңгіме'}</span>
            <span class="badge">${book.total_pages ? `${book.total_pages} бет` : 'Бет саны белгісіз'}</span>
          </div>
          <p style="font-size:14px; line-height:1.5; color:#374151;">${book.description}</p>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px; flex-wrap:wrap;">
        ${!isReading && !isFinished ? `
          <button class="btn btn-primary" id="btn-start-reading">
            🚀 ${t('shelf_btn_start_journey')}
          </button>
        ` : `
          ${chapters.length > 0 ? `
            <a href="#/read/${book.id}/1" class="btn btn-primary">
              📖 1-бөлімнен оқу
            </a>
          ` : ''}
          <button class="btn btn-accent" id="btn-add-log">
            ✍️ Оқуды белгілеу
          </button>
          ${data.quiz && (data.quiz.character_name || data.quiz.quiz?.character_name) ? `
            <button class="btn btn-secondary" id="btn-character-quiz" style="border:2px solid #f59e0b; background:#fffbeb; font-weight:700; color:#92400e;">
              🎯 ${data.quiz.character_name || data.quiz.quiz?.character_name || 'Кейіпкер'} сұрақтары ${(data.quiz.is_completed || data.quiz.completed) ? '✅ (Өтілген)' : '(+15 XP, +2 💎)'}
            </button>
          ` : ''}
        `}
      </div>
    </div>

    <!-- Егер кітап оқылып жатса — Саяхат картасы -->
    ${shelf ? `
      <div class="card">
        <div class="card-title">
          <span>🗺️</span> Саяхат картасы (Кітап бойынша даму)
        </div>
        <div class="journey-map">
          ${(journey ? journey.stages : []).map((st, i) => `
            <div class="stage-step ${st.status}">
              <div class="stage-num">${i + 1}-кезең</div>
              <div class="stage-name">${stageNames[i]}</div>
              <div class="stage-badge">
                ${st.status === 'done' ? '✓ Аяқталды' : st.status === 'current' ? '▶ Қазіргі' : '🔒'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Бөлімдер тізімі (егер мәтін болса) -->
    ${chapters.length > 0 ? `
      <div class="card">
        <div class="card-title">
          <span>📑</span> Кітап бөлімдері (${chapters.length} бөлім)
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${chapters.map(ch => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-soft); padding:10px 14px; border-radius:var(--radius-sm);">
              <div>
                <strong style="font-size:14px;">${ch.title}</strong>
                <span style="font-size:12px; color:var(--text-muted); margin-left:8px;">(${ch.page_start}-${ch.page_end} беттер)</span>
              </div>
              <a href="#/read/${book.id}/${ch.idx}" class="btn btn-secondary btn-sm">
                Оқу →
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Байланысты ойын тапсырмалары -->
    ${tasks && tasks.length > 0 ? `
      <div class="card">
        <div class="card-title">
          <span>🎯</span> Ойын тапсырмалары (${tasks.length})
        </div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${tasks.map(t => {
            const isUnlocked = t.state?.unlocked;
            const isDone = t.state?.done;
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; background:${isDone ? '#f0fdf4' : 'var(--bg-card)'}; border:1px solid ${isDone ? '#86efac' : 'var(--border-color)'}; padding:12px 16px; border-radius:var(--radius-sm);">
                <div>
                  <div style="font-weight:700; font-size:15px; display:flex; align-items:center; gap:8px;">
                    <span>${isDone ? '✅' : isUnlocked ? '🎯' : '🔒'}</span>
                    <span>${t.title}</span>
                  </div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                    ${t.stage_no}-кезең тапсырмасы
                  </div>
                </div>
                <div>
                  ${isUnlocked ? `
                    <a href="#/play/${t.id}" class="btn ${isDone ? 'btn-secondary' : 'btn-primary'} btn-sm">
                      ${isDone ? 'Қайта ойнау' : 'Бастау'}
                    </a>
                  ` : `
                    <span style="font-size:12px; color:var(--text-muted);">Кезеңге жеткенде ашылады</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Рефлексия жазу / қарау блогы -->
    ${shelf ? `
      <div class="card">
        <div class="card-title">
          <span>💡</span> Кітап туралы қорытынды ой (Рефлексия)
        </div>
        ${reflection ? `
          <div style="background:var(--bg-soft); padding:14px; border-radius:var(--radius-sm); margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px;">
              <strong>Сенің жазған пікірің:</strong>
              <span class="badge" style="background:${reflection.status === 'accepted' ? '#dcfce7' : '#fef3c7'}; color:${reflection.status === 'accepted' ? '#166534' : '#92400e'};">
                ${reflection.status === 'accepted' ? '✓ Мұғалім қабылдады (+20 XP)' : '⏳ Тексеруде'}
              </span>
            </div>
            <p style="font-size:14px; font-style:italic;">«${reflection.text}»</p>
          </div>
          ${reflection.feedback ? `
            <div style="border-left:3px solid var(--accent-gold); padding-left:10px; font-size:13px; color:#92400e;">
              <strong>Мұғалім пікірі:</strong> ${reflection.feedback}
            </div>
          ` : ''}
        ` : `
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
            Кітаптан не түйдің? Кейіпкердің іс-әрекетінен қандай өнеге алдың? Өз ойыңды жазып, мұғалімге жібер.
          </p>
          <div class="form-group">
            <textarea class="form-textarea" id="inp-reflection-text" rows="4" placeholder="Кемінде 30 таңба жазыңыз..."></textarea>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-send-reflection">Ойымды жіберу (+20 XP)</button>
        `}
      </div>
    ` : ''}
  `;

  bindEvents(container, book, data);
}

function bindEvents(container, book, data) {
  // Саяхатты бастау
  const startBtn = container.querySelector('#btn-start-reading');
  if (startBtn) {
    startBtn.onclick = async () => {
      try {
        await api.updateShelfBook(book.id, { status: 'reading', goalText: 'Күніне 10 минут оқу' });
        showToast('Саяхат басталды!', 'success');
        renderBookDetailView(container, book.id);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // Оқуды белгілеу
  const logBtn = container.querySelector('#btn-add-log');
  if (logBtn) {
    logBtn.onclick = () => {
      openModal({
        title: t('log_modal_title'),
        bodyHtml: `
          <div class="form-group">
            <label class="form-label">${t('log_last_page')}</label>
            <input type="number" class="form-input" id="inp-d-page" min="1" max="${book.total_pages || 5000}" required>
          </div>
          <div class="form-group">
            <label class="form-label">${t('log_minutes')}</label>
            <input type="number" class="form-input" id="inp-d-minutes" value="10">
          </div>
          <div class="form-group">
            <label class="form-label">${t('log_note')}</label>
            <textarea class="form-textarea" id="inp-d-note" rows="3"></textarea>
          </div>
        `,
        saveText: t('log_save_btn'),
        onSave: async (modalEl) => {
          const page = Number(modalEl.querySelector('#inp-d-page').value);
          const minutes = Number(modalEl.querySelector('#inp-d-minutes').value) || null;
          const note = modalEl.querySelector('#inp-d-note').value;
          if (!page) return false;
          try {
            const res = await api.addLog(book.id, { page, minutes, note });
            launchConfetti();
            showToast(`Оқу белгіленді! +${res.xp_awarded} XP`, 'success');
            renderBookDetailView(container, book.id);
            return true;
          } catch (err) {
            showToast(err.message, 'error');
            return false;
          }
        }
      });
    };
  }

  // Кейіпкер квизі
  const quizBtn = container.querySelector('#btn-character-quiz');
  if (quizBtn) {
    quizBtn.onclick = () => {
      openCharacterQuizModal(book.id, () => {
        renderBookDetailView(container, book.id);
      });
    };
  }

  // Рефлексия жіберу
  const reflBtn = container.querySelector('#btn-send-reflection');
  if (reflBtn) {
    reflBtn.onclick = async () => {
      const text = container.querySelector('#inp-reflection-text').value.trim();
      if (text.length < 30) {
        showToast('Кемінде 30 таңбадан тұратын мазмұнды ой жазыңыз', 'error');
        return;
      }
      try {
        await api.sendReflection(book.id, text);
        showToast('Рефлексия тексеруге жіберілді!', 'success');
        renderBookDetailView(container, book.id);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
}
