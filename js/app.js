// KitapTracker — Негізгі SPA қолданба контроллері
import { api } from './api.js';
import { getLang, setLang, t } from './i18n.js';
import { renderAuthView } from './views/auth.js';
import { renderWorldView } from './views/world.js';
import { renderShelfView } from './views/shelf.js';
import { renderBookDetailView } from './views/book-detail.js';
import { renderReaderView } from './views/reader.js';
import { renderPlayView } from './views/play.js';
import { renderMissionView } from './views/mission.js';
import { renderAchievementsView } from './views/achievements.js';
import { renderDiaryView } from './views/diary.js';
import { renderTeacherView } from './views/teacher.js';

let currentUser = null;

async function init() {
  setupGlobalControls();

  try {
    const meRes = await api.me();
    currentUser = meRes.user;
  } catch (err) {
    currentUser = null;
  }

  updateHeaderUI();
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
}

function setupGlobalControls() {
  // Тіл ауыстырғыш
  const langBtn = document.getElementById('btn-toggle-lang');
  if (langBtn) {
    langBtn.textContent = getLang() === 'kk' ? 'RU' : 'KZ';
    langBtn.onclick = () => {
      const next = getLang() === 'kk' ? 'ru' : 'kk';
      setLang(next);
      langBtn.textContent = next === 'kk' ? 'RU' : 'KZ';
      updateHeaderUI();
      handleRoute();
    };
  }

  // Анимацияны азайту
  const motionBtn = document.getElementById('btn-toggle-motion');
  if (motionBtn) {
    motionBtn.onclick = () => {
      document.body.classList.toggle('reduce-motion');
      const isReduced = document.body.classList.contains('reduce-motion');
      motionBtn.textContent = isReduced ? '⚡ (Бәсең)' : '⚡';
    };
  }

  // Шығу батырмасы
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await api.logout();
      currentUser = null;
      updateHeaderUI();
      window.location.hash = '#/auth';
    };
  }
}

function updateHeaderUI() {
  const mainNav = document.getElementById('main-nav');
  const teacherNav = document.getElementById('teacher-nav');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileTeacherNav = document.getElementById('mobile-teacher-nav');
  const profileBadge = document.getElementById('user-profile-badge');
  const avatarSpan = document.getElementById('user-avatar-span');
  const nicknameSpan = document.getElementById('user-nickname-span');

  if (!currentUser) {
    if (mainNav) mainNav.style.display = 'none';
    if (teacherNav) teacherNav.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';
    if (mobileTeacherNav) mobileTeacherNav.style.display = 'none';
    if (profileBadge) profileBadge.style.display = 'none';
    return;
  }

  // Профиль көрсету
  if (profileBadge) {
    profileBadge.style.display = 'flex';
    if (avatarSpan) avatarSpan.textContent = currentUser.avatar === 'owl' ? '🦉' : '🦊';
    if (nicknameSpan) nicknameSpan.textContent = currentUser?.nickname || '';
  }

  if (currentUser.role === 'teacher') {
    if (mainNav) mainNav.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';
    if (teacherNav) teacherNav.style.display = 'flex';
    if (mobileTeacherNav) mobileTeacherNav.style.display = 'flex';
  } else {
    if (teacherNav) teacherNav.style.display = 'none';
    if (mobileTeacherNav) mobileTeacherNav.style.display = 'none';
    if (mainNav) mainNav.style.display = 'flex';
    if (mobileNav) mobileNav.style.display = 'flex';
  }
}

function handleRoute() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;
  let hash = window.location.hash || '#/world';

  if (!currentUser) {
    renderAuthView(appContainer, (user) => {
      currentUser = user;
      updateHeaderUI();
      window.location.hash = user.role === 'teacher' ? '#/teacher/overview' : '#/world';
    });
    return;
  }

  // Мәзірдің белсенді күйін белгілеу
  document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(el => {
    const route = el.getAttribute('data-route');
    if (hash.includes(route)) el.classList.add('active');
    else el.classList.remove('active');
  });

  try {
    // Маршруттар талдауы
    if (currentUser.role === 'teacher') {
      if (hash.startsWith('#/teacher/overview')) return renderTeacherView(appContainer, 'overview');
      if (hash.startsWith('#/teacher/classes')) return renderTeacherView(appContainer, 'classes');
      if (hash.startsWith('#/teacher/tasks')) return renderTeacherView(appContainer, 'tasks');
      if (hash.startsWith('#/teacher/reviews')) return renderTeacherView(appContainer, 'reviews');
      if (hash.startsWith('#/teacher/missions')) return renderTeacherView(appContainer, 'missions');
      window.location.hash = '#/teacher/overview';
      return;
    }

    // Оқушы маршруттары
    if (hash.startsWith('#/world')) {
      renderWorldView(appContainer);
    } else if (hash.startsWith('#/shelf')) {
      renderShelfView(appContainer);
    } else if (hash.startsWith('#/diary')) {
      renderDiaryView(appContainer);
    } else if (hash.startsWith('#/book/')) {
      const bookId = hash.replace('#/book/', '');
      renderBookDetailView(appContainer, bookId);
    } else if (hash.startsWith('#/read/')) {
      const parts = hash.replace('#/read/', '').split('/');
      const bookId = parts[0];
      const chapterIdx = parts[1] || 1;
      renderReaderView(appContainer, bookId, chapterIdx);
    } else if (hash.startsWith('#/play/')) {
      const taskId = hash.replace('#/play/', '');
      renderPlayView(appContainer, taskId);
    } else if (hash.startsWith('#/play')) {
      renderPlayView(appContainer);
    } else if (hash.startsWith('#/mission')) {
      renderMissionView(appContainer);
    } else if (hash.startsWith('#/achievements')) {
      renderAchievementsView(appContainer);
    } else {
      window.location.hash = '#/world';
    }
  } catch (err) {
    renderInitError(err);
  }
}

function renderInitError(err) {
  console.error('KitapTracker render error:', err);
  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.innerHTML = `
      <div class="card" style="max-width:520px; margin:40px auto; text-align:center; padding:30px;">
        <div style="font-size:40px; margin-bottom:12px;">⚠️</div>
        <h3 style="font-size:20px; font-weight:800; color:var(--danger-color); margin-bottom:10px;">
          Жүйені жүктеу кезінде кідіріс болды
        </h3>
        <p style="font-size:14px; color:var(--text-muted); margin-bottom:20px;">
          ${err?.message || 'Желімен немесе деректермен байланыс орнату мүмкін болмады.'}
        </p>
        <button class="btn btn-primary" onclick="window.location.reload()">
          🔄 Бетті қайта жаңарту
        </button>
      </div>
    `;
  }
}

// Браузер жүктелуін тексеру (DOMContentLoaded өткен болса да бірден іске қосу)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch(renderInitError);
  });
} else {
  init().catch(renderInitError);
}
