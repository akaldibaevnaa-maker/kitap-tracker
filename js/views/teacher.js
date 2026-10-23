// Мұғалім кабинеті — Басқару құралдары, 4 көрсеткіш, тексеру кезегі, тапсырма құрастырушы, CSV экспорт
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, openModal } from '../ui.js';

export async function renderTeacherView(container, subview = 'overview') {
  container.innerHTML = `
    <div style="text-align:center; padding: 40px;">
      <div style="font-size:28px;">⏳</div>
      <p style="color:var(--text-muted);">${t('teacher_title')} жүктелуде...</p>
    </div>
  `;

  try {
    const classesRes = await api.teacherClasses();
    if (classesRes.classes.length === 0) {
      return renderNoClasses(container);
    }
    const currentClass = classesRes.classes[0];
    renderTeacherLayout(container, currentClass, classesRes.classes, subview);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--danger-color);">Қате: ${err.message}</div>`;
  }
}

function renderNoClasses(container) {
  container.innerHTML = `
    <div class="card" style="text-align:center; padding:40px;">
      <div style="font-size:40px; margin-bottom:10px;">🏫</div>
      <h3 style="font-size:20px; font-weight:800; margin-bottom:8px;">Сынып құрыңыз</h3>
      <p style="color:var(--text-muted); margin-bottom:16px;">
        Оқушыларды қосу және кітап тағайындау үшін алдымен өз сыныбыңызды құрыңыз.
      </p>
      <button class="btn btn-primary" id="btn-create-first-class">Жаңа сынып құру</button>
    </div>
  `;

  container.querySelector('#btn-create-first-class').onclick = () => {
    openModal({
      title: 'Жаңа сынып құру',
      bodyHtml: `
        <div class="form-group">
          <label class="form-label">Сынып атауы</label>
          <input type="text" class="form-input" id="inp-nc-name" placeholder="Мысалы: 5А сынып" required>
        </div>
      `,
      saveText: 'Құру',
      onSave: async (modalEl) => {
        const name = modalEl.querySelector('#inp-nc-name').value.trim();
        if (!name) return false;
        await api.teacherCreateClass({ name });
        showToast('Сынып құрылды!', 'success');
        renderTeacherView(container, 'overview');
        return true;
      }
    });
  };
}

