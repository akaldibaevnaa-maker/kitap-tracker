// Алғашқы кіру және Авторизация көрінісі
import { api } from '../api.js';
import { t } from '../i18n.js';
import { showToast, AVATAR_MAP } from '../ui.js';

export function renderAuthView(container, onAuthSuccess) {
  let isRegister = false;
  let isTeacherMode = false;

  function render() {
    container.innerHTML = `
      <div style="max-width: 480px; margin: 20px auto;">
        <!-- Жоба төлқұжаты / Авторлық құқық -->
        <div class="project-attribution-card" style="margin-bottom: 16px;">
          <div class="project-badge">
            <span>🇰🇿</span> <strong>Ғылыми-тәжірибелік жоба (2026 жыл)</strong>
          </div>
          <div class="project-details" style="font-size: 13px; line-height: 1.6; margin-top: 8px;">
            <div>🏫 <strong>Мектеп:</strong> №290 орта мектеп</div>
            <div>✍️ <strong>Бағдарлама авторы:</strong> Құлахметова Аягөз (11-сынып оқушысы)</div>
            <div>👩‍🏫 <strong>Жетекшісі:</strong> Аскарова Айнур Калдыбаевна</div>
            <div>🎓 <strong>Ғылыми кеңесші:</strong> Құлмырзаев Нұрлан Серікұлы <span style="font-size:11px; color:var(--text-muted);">(Қорқыт ата атындағы Қызылорда университеті, Жасанды интеллект институты директоры)</span></div>
          </div>
        </div>

        <div class="card">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 42px; margin-bottom: 8px;">🚀</div>
            <h2 style="font-size: 22px; font-weight: 800; color: var(--primary-green);">${t('auth_welcome')}</h2>
            <p style="font-size: 13px; color: var(--text-muted);">${t('tagline')}</p>
          </div>

          <!-- Жылдам кіру (бір рет басу арқылы кіру) -->
          <div style="background: var(--bg-soft); border: 1px dashed var(--accent-gold); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 700; color: var(--accent-gold-dark); margin-bottom: 10px; text-transform: uppercase;">
              ⭐ Жүйеге жылдам кіру:
            </div>
            <div style="display:flex; gap:10px; flex-direction:column;">
              <button class="btn btn-primary btn-block" id="btn-quick-demo-student">
                <span>🎒</span> ${t('auth_quick_demo_student')}
              </button>
              <button class="btn btn-secondary btn-block" id="btn-quick-demo-teacher">
                <span>👩‍🏫</span> ${t('auth_quick_demo_teacher')}
              </button>
            </div>
          </div>

          <!-- Рөл ауыстырғыш -->
          <div style="display:flex; background:var(--bg-soft); border-radius:var(--radius-sm); padding:4px; margin-bottom:20px;">
            <button class="btn btn-sm ${!isTeacherMode ? 'btn-primary' : 'btn-secondary'}" style="flex:1;" id="tab-student">
              ${t('auth_student_login')}
            </button>
            <button class="btn btn-sm ${isTeacherMode ? 'btn-primary' : 'btn-secondary'}" style="flex:1;" id="tab-teacher">
              ${t('auth_teacher_login')}
            </button>
          </div>

          <!-- Форма -->
          <form id="auth-form">
            ${isTeacherMode ? renderTeacherForm() : (isRegister ? renderStudentRegisterForm() : renderStudentLoginForm())}
          </form>

          <div style="text-align:center; margin-top:16px;">
            ${!isTeacherMode ? `
              <button type="button" class="btn btn-secondary btn-sm" id="btn-switch-auth-mode">
                ${isRegister ? 'Бұрын тіркелгенмін (Кіру)' : 'Жаңа оқушымын (3 қадаммен тіркелу)'}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderStudentLoginForm() {
    return `
      <div class="form-group">
        <label class="form-label">${t('auth_class_code')}</label>
        <input type="text" class="form-input" id="inp-class-code" value="DEMO25" required placeholder="Мысалы: DEMO25">
      </div>
      <div class="form-group">
        <label class="form-label">${t('auth_nickname')}</label>
        <input type="text" class="form-input" id="inp-nickname" value="Құлахметова Аягөз" required placeholder="Мысалы: Құлахметова Аягөз">
      </div>
      <div class="form-group">
        <label class="form-label">${t('auth_pin')}</label>
        <input type="password" maxlength="4" class="form-input" id="inp-pin" value="1234" required placeholder="4 цифр (мысалы: 1234)">
        <div class="form-help">Артық жеке деректер (email, телефон) сұралмайды. Құпиялық қорғалған.</div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">${t('auth_enter_btn')}</button>
    `;
  }

  function renderStudentRegisterForm() {
    return `
      <div style="border-left: 3px solid var(--primary-green); padding-left: 10px; margin-bottom: 14px;">
        <div style="font-weight: 700; font-size: 14px;">${t('auth_step1_title')}</div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('auth_nickname')}</label>
        <input type="text" class="form-input" id="inp-reg-nickname" required placeholder="Өзіңе бүркеншік ат таңда">
      </div>
      <div class="form-group">
        <label class="form-label">Аватар</label>
        <select class="form-select" id="inp-reg-avatar">
          ${Object.entries(AVATAR_MAP).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
      </div>

      <div style="border-left: 3px solid var(--accent-gold); padding-left: 10px; margin: 16px 0 14px 0;">
        <div style="font-weight: 700; font-size: 14px;">${t('auth_step2_title')}</div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('auth_class_code')}</label>
        <input type="text" class="form-input" id="inp-reg-class-code" value="DEMO25" required placeholder="DEMO25 немесе мұғалім берген код">
      </div>
      <div class="form-group">
        <label class="form-label">${t('auth_pin')} (қайта кіру үшін)</label>
        <input type="password" maxlength="4" class="form-input" id="inp-reg-pin" value="1234" required placeholder="4 цифр ойлап тап">
      </div>

      <button type="submit" class="btn btn-primary btn-block">${t('auth_start_journey')}</button>
    `;
  }

  function renderTeacherForm() {
    return `
      <div class="form-group">
        <label class="form-label">Логин (мұғалім үшін)</label>
        <input type="text" class="form-input" id="inp-t-login" value="demo.mugalim" required>
      </div>
      <div class="form-group">
        <label class="form-label">Құпиясөз</label>
        <input type="password" class="form-input" id="inp-t-pass" value="demo1234" required>
        <div class="form-help">Мұғалім логині: demo.mugalim / құпиясөзі: demo1234</div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">${t('auth_enter_btn')}</button>
    `;
  }

  function bindEvents() {
    // Демо түймелері
    container.querySelector('#btn-quick-demo-student').onclick = async () => {
      try {
        const res = await api.loginDemo('student');
        if (res && res.user) {
          showToast(`Қош келдің, ${res.user.nickname}!`, 'success');
          onAuthSuccess(res.user);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

    container.querySelector('#btn-quick-demo-teacher').onclick = async () => {
      try {
        const res = await api.loginDemo('teacher');
        if (res && res.user) {
          showToast(`Қош келдіңіз, ${res.user.nickname}!`, 'success');
          onAuthSuccess(res.user);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

    // Қойындыларды ауыстыру
    container.querySelector('#tab-student').onclick = () => {
      isTeacherMode = false;
      render();
    };
    container.querySelector('#tab-teacher').onclick = () => {
      isTeacherMode = true;
      render();
    };

    const switchBtn = container.querySelector('#btn-switch-auth-mode');
    if (switchBtn) {
      switchBtn.onclick = () => {
        isRegister = !isRegister;
        render();
      };
    }

    // Форма жіберу
    const form = container.querySelector('#auth-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        let res;
        if (isTeacherMode) {
          const login = container.querySelector('#inp-t-login').value;
          const password = container.querySelector('#inp-t-pass').value;
          res = await api.teacherLogin({ login, password });
        } else if (isRegister) {
          const nickname = container.querySelector('#inp-reg-nickname').value;
          const avatar = container.querySelector('#inp-reg-avatar').value;
          const classCode = container.querySelector('#inp-reg-class-code').value;
          const pin = container.querySelector('#inp-reg-pin').value;
          res = await api.studentRegister({ nickname, avatar, classCode, pin, demo: classCode.toUpperCase() === 'DEMO25' });
        } else {
          const classCode = container.querySelector('#inp-class-code').value;
          const nickname = container.querySelector('#inp-nickname').value;
          const pin = container.querySelector('#inp-pin').value;
          res = await api.studentLogin({ classCode, nickname, pin });
        }
        if (res && res.user) {
          showToast(`Сәтті кірдіңіз: ${res.user.nickname}`, 'success');
          onAuthSuccess(res.user);
        } else {
          throw new Error('Кіру деректері дұрыс емес немесе пайдаланушы табылмады');
        }
      } catch (err) {
        showToast(`Қате: ${err.message || 'Кіру деректері дұрыс емес'}`, 'error');
      }
    };
  }

  render();
}
