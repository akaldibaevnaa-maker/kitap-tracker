// ==============================================================================
// Reading Comprehension Modals — Мазмұндық тест пен талдау модальдары
// Толық қазақша интерфейс, интерактивті сұрақтар, автоматты бағалау, қателерді көрсету
// ==============================================================================
import { api } from '../api.js';
import { openModal, showToast, launchConfetti } from '../ui.js';

export const ANALYSIS_LABELS = {
  character_analysis: {
    title: '👤 Кейіпкерлерді сипаттау',
    prompt: 'Басты немесе сүйікті кейіпкеріңізді таңдап, оның мінез-құлқы, сырт келбеті, іс-әрекеті мен жасаған таңдауларына баға беріңіз.',
    placeholder: 'Мысалы: Кейіпкердің ең басты қасиеті — оның ақкөңілдігі мен шыншылдығы...'
  },
  main_idea: {
    title: '💡 Шығарманың негізгі идеясы',
    prompt: 'Автор бұл шығарма арқылы оқырманға қандай басты өсиет айтқысы келді? Шығарманың тәрбиелік мәні неде?',
    placeholder: 'Шығарманың негізгі идеясы — адам өзінің ішкі жан дүниесін таза ұстап...'
  },
  event_sequence: {
    title: '📜 Оқиғалардың ретін орналастыру',
    prompt: 'Кітаптағы оқиғалардың басталуы, дамуы, шарықтау шегі мен шешімін рет-ретімен дұрыс хронологиялық жүйеге қойыңыз.',
    placeholder: 'Оқиғалар желісіне қысқаша қорытынды ойыңызды қосыңыз...'
  },
  personal_opinion: {
    title: '✍️ Өз пікірім мен ой-толғау',
    prompt: 'Кітап сізге қалай әсер етті? Егер кейіпкердің орнында болсаңыз, қандай шешім қабылдар едіңіз? Өмірлік тәжірибеңізбен байланыстырыңыз.',
    placeholder: 'Менің ойымша, бұл кітап оқырманды бейжай қалдырмайды, өйткені...'
  },
  favorite_quote: {
    title: '🔖 Ең ұнаған үзінді (дәйексөз)',
    prompt: 'Кітаптан жаныңызға ең жақын, ерекше ұнаған үзіндіні немесе кейіпкер сөзін келтіріп, оның неліктен әсер еткенін түсіндіріңіз.',
    placeholder: 'Маған ұнаған үзінді: «...» Себебі бұл сөзде үлкен өмірлік шындық бар...'
  },
  annotation: {
    title: '📝 Қысқаша аннотация (аңдатпа)',
    prompt: 'Кітапты әлі оқымаған сыныптастарыңызға немесе достарыңызға қызықты етіп ұсыну үшін 3–5 сөйлемнен тұратын шағын аңдатпа жазыңыз.',
    placeholder: 'Бұл кітапта ... жайлы баяндалады. Қызықты оқиғалар мен құпияларға толы бұл шығарманы кез келген оқушыға оқуға кеңес беремін...'
  }
};

/**
 * 1. Мазмұндық тест модалін ашу (5-10 сұрақ, автоматты есептеу, қателерді көрсету)
 */