async function renderTeacherLayout(container, cls, allClasses, subview) {
  let overviewData = null;
  let reviewsData = null;
  let tasksData = null;
  let missionsData = null;

  if (subview === 'overview') overviewData = await api.teacherOverview(cls.id);
  else if (subview === 'reviews') reviewsData = await api.teacherReviews('pending', cls.id);
  else if (subview === 'tasks') tasksData = await api.teacherTasks();
  else if (subview === 'missions') missionsData = await api.teacherMissions(cls.id);

  container.innerHTML = `
    <!-- Мектеп және Авторлық құқық төлқұжаты -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; font-size:12px; color:var(--text-muted);">
      <span style="background:var(--bg-card); border:1px solid var(--border-color); padding:4px 10px; border-radius:12px;">
        🏫 <strong>№290 орта мектеп</strong> · 2026 жыл
      </span>
      <span>
        ✍️ Авторы: <strong>Құлахметова Аягөз</strong> (11-сынып) | Жетекшісі: <strong>Аскарова А.К.</strong> | Ғылыми кеңесші: <strong>Құлмырзаев Н.С.</strong>
      </span>
    </div>

    <!-- Жоғарғы сынып таңдауы және CSV батырмасы -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
      <div>
        <h2 style="font-size:24px; font-weight:800; color:var(--text-main);">
          👩‍🏫 ${t('teacher_title')}
        </h2>
        <div style="font-size:13px; color:var(--text-muted);">
          Сынып: <strong>${cls.name}</strong> | Шақыру коды: <strong style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px;">${cls.invite_code}</strong>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <a href="/api/teacher/classes/${cls.id}/export.csv" target="_blank" class="btn btn-secondary btn-sm">
          📥 ${t('teacher_export_csv')}
        </a>
        <button class="btn btn-primary btn-sm" id="btn-assign-book-modal">
          📚 Кітап тағайындау
        </button>
      </div>
    </div>

    <!-- Мұғалім ішкі қойындылары -->
    <div style="display:flex; gap:8px; border-bottom:2px solid var(--border-color); padding-bottom:8px; margin-bottom:20px; overflow-x:auto;">
      <a href="#/teacher/overview" class="btn btn-sm ${subview === 'overview' ? 'btn-primary' : 'btn-secondary'}">
        📊 ${t('teacher_tab_overview')}
      </a>
      <a href="#/teacher/reviews" class="btn btn-sm ${subview === 'reviews' ? 'btn-primary' : 'btn-secondary'}">
        📝 ${t('teacher_tab_reviews')} ${overviewData?.pending ? `(${overviewData.pending})` : ''}
      </a>
      <a href="#/teacher/tasks" class="btn btn-sm ${subview === 'tasks' ? 'btn-primary' : 'btn-secondary'}">
        ✍️ ${t('teacher_tab_builder')}
      </a>
      <a href="#/teacher/missions" class="btn btn-sm ${subview === 'missions' ? 'btn-primary' : 'btn-secondary'}">
        🌳 ${t('teacher_tab_missions')}
      </a>
    </div>

    <!-- Таңдалған ішкі көрініс -->
    <div id="teacher-subview-content">
      ${subview === 'overview' ? renderOverviewTab(overviewData, cls) : ''}
      ${subview === 'reviews' ? renderReviewsTab(reviewsData) : ''}
      ${subview === 'tasks' ? renderTasksTab(tasksData, cls) : ''}
      ${subview === 'missions' ? renderMissionsTab(missionsData, cls) : ''}
    </div>
  `;

  bindTeacherEvents(container, cls, overviewData);
}

