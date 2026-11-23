// Кітаптың толық парақшасы: бөлімдер, саяхат картасы, тапсырмалар, рефлексия
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal, launchConfetti, openCharacterQuizModal, openCertificateModal } from '../ui.js';
import { openComprehensionTestModal, openAnalysisModal } from './comprehension-modal.js';
import { openQrCardModal } from './qr-library.js';

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

    let compData = null;
    try {
      compData = await api.getComprehension(bookId);
    } catch {
      compData = null;
    }

    renderLayout(container, { ...data, quiz, compData });
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
  }
}

function renderLayout(container, data) {
  const { book, chapters, shelf, journey, tasks, reflection, logs, compData } = data;
  const isReading = shelf?.status === 'reading';
  const isFinished = shelf?.status === 'finished';

  const stageNames = [t('stage_1'), t('stage_2'), t('stage_3'), t('stage_4'), t('stage_5')];

  container.innerHTML = `
    <div style="margin-bottom:16px;">
      <a href="#/qr-library" class="btn btn-secondary btn-sm">← QR-Кітапханаға қайту</a>
    </div>

    <!-- Кітап туралы негізгі ақпарат -->
    <div class="card">
      <div style="display:flex; gap:20px; flex-wrap:wrap;">
        <div style="width:90px; height:120px; background:${book.cover_color || '#3b82f6'}; border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; font-size:48px; color:#fff;">
          ${book.cover_emoji || '📖'}
        </div>
        <div style="flex:1; min-width:260px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <h2 style="font-size:22px; font-weight:800;">${book?.title || 'Кітап'}</h2>
          </div>
          <div style="font-size:14px; color:var(--text-muted); margin-bottom:8px;">${book.author || ''}</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
            <span class="badge">${book.grade_min || 1}-${book.grade_max || 11} сынып</span>
            <span class="badge">${book.genre || 'Әңгіме'}</span>
            <span class="badge">${book.total_pages ? `${book.total_pages} бет` : 'Бет саны белгісіз'}</span>
          </div>
          <p style="font-size:14px; line-height:1.5; color:#374151;">${book.description || ''}</p>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px; flex-wrap:wrap;">
        ${!isReading && !isFinished ? `
          <button class="btn btn-primary" id="btn-start-reading">
            🚀 ${t('shelf_btn_start_journey')}
          </button>
        ` : ''}
        ${chapters.length > 0 ? `
          <a href="#/read/${book.id}/1" class="btn btn-primary" style="background:#0284c7; border-color:#0369a1;">
            📖 1-бөлімнен оқу
          </a>
        ` : ''}
        ${isReading || isFinished ? `
          <button class="btn btn-accent" id="btn-add-log">
            ✍️ Оқуды белгілеу
          </button>
        ` : ''}
          ${isFinished ? `
            <button class="btn btn-primary" id="btn-show-certificate" style="background:#d97706; border-color:#b45309; font-weight:700;">
              🏆 Үздік оқырман сертификаты
            </button>
          ` : ''}
          ${data.quiz && (data.quiz.character_name || data.quiz.quiz?.character_name) ? `
            <button class="btn btn-secondary" id="btn-character-quiz" style="border:2px solid #f59e0b; background:#fffbeb; font-weight:700; color:#92400e;">
              🎯 ${data.quiz.character_name || data.quiz.quiz?.character_name || 'Кейіпкер'} сұрақтары ${(data.quiz.is_completed || data.quiz.completed) ? '✅ (Өтілген)' : '(+15 XP, +2 💎)'}
            </button>
          ` : ''}
        <button class="btn btn-secondary" id="btn-view-book-qr" style="border:1px solid #cbd5e1; font-weight:700;">
          📲 Кітаптың QR-коды
        </button>
        <a href="#/diary?bookId=${book.id}" class="btn btn-secondary" style="border:1px solid #0d9488; color:#0f766e; background:#f0fdfa; font-weight:700;">
          📝 Оқырман күнделігі
        </a>
        <a href="#/ai-assistant?bookId=${book.id}" class="btn btn-secondary" style="border:1px solid #8b5cf6; color:#6d28d9; background:#f5f3ff; font-weight:700;">
          🦉 AI Көмекшімен талдау
        </a>
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

    <!-- 🧠 READING COMPREHENSION — КІТАПТЫ ТҮСІНУ ЖӘНЕ ТАЛДАУ МОДУЛІ -->
    <div class="card" style="border:1px solid #93c5fd; background:linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%); padding:20px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; border-bottom:1px solid #cbd5e1; padding-bottom:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:26px;">🧠</span>
          <div>
            <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin:0;">
              Reading Comprehension · Кітапты түсіну және талдау
            </h3>
            <div style="font-size:12px; color:var(--text-muted);">
              Мазмұндық тест (5–10 сұрақ), кейіпкерлерді сипаттау, идеясы мен оқиғалар хронологиясы
            </div>
          </div>
        </div>
        <span style="background:#dbeafe; color:#1e40af; font-size:11px; font-weight:800; padding:3px 10px; border-radius:12px;">
          Автоматты бағалау + Мұғалім сараптамасы
        </span>
      </div>

      <!-- 1. МАЗМҰНДЫҚ ТЕСТ БЛОГЫ -->
      <div style="background:#fff; border:1px solid #bfdbfe; border-radius:var(--radius-sm); padding:16px; margin-bottom:16px; box-shadow:0 2px 8px rgba(59,130,246,0.06);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:20px;">🎯</span>
              <h4 style="font-size:16px; font-weight:800; color:#1e3a8a; margin:0;">
                1. Шығарма бойынша мазмұндық тест
              </h4>
              ${compData?.has_test ? `
                <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">
                  ${compData.test.questions_count} сұрақ
                </span>
              ` : ''}
            </div>
            <p style="font-size:13px; color:var(--text-muted); margin:4px 0 0 0;">
              ${compData?.has_test 
                ? compData.test.description || 'Шығарманың нақты мазмұны бойынша бір дұрыс жауапты тест сұрақтары' 
                : 'Бұл кітаптың мазмұндық тесті әзірленуде. Мұғалім өз сұрақтарын қоса алады.'}
            </p>
          </div>

          <div>
            ${compData?.has_test ? `
              ${compData.test.is_completed ? `
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <div style="text-align:right;">
                    <div style="font-size:11px; font-weight:700; color:var(--text-muted);">Соңғы нәтиже:</div>
                    <div style="font-size:16px; font-weight:900; color:#16a34a;">
                      ${compData.test.last_attempt.score} / ${compData.test.last_attempt.total} (${compData.test.last_attempt.percent}%)
                    </div>
                  </div>
                  <button class="btn btn-secondary btn-sm" id="btn-open-comprehension-test" style="border-color:#86efac; color:#166534; font-weight:700;">
                    🔍 Қателерді көру / Қайта тапсыру
                  </button>
                </div>
              ` : `
                <button class="btn btn-primary btn-sm" id="btn-open-comprehension-test" style="background:#2563eb; font-weight:700;">
                  🎯 Тестті бастау (+${compData.test.xp_reward} XP, +${compData.test.crystals_reward} 💎)
                </button>
              `}
            ` : `
              <span style="font-size:12px; color:var(--text-muted); font-style:italic;">Тест сұрақтары дайындалуда</span>
            `}
          </div>
        </div>

        ${compData?.test?.is_completed ? `
          <div style="margin-top:10px; padding-top:8px; border-top:1px dashed #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="font-size:12px; font-weight:700; color:#166534;">
              Түсіну деңгейі: <span style="background:#dcfce7; padding:2px 8px; border-radius:6px;">${compData.test.last_attempt.level_info.name}</span>
            </div>
            <div style="font-size:11px; color:var(--text-muted);">
              Тапсырылған күні: ${compData.test.last_attempt.created_at.slice(0, 10)}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- 2. ТЕРЕҢ ТАЛДАУ ТАПСЫРМАЛАРЫ (6 БАҒЫТ) -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="font-size:15px; font-weight:800; color:#0f172a; margin:0; display:flex; align-items:center; gap:6px;">
            <span>✍️</span> 2. Шығарманы терең талдау тапсырмалары (6 бағыт)
          </h4>
          <span style="font-size:12px; color:var(--text-muted);">
            Орындалғаны: <strong>${(compData?.analyses || []).length} / 6</strong>
          </span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
          ${[
            { code: 'character_analysis', icon: '👤', title: 'Кейіпкерлерді сипаттау', desc: 'Мінез-құлқы, сырт бейнесі мен іс-әрекеті' },
            { code: 'main_idea', icon: '💡', title: 'Негізгі идеясы', desc: 'Шығарманың басты өсиеті мен тәрбиелік мәні' },
            { code: 'event_sequence', icon: '📜', title: 'Оқиғалар реті', desc: 'Хронологиялық желіні ретке келтіру' },
            { code: 'personal_opinion', icon: '✍️', title: 'Өз пікірім мен толғау', desc: 'Кейіпкер орнында болсаң не істер едің?' },
            { code: 'favorite_quote', icon: '🔖', title: 'Ең ұнаған үзінді', desc: 'Әсерлі дәйексөз бен оның тағылымы' },
            { code: 'annotation', icon: '📝', title: 'Қысқаша аннотация', desc: 'Сыныптастарға арналған 3–5 сөйлемдік аңдатпа' }
          ].map(item => {
            const existing = (compData?.analyses || []).find(a => a.analysis_type === item.code);
            let statusBadge = '<span style="font-size:11px; color:var(--text-muted);">Әлі орындалмаған</span>';
            let cardBg = '#fff';
            let cardBorder = 'var(--border-color)';

            if (existing) {
              if (existing.status === 'accepted') {
                statusBadge = '<span style="color:#166534; font-weight:800; font-size:11px;">✓ Мұғалім қабылдады (+20 XP)</span>';
                cardBg = '#f0fdf4';
                cardBorder = '#86efac';
              } else if (existing.status === 'returned') {
                statusBadge = '<span style="color:#b91c1c; font-weight:800; font-size:11px;">⚠️ Қайта өңдеу қажет</span>';
                cardBg = '#fef2f2';
                cardBorder = '#fca5a5';
              } else {
                statusBadge = '<span style="color:#92400e; font-weight:800; font-size:11px;">⏳ Мұғалім тексеруінде</span>';
                cardBg = '#fffbeb';
                cardBorder = '#fcd34d';
              }
            }

            return `
              <div class="analysis-task-card" style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:var(--radius-sm); padding:12px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                    <span style="font-size:20px;">${item.icon}</span>
                    <div>${statusBadge}</div>
                  </div>
                  <div style="font-weight:800; font-size:13px; color:var(--text-main); margin-bottom:2px;">
                    ${item.title}
                  </div>
                  <div style="font-size:11px; color:var(--text-muted); line-height:1.3;">
                    ${item.desc}
                  </div>
                </div>

                ${existing?.feedback ? `
                  <div style="background:rgba(255,255,255,0.7); border-left:2px solid var(--accent-gold); padding:4px 6px; font-size:11px; color:#92400e; border-radius:2px;">
                    <strong>Мұғалім:</strong> ${existing.feedback}
                  </div>
                ` : ''}

                <div style="margin-top:4px;">
                  <button type="button" class="btn ${existing ? 'btn-secondary' : 'btn-primary'} btn-sm btn-block btn-open-analysis-task" data-type="${item.code}" style="font-size:11px; padding:6px 8px;">
                    ${existing ? (existing.status === 'accepted' ? 'Қайта қарау / Өзгерту' : 'Өзгерту / Толықтыру') : 'Орындау → (+10 XP)'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

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
      } catch (err) {}
      window.location.hash = `#/read/${book.id}/1`;
    };
  }

  // Кітаптың QR кодын қарау
  const qrBtn = container.querySelector('#btn-view-book-qr');
  if (qrBtn) {
    qrBtn.onclick = async () => {
      try {
        const res = await api.getBookQrCard(book.id);
        openQrCardModal({
          id: book.id,
          title: book.title,
          author: book.author,
          genre: book.genre,
          library_code: res.library_code,
          qr_url: res.qr_url,
          qr_svg: res.qr_svg
        });
      } catch (err) {
        showToast('QR кодты жүктеу қатесі: ' + err.message, 'error');
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

  // Сертификатты көру/жүктеу
  const certBtn = container.querySelector('#btn-show-certificate');
  if (certBtn) {
    certBtn.onclick = async () => {
      let nickname = 'Оқырман';
      try {
        const me = await api.me();
        if (me?.user?.nickname) nickname = me.user.nickname;
      } catch {}
      openCertificateModal(nickname, book.title, shelf?.finished_at);
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

  // Мазмұндық түсіну тесті
  const compTestBtn = container.querySelector('#btn-open-comprehension-test');
  if (compTestBtn) {
    compTestBtn.onclick = () => {
      openComprehensionTestModal(book.id, () => {
        renderBookDetailView(container, book.id);
      });
    };
  }

  // 6 бағыттық талдау тапсырмаларының батырмалары
  container.querySelectorAll('.btn-open-analysis-task').forEach((btn) => {
    btn.onclick = () => {
      const type = btn.getAttribute('data-type');
      openAnalysisModal(book.id, type, data.compData, () => {
        renderBookDetailView(container, book.id);
      });
    };
  });

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
