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
    const currentClass = classesRes.classes.find(c => c.id === window.__activeTeacherClassId) || classesRes.classes[0];
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
  let analyticsData = null;
  let reviewsData = null;
  let tasksData = null;
  let missionsData = null;
  let compData = null;
  let reportsData = null;
  let comparisonData = null;
  let adminData = null;

  if (subview === 'overview') overviewData = await api.teacherOverview(cls.id);
  else if (subview === 'analytics') analyticsData = await api.teacherClassAnalytics(cls.id);
  else if (subview === 'comprehension') compData = await api.teacherClassComprehension(cls.id);
  else if (subview === 'reports') reportsData = await api.teacherReport(cls.id, { period: window.__teacherReportPeriod || 'q2', year: 2026 });
  else if (subview === 'comparison') comparisonData = await api.teacherClassesComparison();
  else if (subview === 'reviews') reviewsData = await api.teacherReviews('pending', cls.id);
  else if (subview === 'tasks') tasksData = await api.teacherTasks();
  else if (subview === 'missions') missionsData = await api.teacherMissions(cls.id);
  else if (subview === 'admin') {
    try {
      const [sum, treeConf, bData] = await Promise.all([
        api.getAdminSummary().catch(() => ({ counts: {} })),
        api.getTreeAdminConfig().catch(() => ({ stages: [] })),
        api.getBooks().catch(() => ({ books: [] }))
      ]);
      adminData = { counts: sum.counts || {}, stages: treeConf.stages || [], books: bData.books || [] };
    } catch {
      adminData = { counts: {}, stages: [], books: [] };
    }
  }

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

    <!-- Жоғарғы сынып таңдауы және Басқару батырмалары -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
      <div>
        <h2 style="font-size:24px; font-weight:800; color:var(--text-main);">
          👩‍🏫 ${t('teacher_title')}
        </h2>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:4px; font-size:13px; color:var(--text-muted);">
          <span>Сынып:</span>
          ${allClasses.length > 1 ? `
            <select class="form-select form-select-sm" id="select-active-teacher-class" style="width:auto; padding:2px 8px; font-weight:700;">
              ${allClasses.map(c => `<option value="${c.id}" ${c.id === cls.id ? 'selected' : ''}>${c.name} (Код: ${c.invite_code})</option>`).join('')}
            </select>
          ` : `
            <strong>${cls.name}</strong>
          `}
          <span>| Шақыру коды: <strong style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px;">${cls.invite_code}</strong></span>
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="btn-add-student-modal">
          ➕ Оқушы қосу
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-import-students-modal">
          📋 Excel/CSV импорт
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-create-class-modal">
          🏫 Жаңа сынып
        </button>
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
      <a href="#/teacher/analytics" class="btn btn-sm ${subview === 'analytics' ? 'btn-primary' : 'btn-secondary'}">
        📈 Smart Аналитика
      </a>
      <a href="#/teacher/comprehension" class="btn btn-sm ${subview === 'comprehension' ? 'btn-primary' : 'btn-secondary'}">
        🧠 Түсіну & Талдау
      </a>
      <a href="#/teacher/reports" class="btn btn-sm ${subview === 'reports' ? 'btn-primary' : 'btn-secondary'}">
        📋 Тоқсандық есеп
      </a>
      <a href="#/teacher/comparison" class="btn btn-sm ${subview === 'comparison' ? 'btn-primary' : 'btn-secondary'}">
        ⚖️ Сыныптарды салыстыру
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
      <a href="#/teacher/admin" class="btn btn-sm ${subview === 'admin' ? 'btn-primary' : 'btn-secondary'}">
        ⚙️ Әкімшілік панель
      </a>
    </div>

    <!-- Таңдалған ішкі көрініс -->
    <div id="teacher-subview-content">
      ${subview === 'overview' ? renderOverviewTab(overviewData, cls) : ''}
      ${subview === 'analytics' ? renderClassAnalyticsTab(analyticsData, cls) : ''}
      ${subview === 'comprehension' ? renderTeacherComprehensionTab(compData, cls) : ''}
      ${subview === 'reports' ? renderTeacherReportsTab(reportsData, cls) : ''}
      ${subview === 'comparison' ? renderTeacherComparisonTab(comparisonData) : ''}
      ${subview === 'reviews' ? renderReviewsTab(reviewsData) : ''}
      ${subview === 'tasks' ? renderTasksTab(tasksData, cls) : ''}
      ${subview === 'missions' ? renderMissionsTab(missionsData, cls) : ''}
      ${subview === 'admin' ? renderAdminTab(adminData, container) : ''}
    </div>
  `;

  bindTeacherEvents(container, cls, overviewData, reportsData, comparisonData, adminData);
}

// -------------------------------------------------------------
// 1. ШОЛУ ҚОЙЫНДЫСЫ: 4 НЕГІЗГІ КӨРСЕТКІШ
// -------------------------------------------------------------
function renderOverviewTab(data, cls) {
  const { activity, books, tasks, pending, students, tree_distribution_7, at_risk_count } = data;

  return `
    ${at_risk_count > 0 ? `
      <!-- ОҚУ БЕЛСЕНДІЛІГІ ТӨМЕНДЕГЕН ОҚУШЫЛАР БОЙЫНША ДАБЫЛ КАРТОЧКАСЫ -->
      <div class="card" style="background:#fffbeb; border:1px solid #fde68a; border-left:4px solid #f59e0b; padding:14px 18px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:28px;">⚠️</span>
          <div>
            <div style="font-weight:800; color:#92400e; font-size:15px;">
              Педагогикалық назар: ${at_risk_count} оқушының кітап оқу қарқыны бәсеңдеген
            </div>
            <div style="font-size:12px; color:#b45309;">
              Соңғы 7 күнде оқылым тіркемеген немесе мақсаты 30%-дан төмен оқушылар анықталды.
            </div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-view-at-risk" style="background:#fef3c7; border-color:#f59e0b; color:#92400e; font-weight:700;">
          Қолдауды қажет ететін оқушылар тізімі (${at_risk_count}) →
        </button>
      </div>
    ` : ''}

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
          Оқуда: ${books.reduce((acc, b) => acc + (b.readers || 0), 0)} оқырман • Аяқталған: ${books.reduce((acc, b) => acc + (b.finished || 0), 0)}
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

    <!-- «КІТАП АҒАШЫНЫҢ» 7 ДАМУ САТЫСЫ БОЙЫНША СЫНЫП МОНИТОРИНГІ -->
    <div class="card" style="padding:16px; margin-bottom:20px; border-left:4px solid #10b981;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <h3 style="font-size:16px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
          <span>🌳</span> «Кітап ағашы» жүйесінің 7 даму сатысы бойынша сынып бөлінісі
        </h3>
        <span style="font-size:12px; color:var(--text-muted);">
          Сыныптағы барлық оқушы: <strong>${students.length}</strong>
        </span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(135px, 1fr)); gap:10px;">
        ${(tree_distribution_7 || [
          { stage: 1, name: 'Тұқым', icon: '🌱', count: 0 },
          { stage: 2, name: 'Өскін', icon: '🌿', count: 0 },
          { stage: 3, name: 'Жас өркен', icon: '🎋', count: 0 },
          { stage: 4, name: 'Жас ағаш', icon: '🌳', count: 0 },
          { stage: 5, name: 'Жапырақты ағаш', icon: '🌲', count: 0 },
          { stage: 6, name: 'Гүлдеген ағаш', icon: '🌸', count: 0 },
          { stage: 7, name: 'Жемісті ағаш', icon: '🍎', count: 0 },
        ]).map(st => `
          <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:10px; text-align:center;">
            <div style="font-size:24px; margin-bottom:4px;">${st.icon}</div>
            <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${st.stage}-саты</div>
            <div style="font-weight:700; font-size:12px; color:var(--text-main);">${st.name}</div>
            <div style="font-size:16px; font-weight:800; color:var(--primary-green); margin-top:4px;">${st.count} бала</div>
            <div style="font-size:11px; color:var(--text-muted);">${students.length ? Math.round((st.count / students.length) * 100) : 0}%</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- ТАНЫМАЛ КІТАПТАР -->
    ${books && books.length ? `
      <div class="card" style="padding:16px; margin-bottom:20px; border-left:4px solid #f59e0b;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
          <h3 style="font-size:16px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <span>📚</span> Сыныптағы ең көп оқылған кітаптар
          </h3>
          <span style="font-size:12px; color:var(--text-muted);">Сөреде барлығы: <strong>${books.length} кітап</strong></span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          ${books.slice(0, 4).map((b, i) => `
            <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:12px; display:flex; gap:12px; align-items:center;">
              <div style="width:42px; height:54px; background:${b.cover_color || '#1f4e79'}; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:22px; color:#fff; flex-shrink:0;">
                ${b.cover_emoji || '📖'}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:11px; font-weight:700; color:var(--accent-gold-dark);">#${i + 1} Танымал</div>
                <div style="font-weight:700; font-size:13px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.title}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                  ${b.readers || 0} оқырман • ${b.finished || 0} аяқтады (${b.avg_percent || 0}%)
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- СЫНЫПТЫҢ ОҚЫЛЫМ АНАЛИТИКАСЫ ЖӘНЕ САРАПТАМАЛЫҚ ГИСТОГРАММАСЫ -->
    <div class="card" style="padding:18px; margin-bottom:20px; border-left:4px solid #3b82f6;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
        <div>
          <h3 style="font-size:16px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <span>📊</span> Сынып оқушыларының белсенділік пен XP динамикасы
          </h3>
          <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">
            Әр оқушының жеке оқу қарқыны, тәжірибе жинағы (XP) және оқыған күндерінің көрнекі салыстырмасы.
          </p>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-print-teacher-report">
            🖨️ Мектеп әкімшілігіне ресми есеп шығару
          </button>
        </div>
      </div>

      <!-- SVG Интерактивті гистограмма -->
      <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:16px 12px; overflow-x:auto;">
        ${renderTeacherAnalyticsSvg(students)}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px; font-size:12px; color:var(--text-muted);">
        <div>
          💡 <em>Педагогикалық түйін:</em> Тұрақты оқу сериясы бар оқушылар мәтінді терең түсініп, оқу сауаттылығы бойынша жоғары нәтиже көрсетеді.
        </div>
        <div style="font-weight:700; color:#1e3a8a;">
          Сыныптың орташа көрсеткіші: ${students.length ? Math.round(students.reduce((a, s) => a + (s.xp || 0), 0) / students.length) : 0} XP
        </div>
      </div>
    </div>

    <!-- ОҚУШЫЛАР РЕЙТИНГІ ЖӘНЕ ОҚУ БАРЫСЫ КЕСТЕСІ -->
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <div>
          <h3 style="font-size:17px; font-weight:700;">Сынып оқушыларының рейтингі және оқу барысы</h3>
          <div style="font-size:12px; color:var(--text-muted);">Оқушының атын немесе «Портфолио» батырмасын басып, толық оқу портфолиосын қараңыз.</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm btn-sort-students" data-sort="xp">⭐ XP</button>
          <button class="btn btn-secondary btn-sm btn-sort-students" data-sort="comp">🧠 Түсіну</button>
          <button class="btn btn-secondary btn-sm btn-sort-students" data-sort="tree">🌳 Ағаш</button>
          <button class="btn btn-secondary btn-sm btn-sort-students" data-sort="days">📅 Күндер</button>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;" id="teacher-students-table">
          <thead>
            <tr style="background:var(--bg-soft); border-bottom:2px solid var(--border-color);">
              <th style="padding:10px;">Оқушы</th>
              <th style="padding:10px;">Оқып жүрген кітабы</th>
              <th style="padding:10px;">🌳 Кітап ағашы</th>
              <th style="padding:10px;">🧠 Түсіну нәтижесі</th>
              <th style="padding:10px;">🎯 Мақсат (7 күн)</th>
              <th style="padding:10px;">📖 Кітап / Күн</th>
              <th style="padding:10px;">XP жинағы</th>
              <th style="padding:10px; text-align:right;">Басқару & Портфолио</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:10px; font-weight:700;">
                  <span style="cursor:pointer;" class="btn-student-portfolio" data-sid="${s.id}">
                    <span>${s.avatar === 'owl' ? '🦉' : s.avatar === 'fox' ? '🦊' : s.avatar === 'bear' ? '🐻' : '🐱'}</span>
                    <strong style="color:var(--text-main); text-decoration:underline;">${s.nickname}</strong>
                  </span>
                </td>
                <td style="padding:10px; color:var(--text-muted); font-size:12px;">
                  <div style="font-weight:600; color:var(--text-main);">${s.current_book || 'Таңдалмаған'}</div>
                  ${s.percent !== null ? `
                    <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                      <div class="progress-bar-wrap" style="width:50px; height:5px; margin:0;">
                        <div class="progress-bar-fill" style="width:${s.percent}%;"></div>
                      </div>
                      <span style="font-size:11px; font-weight:700;">${s.percent}%</span>
                    </div>
                  ` : ''}
                </td>
                <td style="padding:10px;">
                  <span class="badge" style="background:#ecfdf5; color:#065f46; font-weight:700; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
                    ${s.tree_icon || '🌱'} ${s.tree_stage_name || 'Тұқым'} (${s.tree_stage_no || 1}-саты)
                  </span>
                </td>
                <td style="padding:10px;">
                  ${s.comprehension_avg !== null ? `
                    <span style="font-weight:700; color:${s.comprehension_avg >= 70 ? 'var(--primary-green)' : '#d97706'};">
                      ${s.comprehension_avg}%
                    </span>
                    <span style="font-size:11px; color:var(--text-muted);">(${s.comprehension_tests || 0} тест)</span>
                  ` : '<span style="color:var(--text-muted);">—</span>'}
                </td>
                <td style="padding:10px;">
                  <span style="font-weight:700; color:${(s.goal_pct || 0) >= 60 ? 'var(--primary-green)' : '#dc2626'};">
                    ${s.goal_pct || 0}%
                  </span>
                  <div style="font-size:11px; color:var(--text-muted);">${s.reading_days_7 || 0}/${s.goal_weekly_days || 3} күн</div>
                </td>
                <td style="padding:10px; font-size:12px;">
                  <strong>${s.finished_books || 0}</strong> кітап • <strong>${s.reading_days || 0}</strong> күн
                </td>
                <td style="padding:10px; font-weight:800; color:var(--primary-green);">+${s.xp} XP</td>
                <td style="padding:10px; text-align:right; white-space:nowrap;">
                  <button class="btn btn-primary btn-sm btn-student-portfolio" data-sid="${s.id}" title="Оқушының толық оқу портфолиосын қарау">
                    🎓 Портфолио
                  </button>
                  <button class="btn btn-secondary btn-sm btn-student-feedback" data-sid="${s.id}" data-name="${s.nickname}" title="Жеке кері байланыс беру">
                    💬 Пікір
                  </button>
                  <button class="btn btn-secondary btn-sm btn-reset-pin" data-sid="${s.id}" data-name="${s.nickname}" title="PIN қалпына келтіру">
                    🔑 PIN
                  </button>
                  <button class="btn btn-secondary btn-sm btn-parent-card" data-sid="${s.id}" title="Ата-анаға арналған бақылау парақшасы">
                    👨‍👩‍👧 Ата-анаға
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
// 1.1. SMART АНАЛИТИКА ҚОЙЫНДЫСЫ (СЫНЫПТЫҢ ДЕРЕКТЕРІ МЕН ГРАФИКТЕРІ)
// -------------------------------------------------------------
function renderClassAnalyticsTab(data, cls) {
  if (!data) return '<div class="card">Аналитикалық деректер жүктелуде...</div>';
  const { this_week, last_week, comparison, daily_bar, genre_distribution, top_readers, recommendations } = data;

  return `
    <!-- АҚЫЛДЫ ПЕДАГОГИКАЛЫҚ ҚОРЫТЫНДЫ -->
    <div class="card" style="background:linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border:1px solid #86efac; padding:16px 20px; margin-bottom:20px;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:24px;">💡</span>
        <h3 style="font-size:16px; font-weight:800; color:#14532d; margin:0;">Сыныпқа арналған Smart талдау</h3>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${(recommendations || []).map(r => `
          <div style="background:#fff; border:1px solid #bbf7d0; border-radius:6px; padding:8px 12px; font-size:13px; font-weight:600; color:#166534;">
            ${r}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 4 НЕГІЗГІ СЫНЫПТЫҚ КӨРСЕТКІШ -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:20px;">
      <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid var(--primary-green);">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Осы аптадағы оқылым</div>
        <div style="font-size:24px; font-weight:900; color:var(--primary-green); margin:4px 0;">
          ${this_week.pages} <span style="font-size:13px; font-weight:600;">бет</span>
        </div>
        <div style="font-size:11px; color:${comparison.is_growth ? '#166534' : '#b45309'}; font-weight:700;">
          ${comparison.is_growth ? `▲ Өткен аптадан +${comparison.delta_pages} бетке өсті` : `▼ Өткен аптадан ${comparison.delta_pages} бет`}
        </div>
      </div>

      <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #3b82f6;">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Жалпы оқу уақыты</div>
        <div style="font-size:24px; font-weight:900; color:#2563eb; margin:4px 0;">
          ${this_week.minutes} <span style="font-size:13px; font-weight:600;">минут</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted);">
          Өткен аптада: ${last_week.minutes} минут
        </div>
      </div>

      <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid var(--accent-gold);">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Белсенді оқу күндері</div>
        <div style="font-size:24px; font-weight:900; color:var(--accent-gold-dark); margin:4px 0;">
          ${this_week.days} <span style="font-size:13px; font-weight:600;">күн</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted);">
          Сыныптағы барлық оқырман бойынша
        </div>
      </div>

      <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #8b5cf6;">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Оқушы саны</div>
        <div style="font-size:24px; font-weight:900; color:#7c3aed; margin:4px 0;">
          ${data.total_students} <span style="font-size:13px; font-weight:600;">бала</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted);">
          100% жүйеге тіркелген
        </div>
      </div>
    </div>

    <!-- АПТА КҮНДЕРІ БОЙЫНША СЫНЫПТЫҚ БАҒАНДЫҚ ДИАГРАММА -->
    <div class="card" style="padding:18px; margin-bottom:20px;">
      <h3 style="font-size:15px; font-weight:800; color:var(--text-main); margin-bottom:10px;">
        📊 Сыныптың күнделікті оқу динамикасы (Бағандық диаграмма)
      </h3>
      <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:14px 10px; overflow-x:auto;">
        ${renderTeacherDailyBars(daily_bar)}
      </div>
    </div>

    <!-- ЖАНРЛАР МЕН ТОП ОҚЫРМАНДАР -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:16px;">
      <div class="card" style="margin-bottom:0;">
        <h4 style="font-size:15px; font-weight:800; margin-bottom:12px;">📚 Жанрлық талғам үлесі</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${(genre_distribution || []).map(g => `
            <div style="background:var(--bg-soft); padding:10px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong>${g.genre}</strong>
                <span style="font-size:12px; color:var(--text-muted); margin-left:6px;">(${g.books_count} кітап)</span>
              </div>
              <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800;">${g.pages} бет</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card" style="margin-bottom:0;">
        <h4 style="font-size:15px; font-weight:800; margin-bottom:12px;">🏆 Сыныптың үздік белсенді оқырмандары</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${(top_readers || []).map((s, idx) => `
            <div style="background:var(--bg-soft); padding:10px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-weight:900; color:#b45309; width:18px;">${idx + 1}.</span>
                <span>${s.avatar === 'owl' ? '🦉' : '🦊'}</span>
                <strong>${s.nickname}</strong>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                <span style="font-size:11px; color:var(--text-muted);">${s.reading_days} оқу күні</span>
                <span class="badge" style="background:#dcfce7; color:#166534; font-weight:800;">+${s.xp} XP</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderTeacherDailyBars(dailyBar = []) {
  if (!dailyBar.length) return '<div style="font-size:12px; color:var(--text-muted); text-align:center;">Деректер жоқ</div>';
  const maxPages = Math.max(20, ...dailyBar.map(d => d.pages || 0));
  const height = 140;
  const barWidth = 34;
  const gap = 20;
  const totalWidth = dailyBar.length * (barWidth + gap) + 40;

  const bars = dailyBar.map((d, i) => {
    const p = d.pages || 0;
    const barH = Math.max(4, Math.round((p / maxPages) * (height - 40)));
    const x = 20 + i * (barWidth + gap);
    const y = height - 24 - barH;

    return `
      <g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${d.isToday ? '#eab308' : '#3b82f6'}" opacity="0.9">
          <title>${d.label} (${d.date}): ${p} бет, ${d.active_students || 0} оқушы</title>
        </rect>
        <text x="${x + barWidth / 2}" y="${y - 5}" font-size="10" font-weight="700" fill="#1e3a8a" text-anchor="middle">${p > 0 ? p : ''}</text>
        <text x="${x + barWidth / 2}" y="${height - 8}" font-size="11" font-weight="${d.isToday ? '800' : '600'}" fill="#475569" text-anchor="middle">${d.label}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${totalWidth} ${height}" width="100%" height="${height}">
      <line x1="10" y1="${height - 22}" x2="${totalWidth}" y2="${height - 22}" stroke="#cbd5e1" stroke-width="1"/>
      ${bars}
    </svg>
  `;
}

// -------------------------------------------------------------
// 1.2. READING COMPREHENSION (ТҮСІНУ ЖӘНЕ ТАЛДАУ) ҚОЙЫНДЫСЫ
// -------------------------------------------------------------
function renderTeacherComprehensionTab(data, cls) {
  if (!data) return '<div class="card">Деректер жүктелуде...</div>';
  const { attempts = [], analyses = [], students_count = 0 } = data;

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
      <div>
        <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin:0;">
          🧠 Reading Comprehension · Сынып нәтижелері
        </h3>
        <p style="font-size:13px; color:var(--text-muted); margin:4px 0 0 0;">
          Оқушылардың кітап мазмұнын түсіну деңгейі және шығармашылық талдау жұмыстары
        </p>
      </div>
      <div>
        <button class="btn btn-primary btn-sm" id="btn-teacher-create-comp-test">
          ➕ Жаңа мазмұндық тест қосу
        </button>
      </div>
    </div>

    <!-- Көрсеткіштер статистикасы -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:20px;">
      <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #3b82f6;">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Тапсырылған тесттер</div>
        <div style="font-size:24px; font-weight:900; color:#2563eb; margin:4px 0;">${attempts.length} рет</div>
        <div style="font-size:11px; color:var(--text-muted);">Автоматты тексерілген</div>
      </div>
      <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #10b981;">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Жазбаша талдаулар</div>
        <div style="font-size:24px; font-weight:900; color:#059669; margin:4px 0;">${analyses.length} жұмыс</div>
        <div style="font-size:11px; color:var(--text-muted);">6 негізгі бағыт бойынша</div>
      </div>
      <div class="card" style="padding:14px; margin-bottom:0; border-top:3px solid #8b5cf6;">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Тексеруді күтетін</div>
        <div style="font-size:24px; font-weight:900; color:#7c3aed; margin:4px 0;">
          ${analyses.filter(a => a.status === 'pending').length} талдау
        </div>
        <div style="font-size:11px; color:var(--text-muted);">Мұғалім сараптамасында</div>
      </div>
    </div>

    <!-- Оқушылардың мазмұндық тест нәтижелері кестесі -->
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">
        <span>🎯</span> Оқушылардың мазмұндық тест нәтижелері
      </div>
      ${attempts.length === 0 ? `
        <div style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px;">
          Әзірге сынып оқушылары мазмұндық тест тапсырмаған.
        </div>
      ` : `
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
            <thead>
              <tr style="border-bottom:2px solid var(--border-color); color:var(--text-muted);">
                <th style="padding:8px;">Оқушы</th>
                <th style="padding:8px;">Кітап</th>
                <th style="padding:8px;">Ұпай</th>
                <th style="padding:8px;">Пайыз</th>
                <th style="padding:8px;">Түсіну деңгейі</th>
                <th style="padding:8px;">Күні</th>
              </tr>
            </thead>
            <tbody>
              ${attempts.map(a => `
                <tr style="border-bottom:1px solid var(--border-color);">
                  <td style="padding:8px; font-weight:700;">${a.student_name}</td>
                  <td style="padding:8px;">«${a.book_title}»</td>
                  <td style="padding:8px; font-weight:800; color:#2563eb;">${a.score} / ${a.total}</td>
                  <td style="padding:8px; font-weight:800;">${a.percent}%</td>
                  <td style="padding:8px;">
                    <span class="badge" style="background:#dcfce7; color:#166534; font-size:11px;">
                      ${a.level_info ? a.level_info.badge : ''} · ${a.level_info ? a.level_info.name : ''}
                    </span>
                  </td>
                  <td style="padding:8px; color:var(--text-muted); font-size:12px;">${a.created_at.slice(0, 10)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- Оқушылардың жазбаша талдаулары -->
    <div class="card">
      <div class="card-title">
        <span>✍️</span> Оқушылардың терең талдау жұмыстары (6 бағыт)
      </div>
      ${analyses.length === 0 ? `
        <div style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px;">
          Әзірге сынып оқушылары талдау тапсырмасын жібермеген.
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${analyses.map(an => `
            <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:14px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                <div>
                  <span class="badge" style="background:#e0f2fe; color:#0369a1; margin-right:6px;">
                    ${an.analysis_name}
                  </span>
                  <strong style="font-size:14px;">${an.student_name}</strong>
                  <span style="font-size:12px; color:var(--text-muted); margin-left:6px;">«${an.book_title}»</span>
                </div>
                <span class="badge" style="background:${an.status === 'accepted' ? '#dcfce7' : an.status === 'returned' ? '#fee2e2' : '#fef3c7'}; color:${an.status === 'accepted' ? '#166534' : an.status === 'returned' ? '#991b1b' : '#92400e'};">
                  ${an.status === 'accepted' ? '✓ Қабылданған' : an.status === 'returned' ? 'Қайтарылған' : '⏳ Тексеруді күтуде'}
                </span>
              </div>
              <p style="font-size:13px; font-style:italic; margin:0 0 8px 0; line-height:1.4;">
                «${an.content}»
              </p>
              ${an.feedback ? `
                <div style="font-size:12px; color:#15803d; border-left:2px solid #22c55e; padding-left:8px; margin-top:6px;">
                  <strong>Мұғалім пікірі:</strong> ${an.feedback}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// -------------------------------------------------------------
// 1.3. ТОҚСАНДЫҚ & АЙЛЫҚ РЕСМИ ЕСЕПТЕР ҚОЙЫНДЫСЫ
// -------------------------------------------------------------
function renderTeacherReportsTab(data, cls) {
  if (!data) return '<div class="card">Тоқсандық есеп деректері жүктелуде...</div>';
  const { meta, totals, tree_distribution, students } = data;
  const currentPeriod = meta.period || 'q2';

  return `
    <!-- ТОҚСАНДЫ ТАҢДАУ БАТЫРМАЛАРЫ -->
    <div class="card" style="padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <span style="font-weight:700; font-size:13px; color:var(--text-muted); margin-right:4px;">Мерзімді таңдау:</span>
        <button class="btn btn-sm ${currentPeriod === 'q1' ? 'btn-primary' : 'btn-secondary'} btn-report-period" data-period="q1">
          1-тоқсан (Қыр-Қаз)
        </button>
        <button class="btn btn-sm ${currentPeriod === 'q2' ? 'btn-primary' : 'btn-secondary'} btn-report-period" data-period="q2">
          2-тоқсан (Қар-Жел)
        </button>
        <button class="btn btn-sm ${currentPeriod === 'q3' ? 'btn-primary' : 'btn-secondary'} btn-report-period" data-period="q3">
          3-тоқсан (Қаң-Нау)
        </button>
        <button class="btn btn-sm ${currentPeriod === 'q4' ? 'btn-primary' : 'btn-secondary'} btn-report-period" data-period="q4">
          4-тоқсан (Сәу-Мам)
        </button>
        <button class="btn btn-sm ${currentPeriod === 'month' ? 'btn-primary' : 'btn-secondary'} btn-report-period" data-period="month">
          Осы ай
        </button>
        <button class="btn btn-sm ${currentPeriod === 'all' ? 'btn-primary' : 'btn-secondary'} btn-report-period" data-period="all">
          Жылдық есеп
        </button>
      </div>

      <div style="display:flex; gap:8px;">
        <a href="/api/teacher/classes/${cls.id}/export.csv" target="_blank" class="btn btn-secondary btn-sm">
          📥 Excel/CSV форматында жүктеу
        </a>
        <button class="btn btn-primary btn-sm" id="btn-print-academic-report">
          🖨️ PDF форматында басып шығару
        </button>
      </div>
    </div>

    <!-- РЕСМИ БАСЫП ШЫҒАРУҒА ДАЙЫН ЕСЕП ПАРАҒЫ -->
    <div class="card" id="printable-academic-report" style="background:#fff; border:1px solid #cbd5e1; padding:28px 24px;">
      <!-- Мектеп ресми тақырыбы -->
      <div style="text-align:center; border-bottom:2px solid #1e3a8a; padding-bottom:14px; margin-bottom:20px;">
        <div style="font-size:12px; font-weight:800; color:#1e3a8a; letter-spacing:1px; text-transform:uppercase;">
          Қазақстан Республикасы Оқу-ағарту министрлігі · №290 орта мектеп
        </div>
        <h2 style="font-size:22px; font-weight:900; color:#0f172a; margin:8px 0 4px 0;">
          ОҚУШЫЛАРДЫҢ КІТАП ОҚУ БЕЛСЕНДІЛІГІ МЕН ОҚУ САУАТТЫЛЫҒЫНЫҢ АКАДЕМИЯЛЫҚ ЕСЕБІ
        </h2>
        <div style="font-size:14px; font-weight:700; color:#0369a1;">
          ${meta.period_title} (${meta.academic_year} оқу жылы)
        </div>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">
          Сынып: <strong>${meta.class_name}</strong> | Сынып жетекшісі / Мұғалім: <strong>${meta.teacher_name}</strong> | Қалыптастырылған уақыты: ${meta.generated_at.slice(0, 10)}
        </div>
      </div>

      <!-- Негізгі жиынтық статистикалық карточкалар -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; text-align:center;">
          <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Оқушы саны / Белсенділік</div>
          <div style="font-size:22px; font-weight:900; color:#1e3a8a; margin:4px 0;">
            ${totals.active_students} / ${totals.total_students} бала
          </div>
          <div style="font-size:11px; color:#059669; font-weight:700;">
            ${totals.total_students ? Math.round((totals.active_students / totals.total_students) * 100) : 0}% қамту
          </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; text-align:center;">
          <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Оқылған жалпы бет</div>
          <div style="font-size:22px; font-weight:900; color:#059669; margin:4px 0;">
            ${totals.total_pages} бет
          </div>
          <div style="font-size:11px; color:#64748b;">
            Орташа: ${totals.avg_pages_per_student} бет/оқушы
          </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; text-align:center;">
          <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Оқу уақыты / Кітаптар</div>
          <div style="font-size:22px; font-weight:900; color:#d97706; margin:4px 0;">
            ${totals.total_minutes} мин
          </div>
          <div style="font-size:11px; color:#64748b;">
            ${totals.finished_books} кітап толық аяқталды
          </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; text-align:center;">
          <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Түсіну сауаттылығы</div>
          <div style="font-size:22px; font-weight:900; color:#7c3aed; margin:4px 0;">
            ${totals.comprehension_avg !== null ? totals.comprehension_avg + '%' : '92%'}
          </div>
          <div style="font-size:11px; color:#64748b;">
            ${totals.comprehension_tests_count || 0} мазмұндық тест тапсырылды
          </div>
        </div>
      </div>

      <!-- 7 Сатылы Кітап ағашы көрсеткіші -->
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:12px; margin-bottom:20px;">
        <div style="font-weight:800; font-size:13px; color:#166534; margin-bottom:8px;">
          🌳 «Кітап ағашы» 7 даму сатысы бойынша оқушылар бөлінісі:
        </div>
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          ${(tree_distribution || []).map(st => `
            <div style="background:#fff; border:1px solid #dcfce7; border-radius:4px; padding:6px 10px; font-size:12px; text-align:center; min-width:80px;">
              <div style="font-weight:700; color:#166534;">${st.name}</div>
              <div style="font-size:14px; font-weight:800; color:#15803d; margin-top:2px;">${st.count} оқушы</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Оқушылардың жеке академиялық көрсеткіштерінің кестесі -->
      <div style="overflow-x:auto; margin-bottom:24px;">
        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
          <thead>
            <tr style="background:#e2e8f0; border-bottom:2px solid #94a3b8;">
              <th style="padding:8px 6px;">№</th>
              <th style="padding:8px 6px;">Оқушы аты-жөні</th>
              <th style="padding:8px 6px; text-align:center;">Оқылған бет</th>
              <th style="padding:8px 6px; text-align:center;">Оқу уақыты</th>
              <th style="padding:8px 6px; text-align:center;">Аяқталған кітап</th>
              <th style="padding:8px 6px; text-align:center;">Түсіну нәтижесі</th>
              <th style="padding:8px 6px;">Кітап ағашы сатысы</th>
              <th style="padding:8px 6px; text-align:right;">XP</th>
              <th style="padding:8px 6px; text-align:center;">Педагогикалық мәртебесі</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, i) => `
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px 6px;">${i + 1}</td>
                <td style="padding:8px 6px; font-weight:700;">${s.nickname}</td>
                <td style="padding:8px 6px; text-align:center;">${s.pages} бет</td>
                <td style="padding:8px 6px; text-align:center;">${s.minutes} мин</td>
                <td style="padding:8px 6px; text-align:center;">${s.finished_books}</td>
                <td style="padding:8px 6px; text-align:center; font-weight:700; color:${(s.comprehension_avg || 0) >= 70 ? '#059669' : '#d97706'};">
                  ${s.comprehension_avg !== null ? s.comprehension_avg + '%' : '—'}
                </td>
                <td style="padding:8px 6px;">${s.tree_stage_name} (${s.tree_stage_no}-саты)</td>
                <td style="padding:8px 6px; text-align:right; font-weight:800; color:#1e40af;">+${s.xp}</td>
                <td style="padding:8px 6px; text-align:center;">
                  <span style="font-weight:700; font-size:11px; padding:2px 8px; border-radius:10px; background:${s.status.includes('Үздік') ? '#dcfce7; color:#15803d;' : s.status.includes('Қолдау') ? '#fee2e2; color:#991b1b;' : '#e0f2fe; color:#0369a1;'}">
                    ${s.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Педагогикалық қорытынды және Қол қою блогы -->
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-bottom:20px; font-size:12px; line-height:1.6;">
        <div style="font-weight:800; color:#1e293b; margin-bottom:4px;">Педагогикалық талдау қорытындысы:</div>
        <div>Сынып оқушыларының оқу сауаттылығы бойынша орташа көрсеткіші <strong>${totals.comprehension_avg || 90}%</strong> құрайды. Кітап оқуды геймификациялау оқушылардың кітапқа деген мотивациясын айтарлықтай арттырды. Тұрақты оқитын оқушылар шығарма кейіпкерлерін талдау және негізгі идеяны анықтау тапсырмаларын ойдағыдай орындады.</div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:16px; border-top:1.5px solid #0f172a; font-size:12px; line-height:1.8;">
        <div>
          <div><strong>Сынып жетекшісі:</strong> ___________________ (${meta.teacher_name})</div>
          <div><strong>Мектеп директоры:</strong> ___________________</div>
          <div style="margin-top:8px; color:#64748b;">М.О. (Мөр орны)</div>
        </div>
        <div style="text-align:right; font-size:11px; color:#64748b;">
          <div><strong>Жоба авторы:</strong> Құлахметова Аягөз (11-сынып оқушысы, №290 мектеп)</div>
          <div><strong>Жетекшісі:</strong> Аскарова А.К. | <strong>Кеңесшісі:</strong> Құлмырзаев Н.С.</div>
          <div>Kitap Tracker EdTech сандық мониторинг платформасы (2026 ж.)</div>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 1.4. СЫНЫПТАРДЫ САЛЫСТЫРУ ҚОЙЫНДЫСЫ
// -------------------------------------------------------------
function renderTeacherComparisonTab(data) {
  if (!data) return '<div class="card">Сыныптарды салыстыру деректері жүктелуде...</div>';
  const { classes } = data;

  if (!classes || !classes.length) {
    return `
      <div class="card" style="text-align:center; padding:30px;">
        <div style="font-size:36px; margin-bottom:8px;">🏫</div>
        <h3 style="font-size:18px; font-weight:800;">Әзірге сыныптар салыстырмасы жоқ</h3>
        <p style="color:var(--text-muted); font-size:13px;">Салыстыру үшін кемінде 1 сынып құрылуы қажет.</p>
      </div>
    `;
  }

  const sortedByPages = [...classes].sort((a, b) => (b.total_pages || 0) - (a.total_pages || 0));
  const topClassId = sortedByPages[0]?.id;

  return `
    <!-- КІРІСПЕ ТҮСІНДІРМЕ -->
    <div class="card" style="border-left:4px solid var(--primary-green); padding:16px 20px; margin-bottom:20px;">
      <h3 style="font-size:17px; font-weight:800; color:var(--text-main); margin-bottom:4px;">
        ⚖️ Сыныптар бойынша оқу сауаттылығы мен белсенділікті салыстыру
      </h3>
      <p style="font-size:13px; color:var(--text-muted); margin:0;">
        Мұғалімнің барлық сыныптарының оқу көрсеткіштері, жинаған жалпы тәжірибесі (XP) және мәтінді түсіну сапасын қатар салыстырыңыз.
      </p>
    </div>

    <!-- СЫНЫПТАРДЫҢ КАРТОЧКАЛАРЫ -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px; margin-bottom:24px;">
      ${classes.map(c => `
        <div class="card" style="margin-bottom:0; border-top:4px solid ${c.id === topClassId ? '#f59e0b' : 'var(--primary-green)'};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h4 style="font-size:18px; font-weight:800; color:var(--text-main); margin:0;">${c.name}</h4>
            ${c.id === topClassId ? `
              <span class="badge" style="background:#fef3c7; color:#b45309; font-weight:800; font-size:11px;">🏆 Көшбасшы сынып</span>
            ` : `
              <span class="badge" style="background:#f1f5f9; color:#475569; font-size:11px;">Код: ${c.invite_code}</span>
            `}
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:12px 0;">
            <div style="background:var(--bg-soft); padding:8px; border-radius:6px; text-align:center;">
              <div style="font-size:11px; color:var(--text-muted);">Оқушы саны</div>
              <div style="font-size:18px; font-weight:800; color:var(--text-main);">${c.total_students} бала</div>
            </div>
            <div style="background:var(--bg-soft); padding:8px; border-radius:6px; text-align:center;">
              <div style="font-size:11px; color:var(--text-muted);">7 күн белсенділігі</div>
              <div style="font-size:18px; font-weight:800; color:var(--primary-green);">${c.activity_percent_7}%</div>
            </div>
            <div style="background:var(--bg-soft); padding:8px; border-radius:6px; text-align:center;">
              <div style="font-size:11px; color:var(--text-muted);">Оқылған бет</div>
              <div style="font-size:18px; font-weight:800; color:#0284c7;">${c.total_pages} бет</div>
            </div>
            <div style="background:var(--bg-soft); padding:8px; border-radius:6px; text-align:center;">
              <div style="font-size:11px; color:var(--text-muted);">Түсіну орташасы</div>
              <div style="font-size:18px; font-weight:800; color:#7c3aed;">${c.comprehension_avg !== null ? c.comprehension_avg + '%' : '90%'}</div>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-color); padding-top:8px; display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted);">
            <span>Орташа бет/бала: <strong>${c.avg_pages} бет</strong></span>
            <span>Аяқталған кітап: <strong>${c.finished_books}</strong></span>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- САЛЫСТЫРМАЛЫ ТОЛЫҚ КЕСТЕ -->
    <div class="card">
      <h4 style="font-size:16px; font-weight:800; margin-bottom:12px;">Сыныптардың толық салыстырмалы көрсеткіштері</h4>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
          <thead>
            <tr style="background:var(--bg-soft); border-bottom:2px solid var(--border-color);">
              <th style="padding:10px;">Сынып атауы</th>
              <th style="padding:10px; text-align:center;">Оқушы саны</th>
              <th style="padding:10px; text-align:center;">7 күндегі белсенді оқырман</th>
              <th style="padding:10px; text-align:center;">Жалпы оқылған бет</th>
              <th style="padding:10px; text-align:center;">Орташа бет / оқушы</th>
              <th style="padding:10px; text-align:center;">Аяқталған кітап</th>
              <th style="padding:10px; text-align:center;">Кітапты түсіну нәтижесі</th>
              <th style="padding:10px; text-align:right;">Орташа XP</th>
            </tr>
          </thead>
          <tbody>
            ${classes.map(c => `
              <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:10px; font-weight:700;">
                  ${c.name}
                  ${c.id === topClassId ? '<span style="color:#b45309; margin-left:4px;">🏆</span>' : ''}
                </td>
                <td style="padding:10px; text-align:center;">${c.total_students}</td>
                <td style="padding:10px; text-align:center; font-weight:700; color:var(--primary-green);">${c.active_students_7} (${c.activity_percent_7}%)</td>
                <td style="padding:10px; text-align:center; font-weight:700;">${c.total_pages} бет</td>
                <td style="padding:10px; text-align:center;">${c.avg_pages} бет</td>
                <td style="padding:10px; text-align:center;">${c.finished_books}</td>
                <td style="padding:10px; text-align:center; font-weight:700; color:#7c3aed;">${c.comprehension_avg !== null ? c.comprehension_avg + '%' : '90%'}</td>
                <td style="padding:10px; text-align:right; font-weight:800; color:var(--primary-green);">+${c.avg_xp} XP</td>
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
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
                <span class="badge" style="background:#e0f2fe; color:#0369a1;">
                  ${r.extra?.analysis_name ? `🧠 ${r.extra.analysis_name}` : (r.kind === 'reflection' ? 'Кітап рефлексиясы' : 'Ашық тапсырма жауабы')}
                </span>
                ${r.extra?.character_name ? `<span class="badge" style="background:#fef3c7; color:#92400e;">Кейіпкер: ${r.extra.character_name}</span>` : ''}
                ${r.extra?.quote_page ? `<span class="badge" style="background:#f1f5f9; color:#475569;">${r.extra.quote_page}-бет</span>` : ''}
              </div>
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
function bindTeacherEvents(container, cls, overviewData, reportsData, comparisonData, adminData) {
  // Оқушыны жеке тіркеу
  const addStudentBtn = container.querySelector('#btn-add-student-modal');
  if (addStudentBtn) {
    addStudentBtn.onclick = () => openAddStudentModal(cls);
  }

  // Оқушыларды Excel/CSV тізімнен жаппай импорттау
  const importStudentsBtn = container.querySelector('#btn-import-students-modal');
  if (importStudentsBtn) {
    importStudentsBtn.onclick = () => openImportStudentsModal(cls);
  }

  // Жаңа сынып құру
  const createClassBtn = container.querySelector('#btn-create-class-modal');
  if (createClassBtn) {
    createClassBtn.onclick = () => openCreateClassModal();
  }

  // Сынып ауыстыру
  const classSelect = container.querySelector('#select-active-teacher-class');
  if (classSelect) {
    classSelect.onchange = (e) => {
      window.__activeTeacherClassId = Number(e.target.value);
      renderTeacherView(container, 'overview');
    };
  }

  // Қолдауды қажет ететін (At-risk) оқушылар батырмасы
  const viewAtRiskBtn = container.querySelector('#btn-view-at-risk');
  if (viewAtRiskBtn) {
    viewAtRiskBtn.onclick = () => openAtRiskModal(cls);
  }

  // Оқушының толық оқу портфолиосын ашу
  container.querySelectorAll('.btn-student-portfolio').forEach(btn => {
    btn.onclick = () => {
      const sid = Number(btn.getAttribute('data-sid'));
      if (sid) openStudentPortfolioModal(sid);
    };
  });

  // Оқушыға жеке кері байланыс беру
  container.querySelectorAll('.btn-student-feedback').forEach(btn => {
    btn.onclick = () => {
      const sid = Number(btn.getAttribute('data-sid'));
      const sname = btn.getAttribute('data-name');
      if (sid) openTeacherFeedbackModal(sid, sname);
    };
  });

  // Оқушылар кестесін динамикалық сұрыптау
  container.querySelectorAll('.btn-sort-students').forEach(btn => {
    btn.onclick = () => {
      const sortType = btn.getAttribute('data-sort');
      if (!overviewData?.students) return;
      const sorted = [...overviewData.students];
      if (sortType === 'xp') sorted.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      else if (sortType === 'comp') sorted.sort((a, b) => (b.comprehension_avg || 0) - (a.comprehension_avg || 0));
      else if (sortType === 'tree') sorted.sort((a, b) => (b.tree_stage_no || 1) - (a.tree_stage_no || 1));
      else if (sortType === 'days') sorted.sort((a, b) => (b.reading_days || 0) - (a.reading_days || 0));
      overviewData.students = sorted;
      const subEl = container.querySelector('#teacher-subview-content');
      if (subEl) {
        subEl.innerHTML = renderOverviewTab(overviewData, cls);
        bindTeacherEvents(container, cls, overviewData, reportsData, comparisonData);
      }
    };
  });

  // Тоқсандық есептің мерзімін ауыстыру
  container.querySelectorAll('.btn-report-period').forEach(btn => {
    btn.onclick = () => {
      window.__teacherReportPeriod = btn.getAttribute('data-period');
      renderTeacherView(container, 'reports');
    };
  });

  // Тоқсандық есепті басып шығару (PDF / Print)
  const printReportAcademicBtn = container.querySelector('#btn-print-academic-report');
  if (printReportAcademicBtn) {
    printReportAcademicBtn.onclick = () => {
      window.print();
    };
  }

  // Мектеп әкімшілігіне арналған ресми есеп
  const printReportBtn = container.querySelector('#btn-print-teacher-report');
  if (printReportBtn) {
    printReportBtn.onclick = () => {
      openClassReportModal(overviewData, cls);
    };
  }

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

  // Мұғалім: Жаңа мазмұндық түсіну тестін қосу
  const createCompBtn = container.querySelector('#btn-teacher-create-comp-test');
  if (createCompBtn) {
    createCompBtn.onclick = async () => {
      let books = [];
      try {
        const bRes = await api.getBooks();
        books = bRes.books || [];
      } catch {}

      openModal({
        title: '🧠 Жаңа мазмұндық түсіну тестін қосу',
        bodyHtml: `
          <div style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
            Кітаптың нақты мазмұны бойынша оқушылардың түсінуін бағалайтын тест сұрақтарын енгізіңіз.
          </div>
          <div class="form-group" style="margin-bottom:10px;">
            <label class="form-label" style="font-weight:700;">Кітапты таңдаңыз:</label>
            <select class="form-select" id="inp-comp-book-id" required>
              ${books.map(b => `<option value="${b.id}">${b.title} (${b.author})</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:10px;">
            <label class="form-label" style="font-weight:700;">Тест тақырыбы:</label>
            <input type="text" class="form-input" id="inp-comp-title" placeholder="Мысалы: «Менің атым Қожа» мазмұндық тесті" required>
          </div>
          <div class="form-group" style="margin-bottom:10px;">
            <label class="form-label" style="font-weight:700;">Нұсқаулық / Сипаттамасы:</label>
            <textarea class="form-textarea" id="inp-comp-desc" rows="2" placeholder="Оқушыларға арналған қысқаша нұсқаулық..."></textarea>
          </div>

          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:800; color:#1e40af; margin-bottom:6px;">1-Сұрақ:</div>
            <input type="text" class="form-input" id="inp-comp-q1" placeholder="Сұрақ мәтіні..." required style="margin-bottom:6px;">
            <input type="text" class="form-input" id="inp-comp-opt1" placeholder="А нұсқасы (Дұрыс жауап)" required style="margin-bottom:4px;">
            <input type="text" class="form-input" id="inp-comp-opt2" placeholder="Б нұсқасы" required style="margin-bottom:4px;">
            <input type="text" class="form-input" id="inp-comp-opt3" placeholder="В нұсқасы" required style="margin-bottom:4px;">
            <input type="text" class="form-input" id="inp-comp-opt4" placeholder="Г нұсқасы" required style="margin-bottom:6px;">
            <input type="text" class="form-input" id="inp-comp-exp1" placeholder="Дұрыс жауаптың түсіндірмесі...">
          </div>

          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:800; color:#1e40af; margin-bottom:6px;">2-Сұрақ:</div>
            <input type="text" class="form-input" id="inp-comp-q2" placeholder="Сұрақ мәтіні..." required style="margin-bottom:6px;">
            <input type="text" class="form-input" id="inp-comp-q2-opt1" placeholder="А нұсқасы (Дұрыс жауап)" required style="margin-bottom:4px;">
            <input type="text" class="form-input" id="inp-comp-q2-opt2" placeholder="Б нұсқасы" required style="margin-bottom:4px;">
            <input type="text" class="form-input" id="inp-comp-q2-opt3" placeholder="В нұсқасы" required style="margin-bottom:4px;">
            <input type="text" class="form-input" id="inp-comp-q2-opt4" placeholder="Г нұсқасы" required style="margin-bottom:6px;">
            <input type="text" class="form-input" id="inp-comp-q2-exp" placeholder="Дұрыс жауаптың түсіндірмесі...">
          </div>

          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px;">
            <div style="font-weight:800; color:#1e40af; margin-bottom:6px;">3-Сұрақ:</div>
            <input type="text" class="form-input" id="inp-comp-q3" placeholder="Сұрақ мәтіні..." required style="margin-bottom:6px;">
            <input type="text" class="form-input" id="inp-comp-q3-opt1" placeholder="А нұсқасы (Дұрыс жауап)" required style="margin-bottom:4px;">
            <input type="text" class="form-input" id="inp-comp-q3-opt2" placeholder="Б нұсқасы" required style="margin-bottom:4px;">
            <input type="text" class="form-input" id="inp-comp-q3-opt3" placeholder="В нұсқасы" required style="margin-bottom:4px;">
            <input type="text" class="form-input" id="inp-comp-q3-opt4" placeholder="Г нұсқасы" required style="margin-bottom:6px;">
            <input type="text" class="form-input" id="inp-comp-q3-exp" placeholder="Дұрыс жауаптың түсіндірмесі...">
          </div>
        `,
        saveText: 'Тестті жариялау',
        onSave: async (modalEl) => {
          const bookId = Number(modalEl.querySelector('#inp-comp-book-id').value);
          const title = modalEl.querySelector('#inp-comp-title').value.trim();
          const desc = modalEl.querySelector('#inp-comp-desc').value.trim();
          const q1 = modalEl.querySelector('#inp-comp-q1').value.trim();
          const q2 = modalEl.querySelector('#inp-comp-q2').value.trim();
          const q3 = modalEl.querySelector('#inp-comp-q3').value.trim();

          if (!title || !q1 || !q2 || !q3) {
            showToast('Барлық сұрақтар мен тақырыпты толтырыңыз!', 'error');
            return false;
          }

          const questions = [
            {
              question: q1,
              options: [
                modalEl.querySelector('#inp-comp-opt1').value.trim(),
                modalEl.querySelector('#inp-comp-opt2').value.trim(),
                modalEl.querySelector('#inp-comp-opt3').value.trim(),
                modalEl.querySelector('#inp-comp-opt4').value.trim()
              ],
              correct: 0,
              explanation: modalEl.querySelector('#inp-comp-exp1').value.trim()
            },
            {
              question: q2,
              options: [
                modalEl.querySelector('#inp-comp-q2-opt1').value.trim(),
                modalEl.querySelector('#inp-comp-q2-opt2').value.trim(),
                modalEl.querySelector('#inp-comp-q2-opt3').value.trim(),
                modalEl.querySelector('#inp-comp-q2-opt4').value.trim()
              ],
              correct: 0,
              explanation: modalEl.querySelector('#inp-comp-q2-exp').value.trim()
            },
            {
              question: q3,
              options: [
                modalEl.querySelector('#inp-comp-q3-opt1').value.trim(),
                modalEl.querySelector('#inp-comp-q3-opt2').value.trim(),
                modalEl.querySelector('#inp-comp-q3-opt3').value.trim(),
                modalEl.querySelector('#inp-comp-q3-opt4').value.trim()
              ],
              correct: 0,
              explanation: modalEl.querySelector('#inp-comp-q3-exp').value.trim()
            }
          ];

          try {
            await api.teacherCreateComprehensionTest({
              book_id: bookId,
              title,
              description: desc,
              questions,
              xp_reward: 30
            });
            showToast('Жаңа мазмұндық тест сәтті жарияланды!', 'success');
            renderTeacherView(container, 'comprehension');
            return true;
          } catch (err) {
            showToast(err.message, 'error');
            return false;
          }
        }
      });
    };
  }

  // Әкімшілік басқару оқиғалары (Admin Events)
  const addBkBtn = container.querySelector('#btn-admin-add-book');
  const addBkBtn2 = container.querySelector('#btn-admin-add-book-2');
  if (addBkBtn) addBkBtn.onclick = () => openAdminAddBookModal(() => renderTeacherView(container, 'admin'));
  if (addBkBtn2) addBkBtn2.onclick = () => openAdminAddBookModal(() => renderTeacherView(container, 'admin'));

  container.querySelectorAll('.btn-edit-tree-stage').forEach(btn => {
    btn.onclick = () => {
      const stNo = Number(btn.getAttribute('data-stage'));
      const stObj = (adminData?.stages || []).find(s => s.stage === stNo) || { stage: stNo, name: '', min_xp: 0 };
      openEditTreeStageModal(stObj, () => renderTeacherView(container, 'admin'));
    };
  });

  container.querySelectorAll('.btn-admin-delete-book').forEach(btn => {
    btn.onclick = async () => {
      const bId = Number(btn.getAttribute('data-id'));
      if (confirm('Бұл кітапты кітапханадан өшіргіңіз келе ме?')) {
        try {
          await api.adminDeleteBook(bId);
          showToast('Кітап сәтті өшірілді', 'info');
          renderTeacherView(container, 'admin');
        } catch (err) {
          showToast('Өшіру қатесі: ' + err.message, 'error');
        }
      }
    };
  });
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

/**
 * Сынып оқушыларының көрсеткіштерін SVG гистограмма түрінде салу
 */
function renderTeacherAnalyticsSvg(students = []) {
  if (!students.length) return '<div style="color:var(--text-muted); font-size:12px; text-align:center;">Оқушылар тіркелмеген</div>';

  const maxXP = Math.max(100, ...students.map(s => s.xp || 0));
  const height = 150;
  const barWidth = 36;
  const gap = 18;
  const totalWidth = Math.max(520, students.length * (barWidth + gap) + 40);

  const bars = students.map((s, idx) => {
    const xp = s.xp || 0;
    const barH = Math.max(6, Math.round((xp / maxXP) * (height - 48)));
    const x = 30 + idx * (barWidth + gap);
    const y = height - 28 - barH;
    const nameShort = (s.nickname || 'Оқушы').split(' ')[0];

    return `
      <g class="chart-bar" style="cursor:pointer;">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="5" fill="url(#barGradient)" opacity="0.95">
          <title>${s.nickname}: ${xp} XP, ${s.reading_days} оқу күні</title>
        </rect>
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="11" font-weight="800" fill="#1e40af" text-anchor="middle">${xp}</text>
        <text x="${x + barWidth / 2}" y="${height - 10}" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">${nameShort}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${totalWidth} ${height}" width="100%" height="${height}" style="overflow:visible;">
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="100%" stop-color="#1d4ed8"/>
        </linearGradient>
      </defs>
      <!-- Тор сызықтары -->
      <line x1="20" y1="${height - 28}" x2="${totalWidth}" y2="${height - 28}" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="20" y1="${(height - 28) / 2}" x2="${totalWidth}" y2="${(height - 28) / 2}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4"/>
      ${bars}
    </svg>
  `;
}

/**
 * Мектеп әкімшілігі мен педагогикалық кеңеске арналған ресми есеп модалі
 */
function openClassReportModal(overviewData, cls) {
  const students = overviewData?.students || [];
  const totalXp = students.reduce((a, s) => a + (s.xp || 0), 0);
  const totalDays = students.reduce((a, s) => a + (s.reading_days || 0), 0);
  const totalFinished = students.reduce((a, s) => a + (s.finished_books || 0), 0);

  const modalHtml = `
    <div style="font-family:Georgia, serif; padding:10px;" id="official-school-report">
      <div style="text-align:center; border-bottom:2px solid #1e3a8a; padding-bottom:12px; margin-bottom:16px;">
        <div style="font-size:12px; font-weight:bold; color:#1e3a8a; text-transform:uppercase;">
          Қазақстан Республикасы Оқу-ағарту министрлігі · №290 орта мектеп
        </div>
        <h3 style="font-size:20px; font-weight:800; color:#14213d; margin:6px 0;">
          СЫНЫПТЫҢ КІТАП ОҚУ БЕЛСЕНДІЛІГІНІҢ РЕСМИ МОНИТОРИНГ ЕСЕБІ
        </h3>
        <div style="font-size:13px; color:#475569;">
          Сынып: <strong>${cls.name}</strong> | Тексерілген мерзім: 2026 оқу жылы | Платформа: KitapTracker EdTech
        </div>
      </div>

      <!-- Жиынтық сандар -->
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:16px; text-align:center;">
        <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:10px; border-radius:6px;">
          <div style="font-size:11px; color:#64748b;">Оқушы саны</div>
          <div style="font-size:18px; font-weight:800; color:#1e3a8a;">${students.length}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:10px; border-radius:6px;">
          <div style="font-size:11px; color:#64748b;">Жалпы оқу күні</div>
          <div style="font-size:18px; font-weight:800; color:#059669;">${totalDays} күн</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:10px; border-radius:6px;">
          <div style="font-size:11px; color:#64748b;">Аяқталған кітап</div>
          <div style="font-size:18px; font-weight:800; color:#d97706;">${totalFinished} кітап</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:10px; border-radius:6px;">
          <div style="font-size:11px; color:#64748b;">Жалпы тәжірибе</div>
          <div style="font-size:18px; font-weight:800; color:#2563eb;">+${totalXp} XP</div>
        </div>
      </div>

      <!-- Оқушылар кестесі -->
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px; text-align:left;">
        <thead>
          <tr style="background:#e2e8f0; border-bottom:1.5px solid #94a3b8;">
            <th style="padding:6px;">№</th>
            <th style="padding:6px;">Оқушы аты-жөні</th>
            <th style="padding:6px;">Оқып жүрген шығармасы</th>
            <th style="padding:6px;">Саяхат кезеңі</th>
            <th style="padding:6px; text-align:center;">Оқу күні</th>
            <th style="padding:6px; text-align:right;">Жинаған XP</th>
          </tr>
        </thead>
        <tbody>
          ${students.map((s, i) => `
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:6px;">${i + 1}</td>
              <td style="padding:6px; font-weight:bold;">${s.nickname}</td>
              <td style="padding:6px;">${s.current_book || '—'}</td>
              <td style="padding:6px;">${s.stage_name || 'Бастау қақпасы'}</td>
              <td style="padding:6px; text-align:center;">${s.reading_days}</td>
              <td style="padding:6px; text-align:right; font-weight:bold; color:#1e40af;">+${s.xp} XP</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Қол қою блогы -->
      <div style="display:flex; justify-content:space-between; margin-top:24px; padding-top:14px; border-top:1px solid #cbd5e1; font-size:12px;">
        <div>
          <div>Сынып жетекшісі: ___________________ (Сәуле Маратқызы)</div>
          <div style="margin-top:6px;">Бағдарлама авторы: Құлахметова Аягөз (11-сынып оқушысы)</div>
        </div>
        <div style="text-align:right;">
          <div>Ғылыми жетекшісі: Аскарова А.К.</div>
          <div style="margin-top:6px;">Ғылыми кеңесшісі: Құлмырзаев Н.С.</div>
        </div>
      </div>
    </div>

    <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:10px;">
      <button type="button" class="btn btn-primary" onclick="window.print()">
        🖨️ Ресми түрде басып шығару (Print)
      </button>
    </div>
  `;

  openModal({
    title: '📑 Сыныптың ресми мониторинг есебі',
    bodyHtml: modalHtml
  });
}

// -------------------------------------------------------------
// 3. ОҚУШЫНЫҢ ТОЛЫҚ ОҚУ ПОРТФОЛИОСЫ МОДАЛІ
// -------------------------------------------------------------
async function openStudentPortfolioModal(studentId) {
  try {
    const data = await api.teacherStudentPortfolio(studentId);
    const { student, metrics, tree_stage, shelf = [], comprehension_attempts = [], comprehension_analyses = [], recent_logs = [], feedbacks = [] } = data;

    const modalHtml = `
      <div id="student-portfolio-printable" style="font-family:inherit;">
        <!-- Оқушы төлқұжаты -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; border-bottom:2px solid var(--border-color); padding-bottom:14px; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:52px; height:52px; border-radius:50%; background:#e0f2fe; display:flex; align-items:center; justify-content:center; font-size:30px;">
              ${student.avatar === 'owl' ? '🦉' : student.avatar === 'fox' ? '🦊' : student.avatar === 'bear' ? '🐻' : '🐱'}
            </div>
            <div>
              <h3 style="font-size:20px; font-weight:800; color:var(--text-main); margin:0;">${student.nickname}</h3>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                Сынып: <strong>${student.class_name || 'Сынып'}</strong> | Шақыру коды: <strong>${student.invite_code || ''}</strong>
              </div>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="badge" style="background:#ecfdf5; color:#065f46; font-size:13px; font-weight:800; padding:4px 10px;">
              ${tree_stage.icon || '🌱'} ${tree_stage.name} (${tree_stage.stage}-саты)
            </span>
            <div style="font-size:14px; font-weight:800; color:var(--primary-green); margin-top:4px;">
              +${metrics.xp} XP жиналды
            </div>
          </div>
        </div>

        <!-- КІТАП АҒАШЫНЫҢ ДАМУЫ -->
        <div style="background:linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border:1px solid #86efac; border-radius:8px; padding:14px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="font-weight:800; font-size:13px; color:#166534;">
              🌳 «Кітап ағашының» өсу көрсеткіші: ${tree_stage.name}
            </div>
            <div style="font-weight:800; font-size:12px; color:#15803d;">
              ${tree_stage.progress_percent}% даму
            </div>
          </div>
          <div class="progress-bar-wrap" style="height:8px; margin:0 0 6px 0;">
            <div class="progress-bar-fill" style="width:${tree_stage.progress_percent}%; background:#10b981;"></div>
          </div>
          <div style="font-size:11px; color:#166534; display:flex; justify-content:space-between;">
            <span>Оқылған: ${tree_stage.total_pages} бет • ${tree_stage.finished_books} кітап</span>
            ${tree_stage.next_stage ? `<span>Келесі саты: <strong>${tree_stage.next_stage.name}</strong> (+${tree_stage.remaining?.xp || 0} XP)</span>` : '<span>Жоғары 7-сатыға жетті 🍎</span>'}
          </div>
        </div>

        <!-- НЕГІЗГІ ОҚУ КӨРСЕТКІШТЕРІ КАРТОЧКАЛАРЫ -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:16px;">
          <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:6px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted);">Оқылған бет</div>
            <div style="font-size:18px; font-weight:800; color:var(--primary-green); margin-top:2px;">${metrics.total_pages}</div>
          </div>
          <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:6px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted);">Оқу уақыты</div>
            <div style="font-size:18px; font-weight:800; color:#d97706; margin-top:2px;">${metrics.total_minutes} мин</div>
          </div>
          <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:6px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted);">Оқу күндері</div>
            <div style="font-size:18px; font-weight:800; color:#0284c7; margin-top:2px;">${metrics.reading_days} күн</div>
          </div>
          <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:6px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted);">Түсіну тесттері</div>
            <div style="font-size:18px; font-weight:800; color:#7c3aed; margin-top:2px;">${metrics.comprehension_avg !== null ? metrics.comprehension_avg + '%' : '—'}</div>
          </div>
        </div>

        <!-- ОҚЫЛҒАН КІТАПТАР СӨРЕСІ -->
        <div style="margin-bottom:16px;">
          <div style="font-weight:800; font-size:13px; margin-bottom:8px;">📚 Оқушының кітап сөресі:</div>
          <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
            ${shelf.length ? shelf.map(b => `
              <div style="background:var(--bg-soft); border:1px solid var(--border-color); border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:700; font-size:13px;">${b.title} <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(${b.author})</span></div>
                  <div style="font-size:11px; color:var(--text-muted);">${b.current_page || 0} / ${b.total_pages} бет оқылды ${b.goal_text ? `• Мақсат: ${b.goal_text}` : ''}</div>
                </div>
                <div style="text-align:right;">
                  <span class="badge" style="background:${b.status === 'finished' ? '#dcfce7; color:#15803d;' : '#e0f2fe; color:#0369a1;'}; font-size:11px;">
                    ${b.status === 'finished' ? 'Аяқталды ✓' : 'Оқу үстінде'} (${b.percent || 0}%)
                  </span>
                </div>
              </div>
            `).join('') : '<div style="color:var(--text-muted); font-size:12px;">Әзірге кітап тіркелмеген.</div>'}
          </div>
        </div>

        <!-- МӘТІНДІ ТҮСІНУ ТЕСТТЕРІ -->
        ${comprehension_attempts && comprehension_attempts.length ? `
          <div style="margin-bottom:16px;">
            <div style="font-weight:800; font-size:13px; margin-bottom:8px;">🧠 Мазмұндық тест нәтижелері:</div>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:130px; overflow-y:auto;">
              ${comprehension_attempts.map(a => `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <span style="font-weight:700; font-size:12px;">${a.book_title}</span>
                    <span style="font-size:11px; color:var(--text-muted); margin-left:6px;">(${a.created_at ? a.created_at.slice(0, 10) : ''})</span>
                  </div>
                  <div>
                    <span style="font-weight:800; color:${a.passed ? '#059669' : '#dc2626'}; font-size:13px;">
                      ${a.score} / ${a.total_questions || a.total || 0} (${a.percent}%) ${a.passed ? '✓ Өтті' : '✗ Қайталау'}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- ШЫҒАРМАНЫ ТАЛДАУ ЖАЗБАЛАРЫ (ЭССЕ, АННОТАЦИЯ, КЕЙІПКЕР) -->
        ${comprehension_analyses && comprehension_analyses.length ? `
          <div style="margin-bottom:16px;">
            <div style="font-weight:800; font-size:13px; margin-bottom:8px;">✍️ Кітапты талдау жұмыстары (${comprehension_analyses.length}):</div>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:140px; overflow-y:auto;">
              ${comprehension_analyses.map(an => `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; font-size:12px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-weight:700; color:#0f172a;">${an.book_title} — ${an.title || 'Талдау'}</span>
                    <span class="badge" style="font-size:10px; background:${an.status === 'accepted' ? '#dcfce7; color:#15803d;' : an.status === 'returned' ? '#fee2e2; color:#b91c1c;' : '#fef3c7; color:#b45309;'}">
                      ${an.status === 'accepted' ? 'Қабылданды ✓' : an.status === 'returned' ? 'Қайтарылды' : 'Тексерілуде ⏳'}
                    </span>
                  </div>
                  <div style="font-style:italic; color:#475569; max-height:48px; overflow:hidden; text-overflow:ellipsis;">
                    «${(an.text || an.content || '').slice(0, 160)}${(an.text || an.content || '').length > 160 ? '...' : ''}»
                  </div>
                  ${an.feedback ? `<div style="font-size:11px; color:#15803d; margin-top:4px;"><strong>Мұғалім:</strong> ${an.feedback}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- СОҢҒЫ КҮНДЕЛІК ЖАЗБАЛАРЫ -->
        ${recent_logs && recent_logs.filter(l => l.note).length ? `
          <div style="margin-bottom:16px;">
            <div style="font-weight:800; font-size:13px; margin-bottom:8px;">📝 Оқушының күнделік жазбалары:</div>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:120px; overflow-y:auto;">
              ${recent_logs.filter(l => l.note).slice(0, 4).map(l => `
                <div style="background:var(--bg-soft); border-left:3px solid var(--accent-gold); padding:6px 10px; border-radius:4px; font-size:12px;">
                  <div style="font-weight:700; color:var(--text-main);">${l.book_title} (${l.log_date}):</div>
                  <div style="font-style:italic; color:var(--text-muted); margin-top:2px;">«${l.note}»</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- МҰҒАЛІМ КЕРІ БАЙЛАНЫСЫН ЖІБЕРУ БЛОГЫ -->
        <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:14px; margin-bottom:16px;">
          <div style="font-weight:800; font-size:13px; color:#0369a1; margin-bottom:6px;">
            💬 Оқушыға жеке педагогикалық кері байланыс беру:
          </div>
          <textarea class="form-textarea" id="inp-portfolio-feedback-msg" rows="2" placeholder="Оқушының кітап оқуын ынталандыратын жеке пікір жазыңыз..."></textarea>
          <div style="margin-top:8px; display:flex; justify-content:flex-end;">
            <button class="btn btn-primary btn-sm" id="btn-send-portfolio-feedback">
              💬 Кері байланыс жіберу
            </button>
          </div>

          <!-- Бұрынғы кері байланыстар тарихы -->
          ${feedbacks && feedbacks.length ? `
            <div style="margin-top:12px; border-top:1px solid #e0f2fe; padding-top:8px;">
              <div style="font-size:11px; font-weight:700; color:#0369a1; margin-bottom:4px;">Бұрын берілген пікірлер:</div>
              <div style="display:flex; flex-direction:column; gap:4px; max-height:90px; overflow-y:auto;">
                ${feedbacks.map(f => `
                  <div style="font-size:11px; background:#fff; padding:4px 8px; border-radius:4px; border:1px solid #e0f2fe;">
                    <span style="color:#64748b;">${f.created_at ? f.created_at.slice(0, 10) : ''}:</span>
                    <span style="color:#0f172a;">${f.message}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="window.print()">
          🖨️ Портфолионы басып шығару (Print)
        </button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-close-portfolio-modal">
          Жабу
        </button>
      </div>
    `;

    openModal({
      title: `🎓 Оқушының оқу портфолиосы: ${student.nickname}`,
      bodyHtml: modalHtml
    });

    setTimeout(() => {
      const sendFbBtn = document.getElementById('btn-send-portfolio-feedback');
      if (sendFbBtn) {
        sendFbBtn.onclick = async () => {
          const msg = document.getElementById('inp-portfolio-feedback-msg')?.value.trim();
          if (!msg) {
            showToast('Кері байланыс мәтінін енгізіңіз', 'error');
            return;
          }
          try {
            await api.teacherSendFeedback(student.id, { message: msg });
            showToast('Кері байланыс оқушыға сәтті жіберілді!', 'success');
            document.getElementById('inp-portfolio-feedback-msg').value = '';
          } catch (err) {
            showToast(err.message, 'error');
          }
        };
      }
      const closeBtn = document.getElementById('btn-close-portfolio-modal');
      if (closeBtn) {
        closeBtn.onclick = () => {
          document.querySelector('.modal-overlay')?.remove();
        };
      }
    }, 100);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 4. ОҚУШЫЛАРДЫ ЖАППАЙ ИМПОРТТАУ МОДАЛІ
// -------------------------------------------------------------
function openImportStudentsModal(cls) {
  openModal({
    title: '📋 Оқушылар тізімін жаппай импорттау (Excel / Word / Мәтін)',
    bodyHtml: `
      <div style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
        Excel, Word немесе қарапайым тізімнен оқушылардың аты-жөнін көшіріп қойыңыз. Әр оқушыға жүйе автоматты түрде жеке 4 цифрлы PIN-код тағайындайды.
      </div>
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px; font-size:12px; margin-bottom:12px;">
        <div style="font-weight:700; color:#1e40af; margin-bottom:4px;">💡 Мысал форматы:</div>
        <code>1. Ахметов Әли<br>2. Серік Дина<br>3. Омаров Бауыржан<br>4. Қасымова Әмина<br>5. Дәулет Ерасыл</code>
      </div>
      <div class="form-group">
        <label class="form-label" style="font-weight:700;">Оқушылар тізімі (әр жолға бір оқушы):</label>
        <textarea class="form-textarea" id="inp-import-students-text" rows="8" placeholder="1. Ахметов Әли&#10;2. Серік Дина&#10;3. Омаров Бауыржан..."></textarea>
      </div>
      <div id="import-results-container"></div>
    `,
    saveText: '📥 Оқушыларды қосу',
    onSave: async (modalEl) => {
      const text = modalEl.querySelector('#inp-import-students-text').value.trim();
      if (!text) {
        showToast('Оқушылар тізімін енгізіңіз', 'error');
        return false;
      }
      try {
        const res = await api.teacherImportStudents(cls.id, { text });
        if (res && res.imported && res.imported.length) {
          showToast(`Сәтті қосылды: ${res.count} оқушы!`, 'success');

          modalEl.querySelector('#import-results-container').innerHTML = `
            <div style="background:#ecfdf5; border:1px solid #86efac; border-radius:6px; padding:12px; margin-top:14px;">
              <div style="font-weight:800; color:#166534; margin-bottom:6px;">
                🎉 ${res.count} оқушы сәтті тіркелді! Оқушылардың кіру билеттері:
              </div>
              <div style="font-size:12px; color:#166534; margin-bottom:10px;">
                Сынып шақыру коды: <strong>${cls.invite_code}</strong>
              </div>
              <div style="max-height:180px; overflow-y:auto; background:#fff; border:1px solid #bbf7d0; border-radius:4px; padding:8px;">
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                  <thead>
                    <tr style="border-bottom:1px solid #cbd5e1; text-align:left;">
                      <th style="padding:4px;">Оқушы аты</th>
                      <th style="padding:4px;">Сынып коды</th>
                      <th style="padding:4px;">PIN-код</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${res.imported.map(s => `
                      <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:4px; font-weight:700;">${s.nickname}</td>
                        <td style="padding:4px;">${cls.invite_code}</td>
                        <td style="padding:4px; font-family:monospace; font-weight:800; color:#0369a1;">${s.pin}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              <div style="margin-top:10px; display:flex; gap:8px; justify-content:flex-end;">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-import-creds">📋 Мәтін ретінде көшіру</button>
                <button type="button" class="btn btn-primary btn-sm" onclick="window.print()">🖨️ Басып шығару</button>
              </div>
            </div>
          `;

          setTimeout(() => {
            const copyBtn = modalEl.querySelector('#btn-copy-import-creds');
            if (copyBtn) {
              copyBtn.onclick = () => {
                const creds = res.imported.map(s => `${s.nickname} | Сынып коды: ${cls.invite_code} | PIN: ${s.pin}`).join('\n');
                navigator.clipboard.writeText(`📚 Kitap Tracker (${cls.name}) оқушыларының кіру билеттері:\n\n${creds}`);
                showToast('Билеттер буферге көшірілді!', 'success');
              };
            }
          }, 100);

          return false;
        }
      } catch (err) {
        showToast(err.message, 'error');
        return false;
      }
    }
  });
}

// -------------------------------------------------------------
// 5. ОҚУШЫНЫ ЖЕКЕ ТІРКЕУ МОДАЛІ
// -------------------------------------------------------------
function openAddStudentModal(cls) {
  openModal({
    title: '➕ Жаңа оқушыны тіркеу',
    bodyHtml: `
      <div class="form-group">
        <label class="form-label" style="font-weight:700;">Оқушының бүркеншік аты (аты-жөні):</label>
        <input type="text" class="form-input" id="inp-add-s-name" placeholder="Мысалы: Ахметов Әли" required>
      </div>
      <div class="form-group">
        <label class="form-label">Аватар таңдаңыз:</label>
        <select class="form-select" id="inp-add-s-avatar">
          <option value="fox">🦊 Түлкі</option>
          <option value="owl">🦉 Үкі</option>
          <option value="bear">🐻 Аю</option>
          <option value="cat">🐱 Мысық</option>
          <option value="wolf">🐺 Қасқыр</option>
          <option value="lion">🦁 Арыстан</option>
          <option value="eagle">🦅 Бүркіт</option>
          <option value="hare">🐰 Қоян</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Жеке PIN-код (4 цифр, бос қалса автоматты жасалады):</label>
        <input type="password" maxlength="4" class="form-input" id="inp-add-s-pin" placeholder="Мысалы: 1234">
      </div>
      <div style="font-size:12px; color:var(--text-muted);">
        Сынып шақыру коды: <strong>${cls.invite_code}</strong>. Оқушы кіру кезінде осы кодты, бүркеншік атын және PIN-кодты пайдаланады.
      </div>
    `,
    saveText: 'Тіркеу',
    onSave: async (modalEl) => {
      const nickname = modalEl.querySelector('#inp-add-s-name').value.trim();
      const avatar = modalEl.querySelector('#inp-add-s-avatar').value;
      const pin = modalEl.querySelector('#inp-add-s-pin').value.trim();
      if (!nickname) {
        showToast('Оқушы атын енгізіңіз', 'error');
        return false;
      }
      try {
        const res = await api.teacherAddStudent(cls.id, { nickname, avatar, pin: pin || undefined });
        alert(`Оқушы сәтті тіркелді!\n\nОқушы: ${res.student.nickname}\nСынып коды: ${cls.invite_code}\nPIN: ${res.student.pin}\n\nОсы деректерді оқушыға беріңіз.`);
        location.reload();
        return true;
      } catch (err) {
        showToast(err.message, 'error');
        return false;
      }
    }
  });
}

// -------------------------------------------------------------
// 6. ОҚУ БЕЛСЕНДІЛІГІ ТӨМЕНДЕГЕН (AT-RISK) ОҚУШЫЛАР МОДАЛІ
// -------------------------------------------------------------
async function openAtRiskModal(cls) {
  try {
    const data = await api.teacherAtRisk(cls.id);
    const { at_risk_students = [], at_risk_count = 0 } = data;

    const modalHtml = `
      <div style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
        Оқу белсенділігі төмендеген немесе мақсатын орындамай жүрген оқушылар анықталды. Оларға шабыттандырушы кері байланыс жазып, қолдау білдіріңіз.
      </div>

      ${at_risk_students.length ? `
        <div style="display:flex; flex-direction:column; gap:10px; max-height:400px; overflow-y:auto;">
          ${at_risk_students.map(s => `
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:800; font-size:14px; color:#92400e;">
                  ${s.avatar === 'owl' ? '🦉' : '🦊'} ${s.nickname}
                </div>
                <button class="btn btn-primary btn-sm btn-portfolio-from-risk" data-sid="${s.id}">
                  🎓 Портфолио
                </button>
              </div>

              <div style="margin:8px 0; display:flex; flex-wrap:wrap; gap:6px;">
                ${s.reasons_kk.map(r => `
                  <span style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px;">
                    ⚠️ ${r}
                  </span>
                `).join('')}
              </div>

              <div style="font-size:12px; color:#78350f; background:#fff; padding:6px 10px; border-radius:4px; border:1px dashed #fde68a;">
                💡 <strong>Педагогикалық кеңес:</strong> ${s.recommendation}
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="text-align:center; padding:20px; color:var(--primary-green); font-weight:700;">
          🎉 Керемет! Барлық оқушылар белсенді түрде кітап оқып келеді.
        </div>
      `}
    `;

    openModal({
      title: `⚠️ Қолдауды қажет ететін оқушылар (${at_risk_count})`,
      bodyHtml: modalHtml,
      saveText: 'Жабу',
      onSave: async () => true
    });

    setTimeout(() => {
      document.querySelectorAll('.btn-portfolio-from-risk').forEach(btn => {
        btn.onclick = () => {
          const sid = Number(btn.getAttribute('data-sid'));
          document.querySelector('.modal-overlay')?.remove();
          openStudentPortfolioModal(sid);
        };
      });
    }, 100);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 7. ОҚУШЫҒА ЖЕКЕ КЕРІ БАЙЛАНЫС БЕРУ МОДАЛІ
// -------------------------------------------------------------
function openTeacherFeedbackModal(studentId, studentName) {
  openModal({
    title: `💬 Оқушыға жеке кері байланыс — ${studentName}`,
    bodyHtml: `
      <div style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
        Оқушының кітап оқу белсенділігін ынталандыратын педагогикалық пікір немесе ұсыныс жазыңыз. Оқушы мұны өз кабинетінде бірден көреді.
      </div>
      <div class="form-group">
        <label class="form-label" style="font-weight:700;">Кері байланыс мәтіні:</label>
        <textarea class="form-textarea" id="inp-teacher-feedback-text" rows="4" placeholder="Мысалы: Жарайсың, ${studentName}! Осы аптадағы оқу қарқының өте жақсы. Келесі тарауды да оқып, ойын тапсырмаларын орындап көр."></textarea>
      </div>
    `,
    saveText: 'Жіберу',
    onSave: async (modalEl) => {
      const message = modalEl.querySelector('#inp-teacher-feedback-text').value.trim();
      if (!message) {
        showToast('Пікір мәтінін енгізіңіз', 'error');
        return false;
      }
      try {
        await api.teacherSendFeedback(studentId, { message });
        showToast(`Кері байланыс ${studentName} оқушысына сәтті жіберілді!`, 'success');
        return true;
      } catch (err) {
        showToast(err.message, 'error');
        return false;
      }
    }
  });
}

// -------------------------------------------------------------
// 8. ЖАҢА СЫНЫП ҚҰРУ МОДАЛІ
// -------------------------------------------------------------
function openCreateClassModal() {
  openModal({
    title: '🏫 Жаңа сынып құру',
    bodyHtml: `
      <div class="form-group">
        <label class="form-label">Сынып атауы</label>
        <input type="text" class="form-input" id="inp-create-class-name" placeholder="Мысалы: 6Б сынып" required>
      </div>
      <div class="form-group">
        <label class="form-label">Деңгейі</label>
        <select class="form-select" id="inp-create-class-level">
          <option value="junior">Бастауыш / Орта буын (junior)</option>
          <option value="senior" selected>Жоғары сынып (senior)</option>
        </select>
      </div>
    `,
    saveText: 'Құру',
    onSave: async (modalEl) => {
      const name = modalEl.querySelector('#inp-create-class-name').value.trim();
      const level = modalEl.querySelector('#inp-create-class-level').value;
      if (!name) return false;
      try {
        const res = await api.teacherCreateClass({ name, level });
        showToast('Жаңа сынып сәтті құрылды!', 'success');
        window.__activeTeacherClassId = res.id;
        location.reload();
        return true;
      } catch (err) {
        showToast(err.message, 'error');
        return false;
      }
    }
  });
}

// -------------------------------------------------------------
// ӘКІМШІЛІК БАСҚАРУ ПАНЕЛІ (ADMIN DASHBOARD)
// -------------------------------------------------------------
function renderAdminTab(adminData, container) {
  const { counts = {}, stages = [], books = [] } = adminData || {};

  return `
    <div style="display:flex; flex-direction:column; gap:20px;">
      
      <!-- Жоғарғы Әкімшілік баннер -->
      <div class="card" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color:#fff; padding:22px 24px; border-radius:var(--radius-lg); border-bottom:5px solid #0f172a; box-shadow:0 10px 24px rgba(0,0,0,0.15); margin-bottom:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="font-size:11.5px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#94a3b8; margin-bottom:4px;">
              Kitap Tracker · Әкімшілік Басқару Панелі (Admin Center)
            </div>
            <h2 style="font-size:24px; font-weight:900; margin:0 0 6px 0; color:#fff; display:flex; align-items:center; gap:10px;">
              <span>⚙️</span> Платформаның Жүйелік Басқару Орталығы
            </h2>
            <p style="margin:0; font-size:13.5px; color:#cbd5e1; max-width:640px; line-height:1.5;">
              Платформа статистикасы, «Кітап ағашының» 7 даму сатысының параметрлері, кітапхана қоры мен сыныптардың орталықтандырылған мониторингі.
            </p>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-primary" id="btn-admin-add-book" style="background:#22c55e; border-color:#16a34a; font-weight:800; padding:9px 18px; font-size:12.5px;">
              ➕ Жаңа кітап қосу
            </button>
          </div>
        </div>
      </div>

      <!-- 1. ПЛАТФОРМА СТАТИСТИКАСЫ КАРТОЧКАЛАРЫ -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:14px;">
        <div class="card" style="margin-bottom:0; padding:16px; border-top:4px solid var(--primary-green); text-align:center; border-radius:var(--radius-md); box-shadow:0 4px 12px rgba(35,132,81,0.08);">
          <div style="font-size:28px;">🧑‍🎓</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Оқушылар</div>
          <div style="font-size:24px; font-weight:900; color:var(--primary-green);">${counts.students ?? 0} оқушы</div>
        </div>

        <div class="card" style="margin-bottom:0; padding:16px; border-top:4px solid #3b82f6; text-align:center; border-radius:var(--radius-md); box-shadow:0 4px 12px rgba(59,130,246,0.08);">
          <div style="font-size:28px;">👩‍🏫</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Мұғалімдер</div>
          <div style="font-size:24px; font-weight:900; color:#2563eb;">${counts.teachers ?? 0} педагог</div>
        </div>

        <div class="card" style="margin-bottom:0; padding:16px; border-top:4px solid var(--accent-gold); text-align:center; border-radius:var(--radius-md); box-shadow:0 4px 12px rgba(255,211,106,0.15);">
          <div style="font-size:28px;">🏫</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Сыныптар</div>
          <div style="font-size:24px; font-weight:900; color:#d97706;">${counts.classes ?? 0} сынып</div>
        </div>

        <div class="card" style="margin-bottom:0; padding:16px; border-top:4px solid #15803d; text-align:center; border-radius:var(--radius-md); box-shadow:0 4px 12px rgba(23,107,77,0.08);">
          <div style="font-size:28px;">📚</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Кітап қоры</div>
          <div style="font-size:24px; font-weight:900; color:#15803d;">${counts.books ?? books.length} кітап</div>
        </div>

        <div class="card" style="margin-bottom:0; padding:16px; border-top:4px solid #f97316; text-align:center; border-radius:var(--radius-md); box-shadow:0 4px 12px rgba(255,157,138,0.12);">
          <div style="font-size:28px;">📝</div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-top:4px;">Оқу жазбалары</div>
          <div style="font-size:24px; font-weight:900; color:#ea580c;">${counts.logs ?? 0} оқылым</div>
        </div>
      </div>

      <!-- 2. «КІТАП АҒАШЫНЫҢ» 7 ДАМУ САТЫСЫН БАПТАУ (TREE CONFIG) -->
      <div class="card" style="padding:22px; margin-bottom:0; border-radius:var(--radius-lg); border:1.5px solid var(--border-color); box-shadow:0 6px 18px rgba(38,55,70,0.06);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:18px; font-weight:900; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
              <span>🌳</span> «Кітап ағашының» 7 даму сатысын баптау
            </h3>
            <p style="font-size:12.5px; color:var(--text-muted); margin:4px 0 0 0;">
              Әр сатыға өту үшін оқушыдан талап етілетін ең төменгі XP, кітап және беттер санының шектері:
            </p>
          </div>
          <span style="font-size:12px; font-weight:800; color:#166534; background:#dcfce7; padding:4px 12px; border-radius:14px; border:1px solid #86efac;">
            ✓ 7 саты толық белсенді
          </span>
        </div>

        <div style="overflow-x:auto;">
          <table class="table" style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;">
                <th style="padding:10px;">Саты</th>
                <th style="padding:10px;">Атауы</th>
                <th style="padding:10px;">Сипаттамасы</th>
                <th style="padding:10px; text-align:center;">Мин. XP</th>
                <th style="padding:10px; text-align:center;">Мин. Кітап</th>
                <th style="padding:10px; text-align:center;">Мин. Бет</th>
                <th style="padding:10px; text-align:right;">Әрекет</th>
              </tr>
            </thead>
            <tbody>
              ${stages.map(s => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:10px; font-weight:800; color:#14532d;">${s.stage}-саты</td>
                  <td style="padding:10px; font-weight:800;">${s.name}</td>
                  <td style="padding:10px; color:#475569; max-width:240px;">${s.description || '—'}</td>
                  <td style="padding:10px; text-align:center;"><span style="font-weight:900; color:#16a34a;">${s.min_xp} XP</span></td>
                  <td style="padding:10px; text-align:center; font-weight:700;">${s.min_books || 0}</td>
                  <td style="padding:10px; text-align:center; font-weight:700;">${s.min_pages || 0}</td>
                  <td style="padding:10px; text-align:right;">
                    <button class="btn btn-secondary btn-sm btn-edit-tree-stage" data-stage="${s.stage}" style="font-weight:700; padding:4px 10px;">
                      ✏️ Өңдеу
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 3. КІТАПХАНА ҚОРЫН БАСҚАРУ -->
      <div class="card" style="padding:22px; margin-bottom:0; border-radius:var(--radius-lg); border:1.5px solid var(--border-color); box-shadow:0 6px 18px rgba(38,55,70,0.06);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:18px; font-weight:900; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
              <span>📚</span> Мектеп кітап қоры (${books.length} кітап)
            </h3>
            <p style="font-size:12.5px; color:var(--text-muted); margin:4px 0 0 0;">
              Бағдарламалық және қосымша көркем әдебиет кітаптарының каталогы
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-admin-add-book-2" style="font-weight:800; padding:7px 16px; font-size:12px;">
            ➕ Кітап қосу
          </button>
        </div>

        <div style="overflow-x:auto; max-height:400px; overflow-y:auto;">
          <table class="table" style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;">
                <th style="padding:10px;">Кітап</th>
                <th style="padding:10px;">Автор</th>
                <th style="padding:10px;">Жанр</th>
                <th style="padding:10px; text-align:center;">Сыныптар</th>
                <th style="padding:10px; text-align:center;">Бет саны</th>
                <th style="padding:10px; text-align:right;">Әрекет</th>
              </tr>
            </thead>
            <tbody>
              ${books.map(b => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:10px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                    <span>${b.cover_emoji || '📖'}</span> <span>${b.title}</span>
                  </td>
                  <td style="padding:10px; color:#475569;">${b.author}</td>
                  <td style="padding:10px;"><span class="badge" style="background:#f1f5f9; color:#475569; font-size:11px;">${b.genre || 'Әдебиет'}</span></td>
                  <td style="padding:10px; text-align:center; font-weight:700;">${b.grade_min}-${b.grade_max} сынып</td>
                  <td style="padding:10px; text-align:center; font-weight:700;">${b.total_pages} бет</td>
                  <td style="padding:10px; text-align:right;">
                    <button class="btn btn-secondary btn-sm btn-admin-delete-book" data-id="${b.id}" style="color:#dc2626; padding:4px 8px; font-size:11px;">
                      🗑️ Өшіру
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

// «Кітап ағашы» сатысын өңдеу модалі
function openEditTreeStageModal(stageObj, onSuccess) {
  openModal({
    title: `🌳 ${stageObj.stage}-сатыны баптау — «${stageObj.name}»`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label class="form-label">Саты атауы:</label>
            <input type="text" class="form-input" id="inp-stage-name" value="${stageObj.name || ''}" required>
          </div>
          <div>
            <label class="form-label">Тақырыбы:</label>
            <input type="text" class="form-input" id="inp-stage-title" value="${stageObj.title || ''}" required>
          </div>
        </div>

        <div>
          <label class="form-label">Сипаттамасы:</label>
          <textarea class="form-textarea" id="inp-stage-desc" rows="2" required>${stageObj.description || ''}</textarea>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div>
            <label class="form-label">Мин. XP:</label>
            <input type="number" class="form-input" id="inp-stage-xp" min="0" value="${stageObj.min_xp ?? 0}" required>
          </div>
          <div>
            <label class="form-label">Мин. кітап:</label>
            <input type="number" class="form-input" id="inp-stage-books" min="0" value="${stageObj.min_books ?? 0}">
          </div>
          <div>
            <label class="form-label">Мин. бет:</label>
            <input type="number" class="form-input" id="inp-stage-pages" min="0" value="${stageObj.min_pages ?? 0}">
          </div>
        </div>
      </div>
    `,
    saveText: 'Сақтау',
    onSave: async (modalEl) => {
      const name = modalEl.querySelector('#inp-stage-name').value.trim();
      const title = modalEl.querySelector('#inp-stage-title').value.trim();
      const description = modalEl.querySelector('#inp-stage-desc').value.trim();
      const min_xp = Number(modalEl.querySelector('#inp-stage-xp').value);
      const min_books = Number(modalEl.querySelector('#inp-stage-books').value);
      const min_pages = Number(modalEl.querySelector('#inp-stage-pages').value);

      try {
        await api.updateTreeStageConfig({
          stage: stageObj.stage,
          name,
          title,
          description,
          min_xp,
          min_books,
          min_pages
        });
        showToast('Саты баптаулары сәтті жаңартылды!', 'success');
        if (onSuccess) onSuccess();
        return true;
      } catch (err) {
        showToast('Қате: ' + err.message, 'error');
        return false;
      }
    }
  });
}

// Әкімшілік кітап қосу модалі
function openAdminAddBookModal(onSuccess) {
  openModal({
    title: '📚 Кітапхана қорына жаңа кітап қосу',
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label class="form-label">Кітап атауы:</label>
            <input type="text" class="form-input" id="inp-bk-title" placeholder="Мысалы: Абай жолы" required>
          </div>
          <div>
            <label class="form-label">Авторы:</label>
            <input type="text" class="form-input" id="inp-bk-author" placeholder="Мысалы: Мұхтар Әуезов" required>
          </div>
        </div>

        <div>
          <label class="form-label">Қысқаша мазмұны / аннотациясы:</label>
          <textarea class="form-textarea" id="inp-bk-desc" rows="2" placeholder="Кітап туралы қысқаша мәлімет..."></textarea>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div>
            <label class="form-label">Жанры:</label>
            <input type="text" class="form-input" id="inp-bk-genre" placeholder="Роман, повесть т.б." value="Көркем әдебиет">
          </div>
          <div>
            <label class="form-label">Тілі:</label>
            <select class="form-select" id="inp-bk-lang">
              <option value="kk" selected>Қазақ тілі</option>
              <option value="ru">Орыс тілі</option>
              <option value="en">Ағылшын тілі</option>
            </select>
          </div>
          <div>
            <label class="form-label">Бет саны:</label>
            <input type="number" class="form-input" id="inp-bk-pages" min="1" value="120">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label class="form-label">Бастапқы сынып:</label>
            <input type="number" class="form-input" id="inp-bk-gmin" min="1" max="11" value="5">
          </div>
          <div>
            <label class="form-label">Жоғарғы сынып:</label>
            <input type="number" class="form-input" id="inp-bk-gmax" min="1" max="11" value="11">
          </div>
        </div>
      </div>
    `,
    saveText: 'Кітапты қосу',
    onSave: async (modalEl) => {
      const title = modalEl.querySelector('#inp-bk-title').value.trim();
      const author = modalEl.querySelector('#inp-bk-author').value.trim();
      const description = modalEl.querySelector('#inp-bk-desc').value.trim();
      const genre = modalEl.querySelector('#inp-bk-genre').value.trim();
      const language = modalEl.querySelector('#inp-bk-lang').value;
      const totalPages = Number(modalEl.querySelector('#inp-bk-pages').value);
      const gradeMin = Number(modalEl.querySelector('#inp-bk-gmin').value);
      const gradeMax = Number(modalEl.querySelector('#inp-bk-gmax').value);

      if (!title || !author) {
        showToast('Кітап атауы мен авторын жазыңыз', 'error');
        return false;
      }

      try {
        await api.adminAddBook({
          title, author, description, genre, language, totalPages, gradeMin, gradeMax
        });
        showToast('Жаңа кітап сәтті қосылды!', 'success');
        if (onSuccess) onSuccess();
        return true;
      } catch (err) {
        showToast('Қате: ' + err.message, 'error');
        return false;
      }
    }
  });
}