// -------------------------------------------------------------
// 1. ШОЛУ ҚОЙЫНДЫСЫ: 4 НЕГІЗГІ КӨРСЕТКІШ
// -------------------------------------------------------------
function renderOverviewTab(data, cls) {
  const { activity, books, tasks, pending, students } = data;

  return `
    <!-- 4 НЕГІЗГІ КӨРСЕТКІШ КАРТОЧКАЛАРЫ -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-bottom:24px;">
      <!-- 1. Оқу белсенділігі -->
      <div class="card" style="margin-bottom:0; border-top:4px solid var(--primary-green);">
        <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">1. Оқу белсенділігі (7 күн)</div>
        <div style="font-size:26px; font-weight:800; color:var(--primary-green); margin:6px 0;">
          ${activity.active_students_7} / ${activity.students} бала
        </div>
        <div style="font-size:12px; color:var(--text-muted);">
          Барлығы: ${activity.reading_days_7} оқу күні • ${activity.minutes_7} минут
        </div>
      </div>

      <!-- 2. Кітаптар бойынша прогресс -->
      <div class="card" style="margin-bottom:0; border-top:4px solid var(--accent-gold);">
        <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">2. Кітаптар прогресі</div>
        <div style="font-size:26px; font-weight:800; color:var(--accent-gold-dark); margin:6px 0;">
          ${books.length} кітап
        </div>
        <div style="font-size:12px; color:var(--text-muted);">
          Оқуда: ${books.reduce((acc, b) => acc + (b.readers || 0), 0)} оқырман
        </div>
      </div>

      <!-- 3. Тапсырмалар нәтижесі -->
      <div class="card" style="margin-bottom:0; border-top:4px solid #3b82f6;">
        <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">3. Тапсырмалар нәтижесі</div>
        <div style="font-size:26px; font-weight:800; color:#2563eb; margin:6px 0;">
          ${tasks.reduce((acc, t) => acc + (t.completed || 0), 0)} орындалды
        </div>
        <div style="font-size:12px; color:var(--text-muted);">
          Орташа әрекет саны: 1.2
        </div>
      </div>

      <!-- 4. Тексеруді күтетін жауаптар -->
      <div class="card" style="margin-bottom:0; border-top:4px solid ${pending > 0 ? 'var(--danger-color)' : 'var(--border-color)'};">
        <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">4. Тексеру кезегі</div>
        <div style="font-size:26px; font-weight:800; color:${pending > 0 ? 'var(--danger-color)' : 'var(--text-muted)'}; margin:6px 0;">
          ${pending} жауап күтуде
        </div>
        <div style="font-size:12px;">
          ${pending > 0 ? `<a href="#/teacher/reviews" style="color:var(--danger-color); font-weight:700;">Тексеруге өту →</a>` : 'Барлығы тексерілген ✓'}
        </div>
      </div>
    </div>

    <!-- 5 КЕЗЕҢ БОЙЫНША СЫНЫП МОНИТОРИНГІ -->
    <div class="card" style="padding:16px; margin-bottom:20px; border-left:4px solid var(--primary-green);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <h3 style="font-size:16px; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
          <span>🗺️</span> Саяхат картасының 5 кезеңі бойынша сынып бөлінісі
        </h3>
        <span style="font-size:12px; color:var(--text-muted);">
          Барлық оқушы: <strong>${students.length}</strong>
        </span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:10px;">
        ${(data.stage_distribution || [
          { stage: 1, name: 'Бастау қақпасы', count: 0 },
          { stage: 2, name: 'Кейіпкерлер мекені', count: 0 },
          { stage: 3, name: 'Оқиғалар жолы', count: 0 },
          { stage: 4, name: 'Ой қазынасы', count: 0 },
          { stage: 5, name: 'Кітап шыңы', count: 0 }
        ]).map(st => `
          <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:10px 12px;">
            <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${st.stage}-кезең</div>
            <div style="font-weight:700; font-size:13px; color:var(--text-main); margin:2px 0;">${st.name}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
              <span style="font-size:18px; font-weight:800; color:var(--primary-green);">${st.count} оқушы</span>
              <span style="font-size:11px; color:var(--text-muted);">${students.length ? Math.round((st.count / students.length) * 100) : 0}%</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- ОҚУШЫЛАР ТІЗІМІ КЕСТЕСІ -->
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:17px; font-weight:700;">Сынып оқушыларының оқу барысы</h3>
        <span style="font-size:12px; color:var(--text-muted);">${t('teacher_csv_note')}</span>
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:14px; text-align:left;">
          <thead>
            <tr style="background:var(--bg-soft); border-bottom:2px solid var(--border-color);">
              <th style="padding:10px;">Оқушы</th>
              <th style="padding:10px;">Оқып жүрген кітабы</th>
              <th style="padding:10px;">Прогресс</th>
              <th style="padding:10px;">Саяхат кезеңі</th>
              <th style="padding:10px;">Оқу күндері</th>
              <th style="padding:10px;">Ойын / Пікір</th>
              <th style="padding:10px;">XP жинағы</th>
              <th style="padding:10px; text-align:right;">Баптау</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:10px; font-weight:700;">
                  <span>${s.avatar === 'owl' ? '🦉' : '🦊'}</span> ${s.nickname}
                </td>
                <td style="padding:10px; color:var(--text-muted); font-size:13px;">
                  ${s.current_book || 'Таңдалмаған'}
                </td>
                <td style="padding:10px;">
                  ${s.percent !== null ? `
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div class="progress-bar-wrap" style="width:60px; height:6px; margin:0;">
                        <div class="progress-bar-fill" style="width:${s.percent}%;"></div>
                      </div>
                      <span style="font-size:12px; font-weight:700;">${s.percent}%</span>
                    </div>
                  ` : '—'}
                </td>
                <td style="padding:10px;">
                  <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700; font-size:12px; display:inline-block;">
                    ${s.stage_name || '1. Бастау қақпасы'}
                  </span>
                </td>
                <td style="padding:10px; font-size:13px;">${s.reading_days} күн (${s.reading_days_7} осы аптада)</td>
                <td style="padding:10px; font-size:13px;">${s.games_done} ойын / ${s.accepted} пікір</td>
                <td style="padding:10px; font-weight:700; color:var(--primary-green);">+${s.xp} XP</td>
                <td style="padding:10px; text-align:right; white-space:nowrap;">
                  <button class="btn btn-secondary btn-sm btn-parent-card" data-sid="${s.id}" title="Ата-анаға арналған бақылау парақшасы">
                    👨‍👩‍👧 Ата-анаға
                  </button>
                  <button class="btn btn-secondary btn-sm btn-reset-pin" data-sid="${s.id}" data-name="${s.nickname}" title="PIN қалпына келтіру">
                    🔑 PIN
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 2. ЖАУАПТАРДЫ ТЕКСЕРУ ҚОЙЫНДЫСЫ
// -------------------------------------------------------------
function renderReviewsTab(data) {
  const { reviews } = data;

  if (reviews.length === 0) {
    return `
      <div class="card" style="text-align:center; padding:40px;">
        <div style="font-size:36px; margin-bottom:8px;">✓</div>
        <h4 style="font-size:16px; font-weight:700; margin-bottom:6px;">Тексеруді күтіп тұрған жауаптар жоқ</h4>
        <p style="font-size:13px; color:var(--text-muted);">
          Оқушылар «Кейіпкердің таңдауы», рефлексия немесе шығарма жазғанда осы жерде көрінеді.
        </p>
      </div>
    `;
  }

  return `
    <div style="display:flex; flex-direction:column; gap:16px;">
      ${reviews.map(r => `
        <div class="card" style="border-left:4px solid var(--accent-gold);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div>
              <span class="badge" style="background:#e0f2fe; color:#0369a1; margin-bottom:4px; display:inline-block;">
                ${r.kind === 'reflection' ? 'Кітап рефлексиясы' : 'Ашық тапсырма жауабы'}
              </span>
              <h4 style="font-size:16px; font-weight:800;">Оқушы: ${r.student.nickname}</h4>
              <div style="font-size:12px; color:var(--text-muted);">
                Кітап: «${r.book_title}» ${r.task_title ? `• Тапсырма: «${r.task_title}»` : ''}
              </div>
            </div>
            <span class="badge" style="background:#fef3c7; color:#92400e;">Тексеруде</span>
          </div>

          <div style="background:var(--bg-soft); padding:14px; border-radius:var(--radius-sm); font-size:15px; line-height:1.6; margin-bottom:16px; font-style:italic;">
            «${r.text}»
          </div>

          <!-- Мұғалімнің шешімі және кері байланысы -->
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <input type="text" class="form-input" id="inp-review-fb-${r.id}" placeholder="Оқушыға жылы лебіз немесе кеңес жазыңыз..." style="flex:1; min-width:260px;">
            <button class="btn btn-primary btn-sm btn-accept-review" data-id="${r.id}">
              ${t('teacher_accept_btn')}
            </button>
            <button class="btn btn-secondary btn-sm btn-return-review" data-id="${r.id}">
              ${t('teacher_return_btn')}
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// -------------------------------------------------------------
// 3. ТАПСЫРМА ҚҰРАСТЫРУШЫ ЖӘНЕ «ҮЗІНДІДЕН ЖОБА»
// -------------------------------------------------------------
function renderTasksTab(data, cls) {
  const { tasks } = data;

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
      <h3 style="font-size:18px; font-weight:800;">Ойын тапсырмалары (${tasks.length})</h3>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary btn-sm" id="btn-open-draft-tool">
          🪄 ${t('teacher_draft_tool')}
        </button>
        <button class="btn btn-primary btn-sm" id="btn-create-task-manual">
          ➕ Жаңа тапсырма құру
        </button>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
      ${tasks.map(t => `
        <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span class="badge">${t.stage_no}-кезең</span>
              <span class="badge" style="background:${t.status === 'published' ? '#dcfce7' : '#fef3c7'}; color:${t.status === 'published' ? '#166534' : '#92400e'};">
                ${t.status === 'published' ? 'Жарияланған ✓' : 'Жоба 📝'}
              </span>
            </div>
            <h4 style="font-size:16px; font-weight:700; margin-bottom:4px;">${t.title}</h4>
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">
              Кітап: «${t.book_title}»
            </div>
          </div>
          <div style="display:flex; gap:6px; margin-top:12px;">
            <a href="#/play/${t.id}" class="btn btn-secondary btn-sm" style="flex:1;" target="_blank">
              👁️ Оқушыша қарау
            </a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// -------------------------------------------------------------
// 4. ОРТАҚ МИССИЯЛАРДЫ БАСҚАРУ
// -------------------------------------------------------------
function renderMissionsTab(data, cls) {
  const { missions } = data;

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h3 style="font-size:18px; font-weight:800;">Сынып миссиялары: «Білім бағы»</h3>
      <button class="btn btn-primary btn-sm" id="btn-add-mission-modal">
        ➕ Жаңа миссия қосу
      </button>
    </div>

    <div style="display:flex; flex-direction:column; gap:14px;">
      ${missions.map(m => `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <div>
              <h4 style="font-size:17px; font-weight:700;">${m.title}</h4>
              <p style="font-size:13px; color:var(--text-muted);">${m.description || 'Сипаттамасыз'}</p>
            </div>
            <span class="badge" style="background:#dcfce7; color:#166534;">Белсенді</span>
          </div>

          <div class="progress-bar-wrap" style="height:12px;">
            <div class="progress-bar-fill" style="width:${m.percent}%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-top:6px;">
            <span>Прогресс: ${m.progress} / ${m.target}</span>
            <span>Қалғаны: ${m.remaining}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// -------------------------------------------------------------
// ОҚИҒАЛАРДЫ БАЙЛАУ
// -------------------------------------------------------------
function bindTeacherEvents(container, cls, overviewData) {
  // Ата-анаға арналған бақылау парақшасы
  container.querySelectorAll('.btn-parent-card').forEach(btn => {
    btn.onclick = () => {
      const sid = Number(btn.getAttribute('data-sid'));
      const student = overviewData?.students?.find(s => s.id === sid);
      if (student) openParentReportModal(student, cls);
    };
  });

  // PIN қалпына келтіру
  container.querySelectorAll('.btn-reset-pin').forEach(btn => {
    btn.onclick = async () => {
      const sid = btn.getAttribute('data-sid');
      const sname = btn.getAttribute('data-name');
      if (confirm(`${sname} оқушысының PIN-кодын жаңа 4 цифрға ауыстырасыз ба?`)) {
        try {
          const res = await api.teacherResetPin(sid);
          alert(`Жаңа PIN-код: ${res.pin}. Осы 4 цифрды оқушыға хабарлаңыз.`);
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    };
  });

  // Кітап тағайындау модалы
  const assignBtn = container.querySelector('#btn-assign-book-modal');
  if (assignBtn) {
    assignBtn.onclick = async () => {
      const bRes = await api.teacherTasks(); // кітаптарды алу үшін
      openModal({
        title: 'Сыныпқа кітап тағайындау',
        bodyHtml: `
          <div class="form-group">
            <label class="form-label">Кітапты таңдаңыз</label>
            <select class="form-select" id="inp-as-book">
              <option value="1">Ұмытылған бұлақ</option>
              <option value="2">Менің атым Қожа</option>
              <option value="3">Кішкентай ханзада</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Сыныпқа арналған мақсат</label>
            <input type="text" class="form-input" id="inp-as-goal" value="Күніне 10-15 минут оқып, ойын тапсырмаларын орындау">
          </div>
        `,
        saveText: 'Тағайындау',
        onSave: async (modalEl) => {
          const bookId = Number(modalEl.querySelector('#inp-as-book').value);
          const goalText = modalEl.querySelector('#inp-as-goal').value.trim();
          try {
            await api.teacherAssignBook(cls.id, { bookId, goalText });
            showToast('Кітап сыныпқа сәтті тағайындалды!', 'success');
            return true;
          } catch (err) {
            showToast(err.message, 'error');
            return false;
          }
        }
      });
    };
  }

  // Жауапты қабылдау (+20 XP беру)
  container.querySelectorAll('.btn-accept-review').forEach(btn => {
    btn.onclick = async () => {
      const rid = btn.getAttribute('data-id');
      const fb = container.querySelector(`#inp-review-fb-${rid}`).value.trim() || 'Жарайсың! Өте жақсы ой айтқансың.';
      try {
        await api.teacherReviewDecision(rid, 'accept', fb);
        showToast('Жауап қабылданды, оқушыға +20 XP берілді!', 'success');
        renderTeacherView(container, 'reviews');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });

  // Жауапты қайтару (түзетуге)
  container.querySelectorAll('.btn-return-review').forEach(btn => {
    btn.onclick = async () => {
      const rid = btn.getAttribute('data-id');
      const fb = container.querySelector(`#inp-review-fb-${rid}`).value.trim();
      if (!fb) {
        showToast('Қайтару себебін немесе түзету бойынша кеңесті жазыңыз', 'error');
        return;
      }
      try {
        await api.teacherReviewDecision(rid, 'return', fb);
        showToast('Жауап оқушыға түзетуге қайтарылды', 'success');
        renderTeacherView(container, 'reviews');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });

  // «Үзіндіден жоба» (Ереже бойынша генератор, AI емес)
  const draftBtn = container.querySelector('#btn-open-draft-tool');
  if (draftBtn) {
    draftBtn.onclick = () => {
      openModal({
        title: '«Үзіндіден жоба» құралы',
        bodyHtml: `
          <div style="background:#fef3c7; border:1px solid #fde68a; padding:10px; border-radius:var(--radius-sm); font-size:12px; color:#92400e; margin-bottom:12px;">
            ⚠️ <strong>Ескертпе:</strong> Бұл сыртқы AI емес, мәтін ережелері бойынша сөйлемдер мен дәйексөздерді іріктейтін құрал. Мұғалім жобаны міндетті түрде тексеріп, содан кейін ғана оқушыға жариялайды.
          </div>
          <div class="form-group">
            <label class="form-label">Ойын түрі</label>
            <select class="form-select" id="inp-dr-type">
              <option value="sequence">Оқиғалар тізбегі (сөйлемдер реті)</option>
              <option value="who_said">Кім айтты? (диалогтар мен дәйексөздер)</option>
              <option value="vocab">Сөз қазынасы (сөздер)</option>
              <option value="evidence">Дәлелді тап</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Кітаптан алынған мәтін үзіндісі</label>
            <textarea class="form-textarea" id="inp-dr-text" rows="6" placeholder="Кітаптан бірнеше сөйлем немесе диалог үзіндісін қойыңыз..."></textarea>
          </div>
        `,
        saveText: 'Жоба құру',
        onSave: async (modalEl) => {
          const type = modalEl.querySelector('#inp-dr-type').value;
          const excerpt = modalEl.querySelector('#inp-dr-text').value.trim();
          if (excerpt.length < 40) {
            showToast('Кемінде 40 таңбадан тұратын үзінді енгізіңіз', 'error');
            return false;
          }
          try {
            const res = await api.teacherDraft({ type, excerpt });
            alert('Жоба құрылды! Спецификация: ' + JSON.stringify(res.spec));
            return true;
          } catch (err) {
            showToast(err.message, 'error');
            return false;
          }
        }
      });
    };
  }
}

// -------------------------------------------------------------
// Ата-анаға арналған оқу мониторингі парақшасы
// -------------------------------------------------------------
function openParentReportModal(student, cls) {
  openModal({
    title: `👨‍👩‍👧 Ата-анаға арналған оқу есебі — ${student.nickname}`,
    bodyHtml: `
      <div id="parent-report-content" style="background:#fff; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:20px; font-family:inherit;">
        <div style="border-bottom:2px solid var(--primary-green); padding-bottom:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:800; font-size:17px; color:var(--primary-green);">«KitapTracker» Оқу мониторингі</div>
            <div style="font-size:12px; color:var(--text-muted);">№290 орта мектеп · Авторы: Құлахметова Аягөз (11-сынып) · Жетекшісі: Аскарова А.К. · Ғылыми кеңесші: Құлмырзаев Н.С.</div>
          </div>
          <span style="font-size:32px;">${student.avatar === 'owl' ? '🦉' : '🦊'}</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; font-size:13px;">
          <div><strong>Оқушы:</strong> ${student.nickname}</div>
          <div><strong>Сыныбы:</strong> ${cls.name}</div>
          <div><strong>Оқып жатқан кітабы:</strong> ${student.current_book || 'Таңдалмаған'}</div>
          <div><strong>Кітап прогресі:</strong> ${student.percent !== null ? student.percent + '%' : 'Басталмаған'}</div>
          <div><strong>Саяхат картасының кезеңі:</strong> <span style="color:#0369a1; font-weight:700;">${student.stage_name || '1. Бастау қақпасы'}</span></div>
          <div><strong>Жалпы жинаған XP:</strong> <span style="color:var(--primary-green); font-weight:800;">+${student.xp} XP</span></div>
          <div><strong>Оқу белсенділігі:</strong> ${student.reading_days} күн (${student.minutes} минут)</div>
          <div><strong>Ойын / Пікірлер:</strong> ${student.games_done} тапсырма / ${student.diary_notes || 0} күнделік жазбасы</div>
        </div>

        <div style="background:var(--bg-soft); border-left:4px solid var(--accent-gold); padding:12px; border-radius:4px; font-size:13px; line-height:1.5; margin-bottom:16px;">
          <div style="font-weight:700; color:var(--accent-gold-dark); margin-bottom:4px;">👩‍🏫 Мұғалімнің ата-анаға педагогикалық кеңесі:</div>
          «Балаңыздың кітап оқу белсенділігі жақсы. Күніне 10-15 минут бірге дауыстап оқып, бүгінгі оқыған кейіпкердің әрекеті мен жаңа сөздері туралы сұрап отыруды ұсынамыз. Бұл сөйлеу шеберлігі мен ойлау қабілетін дамытады.»
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-muted);">
          <span>Есеп дайындаған: Сынып жетекшісі</span>
          <span>Күні: ${new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>

      <div style="margin-top:14px; display:flex; gap:10px; justify-content:flex-end;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-wa-report">
          📋 WhatsApp мәтінін көшіру
        </button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-print-parent-report">
          🖨️ Басып шығару (Print)
        </button>
      </div>
    `,
    saveText: 'Жабу',
    onSave: async () => true
  });

  setTimeout(() => {
    const copyBtn = document.getElementById('btn-copy-wa-report');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const text = `📚 *KitapTracker оқу есебі* (№290 орта мектеп)\n\n👤 Оқушы: ${student.nickname} (${cls.name})\n📖 Кітап: ${student.current_book || 'Оқу үстінде'}\n🗺️ Саяхат кезеңі: ${student.stage_name || 'Бастау қақпасы'}\n⭐ Жинаған XP: +${student.xp} XP\n📅 Оқу күндері: ${student.reading_days} күн (${student.minutes} мин)\n\n👩‍🏫 Мұғалім ұсынысы: Күніне 10-15 минут оқуды жалғастырып, оқығанын талқылауды ұсынамыз.\n\n_Авторы: Құлахметова Аягөз (11-сынып оқушысы, №290 орта мектеп) | Жетекшісі: Аскарова Айнур Калдыбаевна | Ғылыми кеңесші: Қорқыт ата атындағы Қызылорда университеті, Жасанды интеллект институты директоры Құлмырзаев Нұрлан Серікұлы_`;
        navigator.clipboard.writeText(text);
        showToast('Ата-анаға арналған мәтін буферге көшірілді!', 'success');
      };
    }
    const printBtn = document.getElementById('btn-print-parent-report');
    if (printBtn) {
      printBtn.onclick = () => {
        window.print();
      };
    }
  }, 100);
}