export async function openComprehensionTestModal(bookId, onComplete = null) {
  try {
    const res = await api.getComprehension(bookId);
    if (!res || !res.has_test || !res.test) {
      showToast('Бұл кітапқа әзірге мазмұндық тест дайындалуда!', 'info');
      return;
    }

    const test = res.test;
    const questions = test.questions || [];
    if (!questions.length) {
      showToast('Тест сұрақтары табылмады!', 'warning');
      return;
    }

    let currentIdx = 0;
    const answers = new Array(questions.length).fill(null);

    function buildQuizHtml() {
      const q = questions[currentIdx];
      const selected = answers[currentIdx];
      const isLast = currentIdx === questions.length - 1;
      const allAnswered = answers.every((a) => a !== null);
      const answeredCount = answers.filter((a) => a !== null).length;
      const progressPercent = Math.round((answeredCount / questions.length) * 100);

      return `
        <div style="font-family:inherit;">
          <!-- Тақырып пен марапат белгісі -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border-color);">
            <div>
              <span style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">
                Мазмұндық түсіну тесті · ${res.book.title}
              </span>
            </div>
            <div style="display:flex; gap:6px;">
              <span style="background:#fef08a; color:#854d0e; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">
                ⭐ +${test.xp_reward} XP · 💎 +${test.crystals_reward} Кристалл
              </span>
            </div>
          </div>

          <!-- Сұрақ барысы мен индикаторы -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:12px; font-weight:700; color:var(--text-muted);">
            <span>Сұрақ: <strong>${currentIdx + 1} / ${questions.length}</strong></span>
            <span>Жауап берілген: <strong>${answeredCount} / ${questions.length}</strong> (${progressPercent}%)</span>
          </div>

          <!-- Прогресс жолағы -->
          <div class="progress-bar-wrap" style="height:6px; margin-bottom:16px;">
            <div class="progress-bar-fill" style="width:${progressPercent}%; background:linear-gradient(90deg, #3b82f6, #22c55e);"></div>
          </div>

          <!-- Сұрақ мәтіні -->
          <div style="background:#fff; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:18px; margin-bottom:16px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span style="background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px;">
                ${currentIdx + 1}-СҰРАҚ
              </span>
            </div>
            <h4 style="font-size:16px; font-weight:800; color:var(--text-main); margin:0 0 16px 0; line-height:1.4;">
              ${q.question}
            </h4>

            <!-- Нұсқалар (А, Б, В, Г) -->
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${q.options.map((opt, oIdx) => {
                const isChosen = selected === oIdx;
                let optStyle = 'background:var(--bg-soft); border:1px solid var(--border-color); color:var(--text-main);';
                if (isChosen) {
                  optStyle = 'background:#eff6ff; border:2px solid #2563eb; font-weight:700; color:#1e40af;';
                }
                const letter = ['А', 'Б', 'В', 'Г', 'Д'][oIdx] || `${oIdx + 1}`;
                return `
                  <button type="button" class="btn btn-block comp-opt-btn" data-opt="${oIdx}" style="${optStyle} text-align:left; padding:12px 14px; font-size:14px; border-radius:var(--radius-sm); cursor:pointer; justify-content:flex-start; line-height:1.4;">
                    <span style="display:inline-block; width:26px; height:26px; border-radius:50%; background:${isChosen ? '#2563eb' : '#fff'}; color:${isChosen ? '#fff' : 'var(--text-main)'}; border:1px solid ${isChosen ? '#2563eb' : 'var(--border-color)'}; text-align:center; line-height:24px; font-size:12px; margin-right:12px; font-weight:800; flex-shrink:0;">
                      ${letter}
                    </span>
                    <span style="flex:1;">${opt}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Сұрақтар навигаторы (нөмірлер бойынша секіру) -->
          <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin-bottom:16px;">
            ${questions.map((_, idx) => {
              const isAns = answers[idx] !== null;
              const isCur = currentIdx === idx;
              let bg = isAns ? '#bbf7d0' : '#f1f5f9';
              let border = isCur ? '2px solid #2563eb' : '1px solid #cbd5e1';
              let col = isCur ? '#1d4ed8' : '#334155';
              return `
                <button type="button" class="btn btn-sm comp-jump-btn" data-idx="${idx}" style="width:32px; height:32px; padding:0; border-radius:50%; background:${bg}; border:${border}; color:${col}; font-weight:${isCur ? '900' : '600'}; font-size:12px;">
                  ${idx + 1}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Навигация батырмалары -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-comp-prev" ${currentIdx === 0 ? 'disabled style="opacity:0.5;"' : ''}>
              ← Алдыңғы
            </button>
            <div style="display:flex; gap:10px;">
              ${!isLast ? `
                <button type="button" class="btn btn-secondary btn-sm" id="btn-comp-next">
                  Келесі →
                </button>
              ` : `
                <button type="button" class="btn btn-primary btn-sm" id="btn-comp-finish" ${!allAnswered ? 'disabled style="opacity:0.5;"' : ''}>
                  🎯 Аяқтау және тексеру
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }

    openModal({
      title: `🧠 «${res.book.title}» түсіну тесті`,
      bodyHtml: `<div id="comprehension-modal-root">${buildQuizHtml()}</div>`,
      saveText: null
    });

    const root = document.getElementById('comprehension-modal-root');

    function attachEvents() {
      if (!root) return;

      // Нұсқаны таңдау
      root.querySelectorAll('.comp-opt-btn').forEach((btn) => {
        btn.onclick = () => {
          const optIdx = Number(btn.getAttribute('data-opt'));
          answers[currentIdx] = optIdx;
          root.innerHTML = buildQuizHtml();
          attachEvents();
        };
      });

      // Нөмірлер бойынша секіру
      root.querySelectorAll('.comp-jump-btn').forEach((btn) => {
        btn.onclick = () => {
          currentIdx = Number(btn.getAttribute('data-idx'));
          root.innerHTML = buildQuizHtml();
          attachEvents();
        };
      });

      // Алдыңғы батырма
      const prevBtn = root.querySelector('#btn-comp-prev');
      if (prevBtn) {
        prevBtn.onclick = () => {
          if (currentIdx > 0) {
            currentIdx--;
            root.innerHTML = buildQuizHtml();
            attachEvents();
          }
        };
      }

      // Келесі батырма
      const nextBtn = root.querySelector('#btn-comp-next');
      if (nextBtn) {
        nextBtn.onclick = () => {
          if (currentIdx < questions.length - 1) {
            currentIdx++;
            root.innerHTML = buildQuizHtml();
            attachEvents();
          }
        };
      }

      // Аяқтау және тексеру батырмасы
      const finishBtn = root.querySelector('#btn-comp-finish');
      if (finishBtn) {
        finishBtn.onclick = async () => {
          finishBtn.disabled = true;
          finishBtn.innerText = 'Есептелуде...';

          try {
            const submitRes = await api.submitComprehensionTest(bookId, answers);
            if (submitRes.percent >= 75) {
              launchConfetti();
            }

            // Нәтижелерді және қателерді егжей-тегжейлі көрсету
            renderResultHtml(root, submitRes, res.book);
            if (onComplete) onComplete(submitRes);
          } catch (err) {
            showToast('Қате: ' + err.message, 'error');
            finishBtn.disabled = false;
            finishBtn.innerText = '🎯 Аяқтау және тексеру';
          }
        };
      }
    }

    attachEvents();
  } catch (err) {
    showToast('Тестті жүктеу мүмкін болмады: ' + err.message, 'error');
  }
}

/**
 * Тест нәтижесін, пайыздық бағасын және қате жауаптар түсіндірмесін көрсету
 */
function renderResultHtml(container, result, book) {
  const { score, total, percent, level_name, level_badge, details, xp_awarded, crystals_awarded } = result;
  const isHigh = percent >= 75;
  const isMedium = percent >= 50 && percent < 75;

  let badgeColor = '#166534';
  let badgeBg = '#dcfce7';
  if (!isHigh && isMedium) { badgeColor = '#854d0e'; badgeBg = '#fef08a'; }
  else if (!isHigh && !isMedium) { badgeColor = '#991b1b'; badgeBg = '#fee2e2'; }

  container.innerHTML = `
    <div style="font-family:inherit;">
      <!-- Жоғарғы нәтиже карточкасы -->
      <div style="text-align:center; padding:20px; background:linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border:1px solid #86efac; border-radius:var(--radius-sm); margin-bottom:20px;">
        <div style="font-size:48px; margin-bottom:8px;">${isHigh ? '🎉' : isMedium ? '📖' : '💡'}</div>
        <div style="display:inline-block; background:${badgeBg}; color:${badgeColor}; font-weight:800; font-size:12px; padding:3px 12px; border-radius:12px; margin-bottom:8px;">
          ${level_badge} · ${level_name}
        </div>
        <h3 style="font-size:24px; font-weight:900; color:#14532d; margin:0 0 6px 0;">
          Нәтиже: ${score} / ${total} дұрыс (${percent}%)
        </h3>
        <p style="font-size:13px; color:#166534; margin:0;">
          «${book.title}» шығармасы бойынша мазмұндық түсіну деңгейіңіз автоматты түрде есептелді.
        </p>

        ${xp_awarded > 0 ? `
          <div style="display:inline-flex; gap:10px; align-items:center; background:#fff; border:1px solid #86efac; padding:6px 14px; border-radius:20px; margin-top:12px; font-weight:800; font-size:13px;">
            <span style="color:#16a34a;">+${xp_awarded} XP ұпайы берілді!</span>
            ${crystals_awarded > 0 ? `<span style="color:#d97706;">+${crystals_awarded} 💎 кристалл</span>` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Қателер мен әр сұрақтың толық талдауы (Review) -->
      <h4 style="font-size:15px; font-weight:800; color:var(--text-main); margin:0 0 12px 0;">
        🔍 Сұрақтар мен қателерді талдау:
      </h4>

      <div style="display:flex; flex-direction:column; gap:12px; max-height:360px; overflow-y:auto; padding-right:4px;">
        ${(details || []).map((d, i) => `
          <div style="background:#fff; border:1px solid ${d.is_correct ? '#86efac' : '#fca5a5'}; border-left:4px solid ${d.is_correct ? '#22c55e' : '#ef4444'}; border-radius:var(--radius-sm); padding:12px 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-weight:800; font-size:13px; color:${d.is_correct ? '#166534' : '#991b1b'};">
                ${d.is_correct ? '✓ Дұрыс жауап берілді' : '✗ Қате жауап'} (${i + 1}-сұрақ)
              </span>
            </div>
            <div style="font-size:14px; font-weight:700; color:var(--text-main); margin-bottom:8px;">
              ${d.question}
            </div>

            <!-- Сенің жауабың мен дұрыс жауап -->
            <div style="font-size:13px; display:flex; flex-direction:column; gap:4px; margin-bottom:6px;">
              <div>
                <span style="color:var(--text-muted);">Сенің таңдауың:</span>
                <strong style="color:${d.is_correct ? '#166534' : '#b91c1c'};">
                  ${d.selected !== null ? d.options[d.selected] : 'Жауап берілмеген'}
                </strong>
              </div>
              ${!d.is_correct ? `
                <div>
                  <span style="color:var(--text-muted);">Дұрыс нұсқа:</span>
                  <strong style="color:#15803d;">${d.correct_text}</strong>
                </div>
              ` : ''}
            </div>

            <!-- Түсініктемесі (Explanation) -->
            ${d.explanation ? `
              <div style="background:var(--bg-soft); border-radius:4px; padding:6px 10px; font-size:12px; color:var(--text-muted); font-style:italic;">
                💡 <strong>Түсіндірме:</strong> ${d.explanation}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <div style="margin-top:16px; text-align:right;">
        <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('modal-root').innerHTML=''">
          Жабу
        </button>
      </div>
    </div>
  `;
}

/**
 * 2. Терең талдау тапсырмасының модалін ашу (6 бағыт)
 */
export async function openAnalysisModal(bookId, type, compData, onComplete = null) {
  const meta = ANALYSIS_LABELS[type] || {
    title: 'Талдау тапсырмасы',
    prompt: 'Шығарма бойынша өз ойыңызды жазыңыз.',
    placeholder: 'Талдау мәтінін енгізіңіз...'
  };

  const defaultSequence = compData?.default_sequence || [];
  let sequenceList = [...defaultSequence];

  function buildAnalysisHtml() {
    return `
      <div style="font-family:inherit;">
        <!-- Бағыт сипаттамасы -->
        <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:12px 14px; margin-bottom:16px;">
          <div style="font-size:13px; color:var(--text-main); font-weight:600; line-height:1.4;">
            ${meta.prompt}
          </div>
        </div>

        <form id="form-analysis-submit">
          <!-- Кейіпкерлерді сипаттау үшін қосымша өріс -->
          ${type === 'character_analysis' ? `
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" style="font-weight:700;">Кейіпкердің есімі:</label>
              <input type="text" class="form-input" id="inp-analysis-char-name" placeholder="Мысалы: Қожаберген / Ақбота / Ханзада..." required>
            </div>
          ` : ''}

          <!-- Оқиғалардың ретін орналастыру (Интерактивті реттеу) -->
          ${type === 'event_sequence' && sequenceList.length > 0 ? `
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" style="font-weight:700;">
                Оқиғаларды дұрыс ретпен орналастырыңыз (Жоғары/Төмен батырмаларын басыңыз):
              </label>
              <div id="sequence-items-container" style="display:flex; flex-direction:column; gap:8px;">
                ${sequenceList.map((item, idx) => `
                  <div style="display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid var(--border-color); border-radius:6px; padding:8px 12px;">
                    <div style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600;">
                      <span style="background:#e0f2fe; color:#0369a1; width:22px; height:22px; border-radius:50%; text-align:center; line-height:22px; font-size:11px; font-weight:800;">
                        ${idx + 1}
                      </span>
                      <span>${item.text}</span>
                    </div>
                    <div style="display:flex; gap:4px;">
                      <button type="button" class="btn btn-secondary btn-sm seq-btn-up" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity:0.4;"' : ''}>▲</button>
                      <button type="button" class="btn btn-secondary btn-sm seq-btn-down" data-idx="${idx}" ${idx === sequenceList.length - 1 ? 'disabled style="opacity:0.4;"' : ''}>▼</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Ұнаған үзінді үшін бет нөмірі мен авторы -->
          ${type === 'favorite_quote' ? `
            <div style="display:grid; grid-template-columns:1fr 120px; gap:10px; margin-bottom:12px;">
              <div class="form-group">
                <label class="form-label" style="font-weight:700;">Үзінді кімнің сөзі / кітап авторы:</label>
                <input type="text" class="form-input" id="inp-analysis-quote-author" placeholder="Мысалы: Түлкі / Қожа / Автор...">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-weight:700;">Бет нөмірі:</label>
                <input type="number" class="form-input" id="inp-analysis-quote-page" placeholder="Бет №" min="1">
              </div>
            </div>
          ` : ''}

          <!-- Негізгі талдау мәтіні -->
          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label" style="font-weight:700;">Сіздің жазбаша талдауыңыз бен ой-тұжырымыңыз:</label>
            <textarea class="form-textarea" id="inp-analysis-content" rows="6" placeholder="${meta.placeholder}" required style="min-height:120px; font-size:14px; line-height:1.5;"></textarea>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
              💡 Жазбаңыз сақталған соң, мұғалім кабинетіне тексеруге жіберіледі (+10 XP).
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-root').innerHTML=''">
              Бас тарту
            </button>
            <button type="submit" class="btn btn-primary btn-sm" id="btn-submit-analysis">
              🚀 Тексеруге жіберу (+10 XP)
            </button>
          </div>
        </form>
      </div>
    `;
  }

  openModal({
    title: meta.title,
    bodyHtml: `<div id="analysis-modal-root">${buildAnalysisHtml()}</div>`,
    saveText: null
  });

  const root = document.getElementById('analysis-modal-root');

  function attachAnalysisEvents() {
    if (!root) return;

    // Оқиғаларды жоғары/төмен жылжыту
    root.querySelectorAll('.seq-btn-up').forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute('data-idx'));
        if (idx > 0) {
          const temp = sequenceList[idx - 1];
          sequenceList[idx - 1] = sequenceList[idx];
          sequenceList[idx] = temp;
          root.innerHTML = buildAnalysisHtml();
          attachAnalysisEvents();
        }
      };
    });

    root.querySelectorAll('.seq-btn-down').forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute('data-idx'));
        if (idx < sequenceList.length - 1) {
          const temp = sequenceList[idx + 1];
          sequenceList[idx + 1] = sequenceList[idx];
          sequenceList[idx] = temp;
          root.innerHTML = buildAnalysisHtml();
          attachAnalysisEvents();
        }
      };
    });

    const form = root.querySelector('#form-analysis-submit');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const content = root.querySelector('#inp-analysis-content').value.trim();
        if (!content) {
          showToast('Талдау мәтінін енгізіңіз!', 'warning');
          return;
        }

        const submitBtn = root.querySelector('#btn-submit-analysis');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Жіберілуде...';

        try {
          const payload = {
            analysis_type: type,
            title: meta.title,
            content,
            character_name: root.querySelector('#inp-analysis-char-name')?.value.trim() || null,
            quote_author: root.querySelector('#inp-analysis-quote-author')?.value.trim() || null,
            quote_page: root.querySelector('#inp-analysis-quote-page')?.value ? Number(root.querySelector('#inp-analysis-quote-page').value) : null,
            sequence_items: type === 'event_sequence' ? sequenceList : null
          };

          const res = await api.submitComprehensionAnalysis(bookId, payload);
          showToast(res.message || 'Талдау сәтті жіберілді!', 'success');
          document.getElementById('modal-root').innerHTML = '';
          if (onComplete) onComplete(res);
        } catch (err) {
          showToast('Қате: ' + err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.innerText = '🚀 Тексеруге жіберу (+10 XP)';
        }
      };
    }
  }

  attachAnalysisEvents();
}
