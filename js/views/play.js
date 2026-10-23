// «Ойын алаңы» — Интерактивті оқу ойындары және оқыту логикасы
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast } from '../ui.js';

export async function renderPlayView(container, taskId = null) {
  if (taskId) {
    return renderSingleTask(container, taskId);
  }

  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">Ойын алаңы жүктелуде...</p>
    </div>
  `;

  try {
    const data = await api.getPlayDashboard();
    renderDashboard(container, data);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
  }
}

function renderDashboard(container, data) {
  const { books, no_task_books } = data;

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:24px; font-weight:800; color:var(--text-main);">
        🎯 ${t('game_title')}
      </h2>
      <p style="font-size:14px; color:var(--text-muted);">${t('game_select_instruction')}</p>
    </div>

    ${books.length === 0 ? `
      <div class="card" style="text-align:center; padding:40px;">
        <div style="font-size:40px; margin-bottom:12px;">📚</div>
        <p style="font-weight:700; margin-bottom:8px;">Ойын тапсырмалары әлі ашылмаған</p>
        <p style="font-size:14px; color:var(--text-muted); margin-bottom:16px;">
          Алдымен кітапты оқып, беттерін белгіле. Саяхат картасының кезеңдері ашылған сайын жаңа ойындар пайда болады!
        </p>
        <a href="#/shelf" class="btn btn-primary">Кітап сөресіне өту</a>
      </div>
    ` : `
      <div style="display:flex; flex-direction:column; gap:20px;">
        ${books.map(b => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:40px; height:50px; background:${b.book.cover_color}; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:20px; color:#fff;">
                  ${b.book.cover_emoji}
                </div>
                <div>
                  <h3 style="font-size:18px; font-weight:700;">${b.book.title}</h3>
                  <div style="font-size:12px; color:var(--text-muted);">${b.book.author}</div>
                </div>
              </div>
              <div>
                <a href="#/book/${b.book.id}" class="btn btn-secondary btn-sm">Кітап картасы</a>
              </div>
            </div>

            <!-- Тапсырмалар тізімі -->
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
              ${b.tasks.map(t => {
                const isUnlocked = t.unlocked;
                const isDone = t.done;
                return `
                  <div style="background:${isDone ? '#f0fdf4' : isUnlocked ? 'var(--bg-soft)' : '#f9fafb'}; border:1px solid ${isDone ? '#86efac' : 'var(--border-color)'}; padding:14px; border-radius:var(--radius-sm); display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span class="badge">${t.stage_no}-кезең</span>
                        <span>${isDone ? '✅ Орындалды' : isUnlocked ? '🔓 Ашық' : '🔒 Құлыптаулы'}</span>
                      </div>
                      <div style="font-weight:700; font-size:15px; margin-bottom:6px;">${t.title}</div>
                      <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
                        ${getTaskTypeName(t.type)}
                      </div>
                    </div>
                    <div>
                      ${isUnlocked ? `
                        <a href="#/play/${t.id}" class="btn ${isDone ? 'btn-secondary' : 'btn-primary'} btn-sm btn-block">
                          ${isDone ? 'Қайта ойнау (жаттығу)' : 'Бастау (+10 XP)'}
                        </a>
                      ` : `
                        <button class="btn btn-secondary btn-sm btn-block" disabled style="opacity:0.6;">
                          ${t.lock?.reason === 'page' ? `${t.lock.page}-бетті оқыған соң ашылады` : 'Алдыңғы кезеңді орында'}
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function getTaskTypeName(type) {
  const map = {
    sequence: '«Оқиғалар тізбегі» (Хронология)',
    character: '«Кейіпкерді таны» (Сипаттама)',
    who_said: '«Кім айтты?» (Сәйкестендіру)',
    vocab: '«Сөз қазынасы» (Жаңа сөздер)',
    evidence: '«Дәлелді тап» (Мәтін үзіндісі)',
    choice: '«Кейіпкердің таңдауы» (Талдау)',
    creative: '«Шығармашылық шеберхана» (Эссе/хат)'
  };
  return map[type] || 'Ойын тапсырмасы';
}

// -------------------------------------------------------------
// ЖЕКЕ ОЙЫНДЫ ОЙНАУ БЕТІ (ҚОЛДАУШЫ КЕРІ БАЙЛАНЫС ЛОГИКАСЫМЕН)
// -------------------------------------------------------------
async function renderSingleTask(container, taskId) {
  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">Тапсырма дайындалуда...</p>
    </div>
  `;

  try {
    const data = await api.getTask(taskId);
    renderTaskPlayboard(container, data);
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="color:var(--danger-color);">
        <p>Тапсырманы ашу мүмкін болмады: ${err.message}</p>
        <a href="#/play" class="btn btn-secondary btn-sm" style="margin-top:10px;">← Ойын алаңына қайту</a>
      </div>
    `;
  }
}

function renderTaskPlayboard(container, data) {
  const { task, book, state, progress, response, next } = data;
  const isAuto = ['sequence', 'character', 'who_said', 'vocab', 'evidence'].includes(task.type);

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <a href="#/play" class="btn btn-secondary btn-sm">← Ойын алаңына қайту</a>
      <span style="font-size:13px; color:var(--text-muted); font-weight:600;">
        ${book.title} • ${task.stage_no}-кезең
      </span>
    </div>

    <div class="game-task-box">
      <!-- Басы -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
        <div>
          <span class="badge" style="background:#e0f2fe; color:#0369a1; margin-bottom:6px; display:inline-block;">
            ${getTaskTypeName(task.type)}
          </span>
          <h2 style="font-size:22px; font-weight:800;">${task.title}</h2>
        </div>
        ${progress?.completed ? `
          <span class="badge" style="background:#dcfce7; color:#166534; font-size:13px; padding:4px 10px;">
            ✓ Бұрын орындалған
          </span>
        ` : ''}
      </div>

      <!-- Бір сөйлемдік нұсқаулық пен үлгі -->
      <div class="game-instruction-banner">
        <strong>Нұсқаулық:</strong> ${task.instruction}
        ${task.example ? `<div class="example">💡 ${task.example}</div>` : ''}
      </div>

      <!-- Ойынның интерактивті аймағы -->
      <div id="game-interactive-area">
        ${renderGameComponent(task, response)}
      </div>

      <!-- Кері байланыс және келесі қадам аймағы -->
      <div id="game-feedback-area"></div>
    </div>
  `;

  bindGameEvents(container, task);
}

function renderGameComponent(task, response) {
  const p = task.payload || {};

  // 1. «Оқиғалар тізбегі» (Drag-n-drop немесе батырмамен)
  if (task.type === 'sequence') {
    const items = p.items || [];
    return `
      <div class="sequence-list" id="seq-list">
        ${items.map((it, idx) => `
          <div class="sequence-item" data-id="${it.id}">
            <span style="font-size:16px; margin-right:8px; color:var(--text-muted); font-weight:700;">${idx + 1}</span>
            <span class="text">${it.text}</span>
            <div class="sequence-controls">
              <button class="btn-arrow btn-seq-up" data-idx="${idx}" title="Жоғары жылжыту">↑</button>
              <button class="btn-arrow btn-seq-down" data-idx="${idx}" title="Төмен жылжыту">↓</button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary btn-block" id="btn-submit-answer">${t('game_btn_check')}</button>
    `;
  }

  // 2. «Кейіпкерді таны»
  if (task.type === 'character') {
    const qs = p.questions || [];
    return `
      <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:20px;">
        ${qs.map((q, idx) => `
          <div style="background:var(--bg-soft); padding:16px; border-radius:var(--radius-sm);" data-qid="${q.id}">
            <div style="font-weight:700; font-size:15px; margin-bottom:10px;">
              ${idx + 1}. «${q.prompt}»
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px;">
              ${q.options.map(opt => `
                <label style="background:var(--bg-card); border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm); display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:600;">
                  <input type="radio" name="char_${q.id}" value="${opt}">
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary btn-block" id="btn-submit-answer">${t('game_btn_check')}</button>
    `;
  }

  // 3. «Кім айтты?»
  if (task.type === 'who_said') {
    const quotes = p.quotes || [];
    const speakers = p.speakers || [];
    return `
      <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:20px;">
        ${quotes.map((q, idx) => `
          <div style="background:var(--bg-soft); padding:16px; border-radius:var(--radius-sm);" data-qid="${q.id}">
            <div style="font-style:italic; font-size:16px; margin-bottom:10px; font-weight:600;">
              ${idx + 1}. «${q.text}»
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px;">
              ${speakers.map(sp => `
                <label style="background:var(--bg-card); border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm); display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:600;">
                  <input type="radio" name="speaker_${q.id}" value="${sp}">
                  <span>${sp}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary btn-block" id="btn-submit-answer">${t('game_btn_check')}</button>
    `;
  }

  // 4. «Сөз қазынасы»
  if (task.type === 'vocab') {
    const words = p.words || [];
    const meanings = p.meanings || [];
    return `
      <div style="margin-bottom:20px;">
        <div style="font-size:14px; font-weight:700; margin-bottom:10px;">Әр сөздің мағынасын таңда:</div>
        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
          ${words.map((w, idx) => `
            <div style="background:var(--bg-soft); padding:12px; border-radius:var(--radius-sm);" data-wid="${w.id}">
              <div style="font-weight:700; font-size:16px; color:var(--primary-green); margin-bottom:6px;">
                ${idx + 1}. ${w.word}
              </div>
              <select class="form-select vocab-select" data-word-id="${w.id}">
                <option value="">Мағынасын таңдаңыз...</option>
                ${meanings.map(m => `<option value="${m.id}">${m.text}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>

        <!-- Қосымша: өз сөйлемінде қолдану -->
        <div style="border-top:1px dashed var(--border-color); padding-top:16px; margin-top:16px;">
          <div style="font-weight:700; font-size:14px; margin-bottom:6px;">
            Жаңа сөздердің біреуін таңдап, өз сөйлеміңді жаз:
          </div>
          <div class="form-group">
            <select class="form-select" id="inp-vocab-word">
              ${words.map(w => `<option value="${w.id}">${w.word}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <input type="text" class="form-input" id="inp-vocab-sentence" placeholder="Мысалы: Биыл біздің өлкеде құрғақшылық болды.">
          </div>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-submit-answer">${t('game_btn_check')}</button>
    `;
  }

  // 5. «Дәлелді тап»
  if (task.type === 'evidence') {
    const claims = p.claims || [];
    return `
      <div style="display:flex; flex-direction:column; gap:18px; margin-bottom:20px;">
        ${claims.map((c, idx) => `
          <div style="background:var(--bg-soft); padding:16px; border-radius:var(--radius-sm);" data-cid="${c.id}">
            <div style="font-weight:700; font-size:15px; margin-bottom:8px; color:var(--text-main);">
              ${idx + 1}. Пікір: «${c.claim}»
            </div>
            <div style="font-size:13px; color:var(--text-muted); margin-bottom:10px;">
              Осы пікірді мәтіннен алынған қай үзінді дәлелдейді?
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${c.options.map(opt => `
                <label style="background:var(--bg-card); border:1px solid var(--border-color); padding:10px; border-radius:var(--radius-sm); display:flex; align-items:flex-start; gap:8px; cursor:pointer;">
                  <input type="radio" name="claim_${c.id}" value="${opt.id}" style="margin-top:3px;">
                  <span style="font-size:14px; line-height:1.4;">«${opt.text}»</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary btn-block" id="btn-submit-answer">${t('game_btn_check')}</button>
    `;
  }

  // 6. «Кейіпкердің таңдауы» (Ашық жауап)
  if (task.type === 'choice') {
    return `
      <div style="background:var(--bg-soft); padding:16px; border-radius:var(--radius-sm); margin-bottom:20px;">
        <div style="font-size:15px; line-height:1.5; margin-bottom:12px;">${p.situation}</div>
        <div style="font-weight:700; font-size:16px; margin-bottom:14px; color:var(--primary-green);">
          ❓ ${p.question}
        </div>
        
        <div class="form-group">
          <label class="form-label">Сенің ұстанымың:</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            ${(p.positions || []).map(pos => `
              <label style="background:#fff; border:1px solid var(--border-color); padding:8px 14px; border-radius:var(--radius-sm); cursor:pointer; font-weight:600; font-size:14px;">
                <input type="radio" name="inp_choice_pos" value="${pos}">
                <span>${pos}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Өз пікіріңді жаз және мәтіннен бір дәлел келтір:</label>
          <textarea class="form-textarea" id="inp-choice-text" rows="4" placeholder="Менің ойымша, себебі мәтінде..."></textarea>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-submit-open-response">${t('game_btn_submit_thought')}</button>
    `;
  }

  // 7. «Шығармашылық шеберхана»
  if (task.type === 'creative') {
    const prompts = p.prompts || [];
    return `
      <div style="background:var(--bg-soft); padding:16px; border-radius:var(--radius-sm); margin-bottom:20px;">
        <div class="form-group">
          <label class="form-label">Тапсырма бағытын таңда:</label>
          <select class="form-select" id="inp-creative-kind">
            ${prompts.map(pr => `<option value="${pr.kind}">${pr.instruction}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Сенің шығармашылық жұмысың:</label>
          <textarea class="form-textarea" id="inp-creative-text" rows="6" placeholder="Өз шығармаңды немесе хатыңды жаз..."></textarea>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-submit-open-response">${t('game_btn_submit_thought')}</button>
    `;
  }

  return 'Тапсырма түрі анықталмады.';
}

function bindGameEvents(container, task) {
  // Тізбекті жоғары/төмен батырмалар арқылы жылжыту
  if (task.type === 'sequence') {
    const list = container.querySelector('#seq-list');
    container.querySelectorAll('.btn-seq-up').forEach(btn => {
      btn.onclick = () => {
        const item = btn.closest('.sequence-item');
        const prev = item.previousElementSibling;
        if (prev) list.insertBefore(item, prev);
      };
    });
    container.querySelectorAll('.btn-seq-down').forEach(btn => {
      btn.onclick = () => {
        const item = btn.closest('.sequence-item');
        const next = item.nextElementSibling;
        if (next) list.insertBefore(next, item);
      };
    });
  }

  // Автоматты ойынды тексеру батырмасы
  const checkBtn = container.querySelector('#btn-submit-answer');
  if (checkBtn) {
    checkBtn.onclick = async () => {
      let answer = {};

      if (task.type === 'sequence') {
        const items = container.querySelectorAll('#seq-list .sequence-item');
        answer = { order: Array.from(items).map(el => el.getAttribute('data-id')) };
      } else if (task.type === 'character') {
        const choices = {};
        container.querySelectorAll('[data-qid]').forEach(qEl => {
          const qid = qEl.getAttribute('data-qid');
          const checked = qEl.querySelector(`input[name="char_${qid}"]:checked`);
          if (checked) choices[qid] = checked.value;
        });
        answer = { choices };
      } else if (task.type === 'who_said') {
        const choices = {};
        container.querySelectorAll('[data-qid]').forEach(qEl => {
          const qid = qEl.getAttribute('data-qid');
          const checked = qEl.querySelector(`input[name="speaker_${qid}"]:checked`);
          if (checked) choices[qid] = checked.value;
        });
        answer = { choices };
      } else if (task.type === 'vocab') {
        const choices = {};
        container.querySelectorAll('.vocab-select').forEach(sel => {
          const wid = sel.getAttribute('data-word-id');
          if (sel.value) choices[wid] = sel.value;
        });
        answer = { choices };
      } else if (task.type === 'evidence') {
        const choices = {};
        container.querySelectorAll('[data-cid]').forEach(cEl => {
          const cid = cEl.getAttribute('data-cid');
          const checked = cEl.querySelector(`input[name="claim_${cid}"]:checked`);
          if (checked) choices[cid] = checked.value;
        });
        answer = { choices };
      }

      try {
        const res = await api.attemptTask(task.id, answer);
        renderFeedback(container, task, res);
      } catch (err) {
        showToast(`Қате: ${err.message}`, 'error');
      }
    };
  }

  // Ашық тапсырмаларды жіберу
  const openBtn = container.querySelector('#btn-submit-open-response');
  if (openBtn) {
    openBtn.onclick = async () => {
      try {
        let payload = {};
        if (task.type === 'choice') {
          const text = container.querySelector('#inp-choice-text').value.trim();
          const pos = container.querySelector('input[name="inp_choice_pos"]:checked')?.value || null;
          if (text.length < 30) {
            showToast('Кемінде 30 таңбадан тұратын пікір жазыңыз', 'error');
            return;
          }
          payload = { text, position: pos };
        } else if (task.type === 'creative') {
          const kind = container.querySelector('#inp-creative-kind').value;
          const text = container.querySelector('#inp-creative-text').value.trim();
          if (text.length < 20) {
            showToast('Кемінде 20 таңба жазыңыз', 'error');
            return;
          }
          payload = { kind, text };
        }

        const res = await api.respondTask(task.id, payload);
        showToast('Жауабың сақталды және мұғалімге тексеруге жіберілді!', 'success');
        renderFeedback(container, task, { correct: true, open: true, next: res.next });
      } catch (err) {
        showToast(`Қате: ${err.message}`, 'error');
      }
    };
  }
}

// -------------------------------------------------------------
// КЕРІ БАЙЛАНЫС ҚАДАМДАРЫ: ҚОЛДАУ -> ИШАРА -> ҚАЙТА ОРЫНДАУ -> ТҮСІНДІРУ
// -------------------------------------------------------------
function renderFeedback(container, task, res) {
  const fbArea = container.querySelector('#game-feedback-area');
  const { correct, feedback, xp_awarded, new_rewards, next, open } = res;

  if (open) {
    fbArea.innerHTML = `
      <div class="feedback-box correct">
        <div style="font-weight:700; font-size:16px; margin-bottom:6px;">
          ✓ Ойың сәтті қабылданды!
        </div>
        <p style="font-size:14px; margin-bottom:12px;">
          Жауабың мұғалімнің тексеру кезегіне түсті. Мұғалім мақұлдаған соң саған +20 XP беріледі.
        </p>
        <a href="#/world" class="btn btn-primary btn-sm">Басты кабинетке өту →</a>
      </div>
    `;
    return;
  }

  if (correct) {
    fbArea.innerHTML = `
      <div class="feedback-box correct">
        <div style="font-weight:800; font-size:17px; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
          <span>🎉</span> <span>${t('game_feedback_correct')}</span>
        </div>
        ${xp_awarded > 0 ? `
          <div style="font-weight:700; font-size:15px; color:#15803d; margin-bottom:8px;">
            +${xp_awarded} XP қосылды!
          </div>
        ` : `
          <div style="font-size:13px; color:#166534; margin-bottom:8px;">
            (Жаттығу сәтті аяқталды. Бұл тапсырма үшін ұпай бұрын берілген.)
          </div>
        `}
        ${feedback?.explanation ? `
          <div class="feedback-explanation">
            <strong>Неге бұл жауап дұрыс:</strong> ${feedback.explanation}
          </div>
        ` : ''}
        <div style="margin-top:16px; display:flex; gap:10px;">
          <a href="#/world" class="btn btn-primary btn-sm">Саяхатты жалғастыру →</a>
          <a href="#/play" class="btn btn-secondary btn-sm">Басқа ойын таңдау</a>
        </div>
      </div>
    `;
  } else {
    // Қате болған жағдай — қолдайтын хабарлама және ишара
    fbArea.innerHTML = `
      <div class="feedback-box retry">
        <div style="font-weight:800; font-size:16px; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
          <span>💡</span> <span>${t('game_feedback_retry')}</span>
        </div>
        <p style="font-size:14px; margin-bottom:8px;">
          Барлығы бірден бола бермейді, қайта ойлану — үйренудің ең жақсы жолы!
        </p>

        <!-- 1. Ишара (Hint) -->
        ${feedback?.hint ? `
          <div class="feedback-hint">
            🔍 <strong>Ишара:</strong> ${feedback.hint}
          </div>
        ` : ''}

        <!-- 2. Екі рет қателескеннен кейінгі түсіндірме (Explanation) -->
        ${feedback?.explanation ? `
          <div class="feedback-explanation" style="background:rgba(255,255,255,0.7); padding:8px; border-radius:4px; margin-top:8px;">
            📖 <strong>Мәтінге назар аудар:</strong> ${feedback.explanation}
          </div>
        ` : ''}

        <div style="margin-top:14px;">
          <button class="btn btn-accent btn-sm" id="btn-retry-game">
            🔄 Қайта орындап көру
          </button>
        </div>
      </div>
    `;

    const retryBtn = fbArea.querySelector('#btn-retry-game');
    if (retryBtn) {
      retryBtn.onclick = () => {
        fbArea.innerHTML = '';
        fbArea.scrollIntoView({ behavior: 'smooth' });
      };
    }
  }
}
