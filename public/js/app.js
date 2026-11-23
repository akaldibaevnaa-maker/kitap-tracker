// KitapTracker — Негізгі SPA қолданба контроллері
import { api } from './api.js';
import { getLang, setLang, t } from './i18n.js';
import { renderAuthView } from './views/auth.js';
import { renderWorldView } from './views/world.js?v=2';
import { renderShelfView } from './views/shelf.js?v=2';
import { renderBookDetailView } from './views/book-detail.js?v=2';
import { renderReaderView } from './views/reader.js';
import { renderPlayView } from './views/play.js';
import { renderMissionView } from './views/mission.js';
import { renderAchievementsView } from './views/achievements.js';
import { renderDiaryView } from './views/diary.js';
import { renderTeacherView } from './views/teacher.js';
import { renderTreeView } from './views/tree.js';
import { renderAnalyticsView } from './views/analytics.js';
import { renderChallengesView } from './views/challenges.js';
import { renderQrLibraryView } from './views/qr-library.js';
import { renderAiAssistantView } from './views/ai-assistant.js';
import { renderResearchView } from './views/research.js';

let currentUser = null;

async function init() {
  setupGlobalControls();

  const urlParams = new URLSearchParams(window.location.search);
  const demoRole = urlParams.get('demo') || urlParams.get('role');

  if (demoRole === 'teacher' || demoRole === 'student') {
    try {
      const demoRes = await api.loginDemo(demoRole);
      currentUser = demoRes.user;
      if (demoRole === 'teacher' && (!window.location.hash || window.location.hash === '#/world')) {
        window.location.hash = '#/teacher/overview';
      }
    } catch {
      currentUser = null;
    }
  } else {
    try {
      const meRes = await api.me();
      currentUser = meRes.user;
    } catch (err) {
      currentUser = null;
    }
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

  // Хабарламалар батырмасы
  const notifBtn = document.getElementById('btn-notifications');
  if (notifBtn) {
    notifBtn.onclick = async () => {
      try {
        const me = await api.me();
        const unseen = me?.user?.unseen_feedback || 0;
        const { openModal } = await import('./ui.js');
        openModal({
          title: '🔔 Хабарламалар мен мұғалім пікірлері',
          bodyHtml: `
            <div style="padding:10px 0;">
              ${unseen > 0 ? `
                <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px; padding:12px; margin-bottom:12px; color:#065f46; font-size:14px; font-weight:600;">
                  ✨ Сізде мұғалімнен <strong>${unseen} жаңа пікір</strong> бар! Басты беттен немесе күнделіктен толық таныса аласыз.
                </div>
              ` : `
                <div style="text-align:center; padding:20px; color:var(--text-muted);">
                  <div style="font-size:32px; margin-bottom:8px;">📭</div>
                  <p style="font-size:14px; font-weight:600;">Әзірге оқылмаған жаңа хабарлама жоқ.</p>
                  <p style="font-size:12px; margin-top:4px;">Кітап оқып, күнделік толтырған сайын мұғалімнің бағалауы мен пікірлері осында түседі.</p>
                </div>
              `}
              <div style="display:flex; gap:10px; justify-content:center; margin-top:14px;">
                <a href="#/diary" class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-root').innerHTML=''">📝 Күнделікке өту</a>
                <a href="#/world" class="btn btn-primary btn-sm" onclick="document.getElementById('modal-root').innerHTML=''">🌍 Басты бетке өту</a>
              </div>
            </div>
          `
        });
      } catch (e) {
        console.error('Notification error', e);
      }
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
  const notifBtn = document.getElementById('btn-notifications');
  const notifDot = document.getElementById('notif-badge-dot');
  const xpBadge = document.getElementById('header-xp-badge');
  const xpCount = document.getElementById('header-xp-count');

  if (!currentUser) {
    if (mainNav) mainNav.style.display = 'none';
    if (teacherNav) teacherNav.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';
    if (mobileTeacherNav) mobileTeacherNav.style.display = 'none';
    if (profileBadge) profileBadge.style.display = 'none';
    if (notifBtn) notifBtn.style.display = 'none';
    if (xpBadge) xpBadge.style.display = 'none';
    return;
  }

  // Профиль көрсету
  if (profileBadge) {
    profileBadge.style.display = 'flex';
    if (avatarSpan) avatarSpan.textContent = currentUser.avatar === 'owl' ? '🦉' : '🦊';
    if (nicknameSpan) nicknameSpan.textContent = currentUser?.nickname || '';
  }

  // XP және хабарлама көрсету
  if (currentUser.role === 'student') {
    if (xpBadge) {
      xpBadge.style.display = 'inline-flex';
      if (xpCount) xpCount.textContent = currentUser.xp ?? 0;
    }
    if (notifBtn) {
      notifBtn.style.display = 'inline-flex';
      if (notifDot) notifDot.style.display = (currentUser.unseen_feedback > 0) ? 'block' : 'none';
    }
  } else {
    if (xpBadge) xpBadge.style.display = 'none';
    if (notifBtn) notifBtn.style.display = 'none';
  }

  if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
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
    if (hash.startsWith('#/book/')) {
      const bookId = hash.replace('#/book/', '');
      return renderBookDetailView(appContainer, bookId);
    }
    if (hash.startsWith('#/read/')) {
      const parts = hash.replace('#/read/', '').split('/');
      return renderReaderView(appContainer, parts[0], parts[1] || 1);
    }
    renderAuthView(appContainer, (user) => {
      currentUser = user;
      updateHeaderUI();
      const savedBook = sessionStorage.getItem('kt_scanned_book');
      if (savedBook) {
        sessionStorage.removeItem('kt_scanned_book');
        window.location.hash = `#/book/${savedBook}`;
      } else {
        window.location.hash = user.role === 'teacher' ? '#/teacher/overview' : '#/world';
      }
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
    if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
      if (hash.startsWith('#/teacher/overview')) return renderTeacherView(appContainer, 'overview');
      if (hash.startsWith('#/teacher/analytics')) return renderTeacherView(appContainer, 'analytics');
      if (hash.startsWith('#/teacher/comprehension')) return renderTeacherView(appContainer, 'comprehension');
      if (hash.startsWith('#/teacher/admin') || hash.startsWith('#/admin')) return renderTeacherView(appContainer, 'admin');
      if (hash.startsWith('#/teacher/classes')) return renderTeacherView(appContainer, 'classes');
      if (hash.startsWith('#/teacher/tasks')) return renderTeacherView(appContainer, 'tasks');
      if (hash.startsWith('#/teacher/reviews')) return renderTeacherView(appContainer, 'reviews');
      if (hash.startsWith('#/teacher/missions')) return renderTeacherView(appContainer, 'missions');
      if (hash.startsWith('#/teacher/reports')) return renderTeacherView(appContainer, 'reports');
      if (hash.startsWith('#/teacher/comparison')) return renderTeacherView(appContainer, 'comparison');
      if (hash.startsWith('#/teacher/challenges') || hash.startsWith('#/challenges')) return renderChallengesView(appContainer);
      if (hash.startsWith('#/teacher/qr-catalog') || hash.startsWith('#/qr-library')) return renderQrLibraryView(appContainer);
      if (hash.startsWith('#/ai-assistant')) return renderAiAssistantView(appContainer);
      if (hash.startsWith('#/research')) return renderResearchView(appContainer);
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
    } else if (hash.startsWith('#/tree')) {
      renderTreeView(appContainer);
    } else if (hash.startsWith('#/analytics')) {
      renderAnalyticsView(appContainer);
    } else if (hash.startsWith('#/achievements')) {
      renderAchievementsView(appContainer);
    } else if (hash.startsWith('#/challenges')) {
      renderChallengesView(appContainer);
    } else if (hash.startsWith('#/qr-library')) {
      renderQrLibraryView(appContainer);
    } else if (hash.startsWith('#/ai-assistant')) {
      renderAiAssistantView(appContainer);
    } else if (hash.startsWith('#/research')) {
      renderResearchView(appContainer);
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
