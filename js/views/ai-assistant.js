/**
 * KitapTracker — 3D GAMIFIED AI BOOK ASSISTANT (Жасанды интеллект кітап көмекшісі)
 * 🦉 «Кітап Досы» — Сократтық тәлімгер & Оқырман маскоты
 * 
 * Құлахметова Аягөз (№290 орта мектеп, 2026 ж.)
 * Жетекші: Аскарова А.К., Кеңесші: Құлмырзаев Н.С.
 */
import { api } from '../api.js';
import { showToast, openModal, launchConfetti } from '../ui.js';
import { generateMascotSvg } from '../mascot.js';

let currentSessionId = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4 style="margin:12px 0 6px; color:#1e293b; font-size:16px; font-weight:800;">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 style="margin:14px 0 8px; color:#1e293b; font-size:17px; font-weight:900;">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 style="margin:16px 0 10px; color:#1e293b; font-size:18px; font-weight:900;">$1</h2>');
  // Bullet lists
  html = html.replace(/^\s*[-•]\s+(.*$)/gim, '<li style="margin-left:18px; margin-bottom:4px; font-size:13.5px;">$1</li>');
  // Numbered lists
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li style="margin-left:18px; margin-bottom:4px; font-size:13.5px;"><strong>$1.</strong> $2</li>');
  // Blockquotes
  html = html.replace(/^>\s*(.*$)/gim, '<blockquote style="border-left:4px solid #C9B8F2; padding:8px 14px; margin:8px 0; background:#f5f3ff; color:#5b21b6; border-radius:8px;">$1</blockquote>');
  // Code spans
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:13px; color:#0f766e;">$1</code>');
  // Line breaks
  html = html.replace(/\n\n/g, '<p style="margin-bottom:10px;"></p>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

export async function renderAiAssistantView(container) {
  // Parse query params from hash: e.g. #/ai-assistant?bookId=2
  const hash = window.location.hash || '';
  const qIdx = hash.indexOf('?');
  const params = new URLSearchParams(qIdx !== -1 ? hash.slice(qIdx) : '');
  const urlBookId = params.get('bookId') ? Number(params.get('bookId')) : null;
  const initialMode = params.get('mode') || null;

  container.innerHTML = `
    <div style="text-align:center; padding: 50px 20px;">
      <div style="font-size:36px; animation:treeSway 1s infinite alternate;">🦉</div>
      <p style="color:var(--text-muted); font-weight:700; margin-top:10px;">«Кітап Досы» байланысқа шығуда...</p>
    </div>
  `;

  try {
    const [meRes, statusRes, booksRes, shelfRes] = await Promise.all([
      api.me().catch(() => ({ user: null })),
      api.getAiStatus().catch(() => ({ configured: false })),
      api.getBooks().catch(() => ({ books: [] })),
      api.getShelf().catch(() => ({ items: [] }))
    ]);

    const user = meRes.user || { name: 'Оқушы', role: 'student' };
    const isTeacher = user.role === 'teacher' || user.role === 'admin';
    const books = booksRes.books || [];
    const shelfItems = shelfRes.items || [];

    // Session identifier
    if (!currentSessionId) {
      currentSessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    renderAiLayout(container, {
      user,
      isTeacher,
      aiStatus: statusRes,
      books,
      shelfItems,
      selectedBookId: urlBookId,
      initialMode
    });
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="color:var(--danger-color); padding:24px; text-align:center;">
        <h3>Қате орын алды</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function renderAiLayout(container, { user, isTeacher, aiStatus, books, shelfItems, selectedBookId, initialMode }) {
  let activeBookId = selectedBookId;
  let activeMode = initialMode || 'chat';
  let isSending = false;
  let currentCharacter = 'owl'; // 'owl' | 'fox'
  let mascotState = 'reading'; // 'happy' | 'excited' | 'thinking' | 'reading' | 'celebrating'

  const quickPills = [
    { mode: 'recommend', icon: '📚', label: 'Жасқа сай кітаптар', prompt: 'Маған жасыма және сыныбыма сай оқуға тұрарлық қандай кітаптар ұсынасың?' },
    { mode: 'interest_recommend', icon: '✨', label: 'Қызығушылығыма сай', prompt: 'Менің қызығушылығыма сай кітап таңдауға көмектесші!' },
    { mode: 'questions', icon: '❓', label: 'Мазмұндық сұрақтар', prompt: 'Осы кітап бойынша менің түсіну деңгейімді тексеретін, ойландыратын сұрақтар қойшы!' },
    { mode: 'character', icon: '🎭', label: 'Кейіпкерді талдау', prompt: 'Шығармадағы басты кейіпкерді бірге талдайықшы. Оның мінезі мен іс-әрекетін қалай бағалаймыз?' },
    { mode: 'theme', icon: '💡', label: 'Шығарманың негізгі идеясы', prompt: 'Бұл шығарманың негізгі идеясы мен тақырыбы қандай? Автор нені меңзеді?' },
    { mode: 'review_help', icon: '✍️', label: 'Пікір жазудың 4 қадамы', prompt: 'Кітап туралы оқырман күнделігіне сауатты пікір жазудың 4 қадамдық жоспарын ұсыншы!' },
    { mode: 'plan', icon: '📅', label: 'Жеке оқу жоспары', prompt: 'Осы кітапты күніне қанша беттен оқып, қанша күнде бітіруге болатынын есептеп, жоспар құрып берші!' },
    { mode: 'activity_advice', icon: '📊', label: 'Оқу белсенділігіме кеңес', prompt: 'Менің оқу белсенділігіме, жинаған ұпайыма және Кітап ағашыма қарап жігерлендіруші кеңес берші!' }
  ];

  container.innerHTML = `
    <div style="max-width: 980px; margin: 0 auto; display:flex; flex-direction:column; gap:18px;">
      
      <!-- ЖОҒАРҒЫ 3D БАСТЫ БАННЕР ЖӘНЕ РЕДИНГ БАДДИ МАСКОТ -->
      <div class="card" style="background: linear-gradient(135deg, #176B4D 0%, #238451 50%, #1e3a8a 100%); color:#fff; padding:24px 26px; border-radius:var(--radius-lg); border-bottom:5px solid #14532d; box-shadow:0 12px 28px rgba(23,107,77,0.22); position:relative; overflow:hidden;">
        
        <!-- Фондық сәндік дөңгелектер -->
        <div style="position:absolute; right:-20px; top:-20px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.06); pointer-events:none;"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:18px; position:relative; z-index:2;">
          <div style="display:flex; align-items:center; gap:18px;">
            <!-- 3D Маскот анимациялық аватары -->
            <div id="ai-mascot-avatar-box" style="flex-shrink:0; cursor:pointer;" title="Маскотты ауыстыру үшін басыңыз (Үкі / Түлкі)">
              ${generateMascotSvg(currentCharacter, mascotState, 80)}
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <h2 style="font-size:24px; font-weight:900; margin:0; color:#fff;">«Кітап Досы»</h2>
                <span style="background:rgba(255,255,255,0.2); color:#FFD36A; font-size:12px; font-weight:800; padding:4px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.25);">
                  AI Кітап Көмекшісі
                </span>
              </div>
              <p style="font-size:13.5px; opacity:0.95; margin:4px 0 0; color:#f0fdf4; max-width:520px; line-height:1.45;">
                Сократтық тәлімгер · Оқушының кітапты өз бетінше терең түсінуі мен сыни ойлауын дамытушы ақылшы дос
              </p>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div id="ai-status-indicator" style="display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.25); padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; border:1px solid rgba(255,255,255,0.2);">
              ${aiStatus.configured ? `
                <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#4ade80; box-shadow:0 0 10px #4ade80;"></span>
                <span style="color:#dcfce7;">Gemini API белсенді (${aiStatus.model || '2.0-flash'})</span>
              ` : `
                <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#facc15; box-shadow:0 0 10px #facc15;"></span>
                <span style="color:#fef08a;">API кілті орнатылмаған</span>
              `}
            </div>

            ${isTeacher ? `
              <button class="btn-3d btn-3d-yellow" id="btn-open-ai-settings" style="padding:6px 14px; font-size:12px;">
                ⚙️ AI Баптаулары
              </button>
            ` : ''}

            <button class="btn-3d btn-3d-coral" id="btn-clear-chat-history" style="padding:6px 14px; font-size:12px;">
              🗑️ Тазалау
            </button>
          </div>
        </div>

        <div style="margin-top:16px; border-top:1px solid rgba(255,255,255,0.18); padding-top:12px; font-size:12px; opacity:0.9; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; color:#A9DDF5;">
          <span>🇰🇿 №290 орта мектеп · Автор: <strong>Құлахметова Аягөз</strong> (2026 ж.)</span>
          <span>Жетекші: Аскарова А.К. · Кеңесші: Құлмырзаев Н.С.</span>
        </div>
      </div>

      <!-- Егер AI қосылмаған болса, ескерту картасы -->
      ${!aiStatus.configured ? `
        <div class="card" style="border: 2px dashed #f59e0b; background:#fffbeb; padding:20px; border-radius:var(--radius-lg); margin-bottom:0;">
          <div style="display:flex; gap:16px; align-items:flex-start;">
            <div style="font-size:36px;">⚠️</div>
            <div style="flex:1;">
              <h4 style="font-size:16px; font-weight:800; color:#92400e; margin:0 0 6px;">Жасанды Интеллект API кілті әлі орнатылмаған</h4>
              <p style="font-size:13.5px; color:#78350f; line-height:1.5; margin:0 0 12px;">
                Kitap Tracker платформасының қағидаты бойынша, шынайы <strong>Google Gemini API</strong> арқылы ғана жауап беріледі және <em>жалған/симуляциялық AI жасалмайды</em>. 
                Оқушыларға көмекшінің толыққанды жұмыс істеуі үшін мұғалім немесе әкімші баптауларға API кілтін қосуы қажет.
              </p>
              ${isTeacher ? `
                <button class="btn-3d btn-3d-yellow" id="btn-banner-settings" style="padding:8px 18px; font-size:12.5px;">
                  🔑 Gemini API кілтін енгізу & тексеру
                </button>
              ` : `
                <div style="font-size:12px; color:#92400e; font-weight:700;">
                  Мұғаліміңізден немесе мектеп кураторынан жүйеге Gemini API кілтін енгізуді сұраңыз.
                </div>
              `}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Талданатын кітапты таңдау жолағы -->
      <div class="card" style="padding:16px 20px; display:flex; align-items:center; gap:16px; flex-wrap:wrap; border-radius:var(--radius-lg); background:#f8fafc; border:1.5px solid var(--border-color); margin-bottom:0;">
        <div style="display:flex; align-items:center; gap:8px; font-weight:800; color:var(--text-main); font-size:14px;">
          <span>📖 Талданатын кітап:</span>
        </div>
        <div style="flex:1; min-width:260px;">
          <select id="select-ai-book" class="form-control" style="width:100%; font-size:14px; padding:9px 14px; border-radius:10px; border:1.5px solid #cbd5e1;">
            <option value="">-- Жалпы әдеби тақырып (нақты кітапсыз) --</option>
            ${shelfItems.length > 0 ? `
              <optgroup label="📚 Менің сөремдегі кітаптар">
                ${shelfItems.map(item => `
                  <option value="${item.book_id || item.id}" ${activeBookId === (item.book_id || item.id) ? 'selected' : ''}>
                    ${escapeHtml(item.title)} — ${escapeHtml(item.author)} (${item.status === 'in_progress' ? 'Оқылуда' : item.status === 'finished' ? 'Оқылған' : 'Жоспарда'})
                  </option>
                `).join('')}
              </optgroup>
            ` : ''}
            <optgroup label="🏛️ Барлық мектеп кітаптары">
              ${books.map(b => `
                <option value="${b.id}" ${activeBookId === b.id ? 'selected' : ''}>
                  ${escapeHtml(b.title)} — ${escapeHtml(b.author)} (${b.grade_min}-${b.grade_max} сынып)
                </option>
              `).join('')}
            </optgroup>
          </select>
        </div>
        <div id="selected-book-badge" style="font-size:13px; color:#64748b; font-weight:700;">
          ${activeBookId ? '✅ Кітап таңдалды' : 'ℹ️ Кітап таңдасаңыз, талдау дәлірек болады'}
        </div>
      </div>

      <!-- 8 Дайын Жедел Тапсырмалар (Action Pills) -->
      <div>
        <div style="font-size:13px; font-weight:800; color:var(--text-muted); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <span>💡 БАҒЫТТАУШЫ ТАПСЫРМАЛАР МЕН МҮМКІНДІКТЕР (8 РЕЖИМ):</span>
          <span style="font-size:12px; color:var(--primary-green); font-weight:800;">Біреуін таңдаңыз 👆</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">
          ${quickPills.map(p => `
            <button class="btn btn-secondary quick-action-pill" 
              data-mode="${p.mode}" 
              data-prompt="${escapeHtml(p.prompt)}" 
              style="text-align:left; padding:10px 14px; border-radius:12px; font-size:13px; font-weight:800; display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid #e2e8f0; border-bottom:3.5px solid #cbd5e1; transition:all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor:pointer;"
            >
              <span style="font-size:22px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.08));">${p.icon}</span>
              <span style="color:var(--text-main);">${p.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Чат алаңы / Chat Window -->
      <div class="card" style="padding:0; overflow:hidden; border-radius:var(--radius-lg); display:flex; flex-direction:column; min-height:480px; box-shadow:0 8px 24px rgba(38,55,70,0.08); border:1.5px solid var(--border-color); margin-bottom:0;">
        
        <!-- Сұхбат тарихы контейнері -->
        <div id="ai-messages-scroll" style="flex:1; padding:22px; overflow-y:auto; max-height:520px; display:flex; flex-direction:column; gap:16px; background:#fafaf9;">
          <!-- Алғашқы жылы амандасу -->
          <div class="assistant-msg" style="display:flex; gap:14px; align-items:flex-start; max-width:85%;">
            <div style="flex-shrink:0;">
              ${generateMascotSvg('owl', 'happy', 44)}
            </div>
            <div style="background:#fff; border:1.5px solid #e2e8f0; border-radius:4px 18px 18px 18px; padding:16px 20px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
              <div style="font-weight:900; font-size:13.5px; color:#166534; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                <span>🦉 «Кітап Досы» ақылшың</span>
              </div>
              <div style="font-size:14px; line-height:1.6; color:#1e293b;">
                Сәлем, <strong>${escapeHtml(user.name)}</strong>! 🦉 Мен — сенің кітап әлеміндегі ақылшыңмын.<br><br>
                Мен үй тапсырмаңды сенің орныңа орындап бермеймін, бірақ саған кітаптың мәнін терең түсінуге, кейіпкерлердің сырын ашуға, қызықты сұрақтар мен пікір жазуға бағыт беремін!<br><br>
                Жоғарыдағы батырмалардың бірін бас немесе төменге сұрағыңды жаз. Саяхатымызды бастайық па? ✨
              </div>
              <div style="font-size:11px; color:#94a3b8; margin-top:8px; text-align:right; font-weight:700;">Сократтық тәлімгер</div>
            </div>
          </div>
        </div>

        <!-- Жүктелу / ойлану индикаторы -->
        <div id="ai-typing-indicator" style="display:none; padding:12px 24px; background:#f0fdf4; border-top:1px solid #bbf7d0; font-size:13.5px; color:#166534; font-weight:800; align-items:center; gap:12px;">
          <div style="flex-shrink:0; animation:mascotBob 1.5s ease-in-out infinite;">
            ${generateMascotSvg('owl', 'thinking', 36)}
          </div>
          <span>«Кітап Досы» ойлануда және жауап дайындауда...</span>
        </div>

        <!-- Төменгі хабарлама жазу жолы -->
        <div style="padding:16px 20px; background:#fff; border-top:1.5px solid #e2e8f0; display:flex; gap:12px; align-items:center;">
          <textarea id="ai-user-input" class="form-control" rows="1" placeholder="Кітап Досына сұрағыңды жаз (мысалы: осы кітаптағы кейіпкер неге олай жасады?)..." style="flex:1; resize:none; font-size:14px; padding:12px 16px; border-radius:12px; border:1.5px solid #cbd5e1; max-height:100px; font-family:inherit;"></textarea>
          <button class="btn-3d btn-3d-yellow" id="btn-send-ai-message" style="padding:10px 22px; font-size:13.5px;">
            <span>Жіберу 🚀</span>
          </button>
        </div>
      </div>

      <!-- Педагогикалық мәліметтер блогы -->
      <div style="font-size:12.5px; color:#475569; background:#FFF8E9; border:1.5px solid #FFD36A; padding:14px 20px; border-radius:var(--radius-md); line-height:1.55; box-shadow:0 2px 8px rgba(255,211,106,0.15);">
        🔒 <strong>Педагогикалық қағидат:</strong> Жасанды интеллект көмекшісі оқушының ойлау қабілетін дамыту үшін сократтық сұрақ қою әдісін қолданады. Сұхбат тарихы қауіпсіз сақталады. Әр мазмұнды сұхбат үшін оқушыға <strong style="color:#16a34a;">+5 XP</strong> беріледі!
      </div>

    </div>
  `;

  const messagesScroll = container.querySelector('#ai-messages-scroll');
  const typingIndicator = container.querySelector('#ai-typing-indicator');
  const userInput = container.querySelector('#ai-user-input');
  const sendBtn = container.querySelector('#btn-send-ai-message');
  const bookSelect = container.querySelector('#select-ai-book');
  const clearBtn = container.querySelector('#btn-clear-chat-history');
  const settingsBtn = container.querySelector('#btn-open-ai-settings');
  const bannerSettingsBtn = container.querySelector('#btn-banner-settings');
  const mascotAvatarBox = container.querySelector('#ai-mascot-avatar-box');

  // Маскотты басу арқылы кейіпкерді ауыстыру (Үкі <-> Түлкі)
  if (mascotAvatarBox) {
    mascotAvatarBox.onclick = () => {
      currentCharacter = currentCharacter === 'owl' ? 'fox' : 'owl';
      mascotAvatarBox.innerHTML = generateMascotSvg(currentCharacter, mascotState, 80);
      showToast(`Маскот ауыстырылды: ${currentCharacter === 'owl' ? 'Үкі 🦉' : 'Түлкі 🦊'}!`, 'info');
    };
  }

  // Кітап таңдауын қадағалау
  bookSelect.onchange = () => {
    activeBookId = bookSelect.value ? Number(bookSelect.value) : null;
    const badge = container.querySelector('#selected-book-badge');
    if (activeBookId) {
      badge.textContent = '✅ Кітап таңдалды';
      badge.style.color = '#15803d';
    } else {
      badge.textContent = 'ℹ️ Кітап таңдасаңыз, талдау дәлірек болады';
      badge.style.color = '#64748b';
    }
  };

  // Бұрынғы сұхбат тарихын серверден жүктеу
  loadHistory();

  async function loadHistory() {
    try {
      const res = await api.getAiHistory(currentSessionId);
      if (res.messages && res.messages.length > 0) {
        for (const m of res.messages) {
          appendMessageUI(m.role, m.content, false);
        }
        scrollToBottom();
      }
    } catch {
      // ignore
    }
  }

  function scrollToBottom() {
    if (messagesScroll) {
      messagesScroll.scrollTop = messagesScroll.scrollHeight;
    }
  }

  function appendMessageUI(role, content, animate = true) {
    const isUser = role === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.style.display = 'flex';
    msgDiv.style.gap = '14px';
    msgDiv.style.alignItems = 'flex-start';
    msgDiv.style.maxWidth = '85%';

    if (isUser) {
      msgDiv.style.alignSelf = 'flex-end';
      msgDiv.style.flexDirection = 'row-reverse';
      msgDiv.innerHTML = `
        <div style="width:40px; height:40px; border-radius:50%; background:#dbeafe; color:#1d4ed8; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; border:2px solid #93c5fd; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
          🧑‍🎓
        </div>
        <div style="background:linear-gradient(135deg, #176B4D 0%, #238451 100%); color:#fff; border-radius:18px 4px 18px 18px; padding:14px 18px; box-shadow:0 4px 12px rgba(23,107,77,0.18);">
          <div style="font-weight:800; font-size:12px; margin-bottom:4px; opacity:0.9; color:#A9DDF5;">${escapeHtml(user.name)}</div>
          <div style="font-size:14px; line-height:1.55; word-break:break-word;">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
        </div>
      `;
    } else {
      msgDiv.style.alignSelf = 'flex-start';
      const formattedHtml = formatMarkdown(content);
      const msgId = 'msg-' + Math.random().toString(36).substring(2, 8);

      msgDiv.innerHTML = `
        <div style="flex-shrink:0;">
          ${generateMascotSvg(currentCharacter, 'happy', 44)}
        </div>
        <div style="background:#fff; border:1.5px solid #e2e8f0; border-radius:4px 18px 18px 18px; padding:16px 20px; box-shadow:0 4px 12px rgba(0,0,0,0.04); flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-weight:900; font-size:13.5px; color:#166534; display:flex; align-items:center; gap:6px;">
              <span>Кітап Досы</span>
            </span>
            <div style="display:flex; gap:6px;">
              <button class="btn-copy-msg" data-target="${msgId}" title="Мәтінді көшіру" style="background:none; border:none; cursor:pointer; font-size:13px; opacity:0.6; padding:2px 4px;">📋</button>
              <button class="btn-tts-msg" data-text="${encodeURIComponent(content)}" title="Дыбыстап оқу" style="background:none; border:none; cursor:pointer; font-size:13px; opacity:0.6; padding:2px 4px;">🔊</button>
            </div>
          </div>
          <div id="${msgId}" style="font-size:14px; line-height:1.6; color:#1e293b;">
            ${formattedHtml}
          </div>
          <div style="font-size:11px; color:#94a3b8; margin-top:10px; display:flex; justify-content:space-between; font-weight:700;">
            <span>🦉 Сократтық кеңесші</span>
            <span>№290 мектеп</span>
          </div>
        </div>
      `;

      // Copy logic
      const copyBtn = msgDiv.querySelector('.btn-copy-msg');
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(content).then(() => {
            showToast('Мәтін алмасу буферіне көшірілді', 'info');
          });
        };
      }

      // TTS logic
      const ttsBtn = msgDiv.querySelector('.btn-tts-msg');
      if (ttsBtn && window.speechSynthesis) {
        ttsBtn.onclick = () => {
          window.speechSynthesis.cancel();
          const cleanText = content.replace(/[*#`_>]/g, '');
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = 'kk-KZ';
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        };
      }
    }

    messagesScroll.appendChild(msgDiv);
    if (animate) scrollToBottom();
  }

  // Хабарлама жіберу логикасы
  async function sendMessage(textToSend, modeOverride = null) {
    if (isSending) return;
    const msg = (textToSend !== undefined ? textToSend : userInput.value).trim();
    if (!msg) return;

    const currentMode = modeOverride || activeMode || 'chat';

    appendMessageUI('user', msg);
    userInput.value = '';
    isSending = true;

    // Маскот көңіл-күйін "ойлану" (thinking) етіп өзгерту
    if (mascotAvatarBox) {
      mascotAvatarBox.innerHTML = generateMascotSvg(currentCharacter, 'thinking', 80);
    }

    if (typingIndicator) typingIndicator.style.display = 'flex';
    scrollToBottom();

    try {
      const res = await api.askAiAssistant({
        message: msg,
        mode: currentMode,
        bookId: activeBookId,
        sessionId: currentSessionId
      });

      if (typingIndicator) typingIndicator.style.display = 'none';

      // Маскотты қуанту
      if (mascotAvatarBox) {
        mascotAvatarBox.innerHTML = generateMascotSvg(currentCharacter, 'excited', 80);
        setTimeout(() => {
          if (mascotAvatarBox) mascotAvatarBox.innerHTML = generateMascotSvg(currentCharacter, 'reading', 80);
        }, 3000);
      }

      if (res.reply) {
        appendMessageUI('assistant', res.reply);
        if (res.xpAwarded > 0) {
          launchConfetti();
          showToast(`✨ +${res.xpAwarded} XP «Кітап Досымен» сұхбаттасқаның үшін берілді!`, 'success');
        }
      }
    } catch (err) {
      if (typingIndicator) typingIndicator.style.display = 'none';

      if (mascotAvatarBox) {
        mascotAvatarBox.innerHTML = generateMascotSvg(currentCharacter, 'reading', 80);
      }

      let errMessage = err.message || 'AI көмекшісімен байланысу мүмкін болмады.';
      if (errMessage.includes('ai_not_configured')) {
        errMessage = '⚠️ Жасанды интеллект API кілті әлі орнатылмаған. Мұғалім немесе әкімші баптаулардан Gemini API кілтін қосуы қажет.';
      }

      const errorDiv = document.createElement('div');
      errorDiv.style.alignSelf = 'center';
      errorDiv.style.maxWidth = '90%';
      errorDiv.style.background = '#fef2f2';
      errorDiv.style.border = '1px solid #fecaca';
      errorDiv.style.color = '#991b1b';
      errorDiv.style.borderRadius = '10px';
      errorDiv.style.padding = '12px 18px';
      errorDiv.style.fontSize = '13px';
      errorDiv.style.margin = '8px 0';
      errorDiv.innerHTML = `<strong>⚠️ Қате:</strong> ${escapeHtml(errMessage)}`;
      messagesScroll.appendChild(errorDiv);
      scrollToBottom();
    } finally {
      isSending = false;
    }
  }

  // Түймелер әрекеттері
  sendBtn.onclick = () => sendMessage();

  userInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick action pills
  container.querySelectorAll('.quick-action-pill').forEach(btn => {
    btn.onclick = () => {
      const mode = btn.getAttribute('data-mode');
      const prompt = btn.getAttribute('data-prompt');
      activeMode = mode;
      sendMessage(prompt, mode);
    };
  });

  // Тарихты тазалау
  if (clearBtn) {
    clearBtn.onclick = async () => {
      if (confirm('Сұхбат тарихын тазартқыңыз келе ме?')) {
        try {
          await api.clearAiHistory(currentSessionId);
          currentSessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          messagesScroll.innerHTML = `
            <div class="assistant-msg" style="display:flex; gap:14px; align-items:flex-start; max-width:85%;">
              <div style="flex-shrink:0;">
                ${generateMascotSvg(currentCharacter, 'happy', 44)}
              </div>
              <div style="background:#fff; border:1.5px solid #e2e8f0; border-radius:4px 18px 18px 18px; padding:16px 20px;">
                <div style="font-weight:900; font-size:13.5px; color:#166534; margin-bottom:4px;">Кітап Досы</div>
                <div style="font-size:14px; color:#1e293b;">
                  Сұхбат тарихы тазартылды! Жаңа тақырып бойынша не білгің келеді? 📚
                </div>
              </div>
            </div>
          `;
          showToast('Тарих сәтті тазартылды', 'info');
        } catch (err) {
          showToast('Қате: ' + err.message, 'error');
        }
      }
    };
  }

  // Мұғалім AI баптаулары модалі
  if (settingsBtn) {
    settingsBtn.onclick = () => openAiSettingsModal(container);
  }
  if (bannerSettingsBtn) {
    bannerSettingsBtn.onclick = () => openAiSettingsModal(container);
  }
}

/**
 * Мұғалім мен Әкімшіге арналған Gemini AI баптаулары мен тестілеу терезесі
 */
async function openAiSettingsModal(parentContainer) {
  try {
    const configRes = await api.getAiConfig();

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px 16px; border-radius:10px; font-size:13px; color:#166534;">
          🦉 <strong>Google Gemini AI API интеграциясы:</strong><br>
          API кілті серверде қауіпсіз шифрланып сақталады және оқушыларға ешқашан көрсетілмейді.
        </div>

        <div>
          <label style="font-size:13px; font-weight:700; color:#334155; display:block; margin-bottom:4px;">
            Жасанды Интеллект Провайдері:
          </label>
          <select id="cfg-ai-provider" class="form-control" style="width:100%; font-size:14px; padding:8px 12px; border-radius:8px;">
            <option value="gemini" selected>Google Gemini (Ресми API)</option>
          </select>
        </div>

        <div>
          <label style="font-size:13px; font-weight:700; color:#334155; display:block; margin-bottom:4px;">
            Gemini Моделі:
          </label>
          <select id="cfg-ai-model" class="form-control" style="width:100%; font-size:14px; padding:8px 12px; border-radius:8px;">
            <option value="gemini-2.0-flash" ${configRes.model === 'gemini-2.0-flash' ? 'selected' : ''}>gemini-2.0-flash (Ұсынылатын: ең жылдам және дәл)</option>
            <option value="gemini-1.5-flash" ${configRes.model === 'gemini-1.5-flash' ? 'selected' : ''}>gemini-1.5-flash (Оңтайландырылған)</option>
            <option value="gemini-1.5-pro" ${configRes.model === 'gemini-1.5-pro' ? 'selected' : ''}>gemini-1.5-pro (Терең талдау үшін)</option>
          </select>
        </div>

        <div>
          <label style="font-size:13px; font-weight:700; color:#334155; display:block; margin-bottom:4px;">
            Gemini API Кілті (Google AI Studio):
          </label>
          <div style="display:flex; gap:8px;">
            <input type="password" id="cfg-ai-apikey" class="form-control" placeholder="${configRes.apiKeyMasked ? `Қазіргі кілт: ${configRes.apiKeyMasked}` : 'AIzaSy... кілтін осында қойыңыз'}" style="flex:1; font-size:14px; padding:8px 12px; border-radius:8px;">
            <button class="btn btn-secondary btn-sm" id="btn-toggle-key-visibility" type="button">👁️</button>
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:4px;">
            ${configRes.hasKey ? `✅ Қазіргі сақталған кілт: <code>${configRes.apiKeyMasked}</code> (${configRes.source === 'env' ? 'орта айнымалысы' : 'деректер базасы'})` : '⚠️ Әзірге API кілті енгізілмеген'}
          </div>
        </div>

        <div>
          <label style="font-size:13px; font-weight:700; color:#334155; display:block; margin-bottom:4px;">
            Шығармашылық деңгейі (Temperature: <span id="temp-val">${configRes.temperature ?? 0.7}</span>):
          </label>
          <input type="range" id="cfg-ai-temp" min="0" max="1" step="0.1" value="${configRes.temperature ?? 0.7}" style="width:100%;">
          <div style="display:flex; justify-content:space-between; font-size:11px; color:#94a3b8;">
            <span>0.0 (Нақты деректер)</span>
            <span>0.7 (Оңтайлы)</span>
            <span>1.0 (Еркін шығармашылық)</span>
          </div>
        </div>

        <!-- Тікелей байланысты тексеру блогы -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:13px; font-weight:700; color:#334155;">⚡ Байланысты тексеру (Ping Test):</span>
            <button class="btn btn-secondary btn-sm" id="btn-test-ai-connection" type="button" style="font-weight:700;">
              🔌 Тексеру (Test API)
            </button>
          </div>
          <div id="test-connection-result" style="margin-top:8px; font-size:12px; display:none;"></div>
        </div>
      </div>
    `;

    openModal({
      title: '⚙️ Жасанды Интеллект (Gemini AI) Баптаулары',
      bodyHtml,
      saveText: '💾 Баптауларды сақтау',
      onSave: async (modalEl) => {
        const provider = modalEl.querySelector('#cfg-ai-provider').value;
        const model = modalEl.querySelector('#cfg-ai-model').value;
        const apiKey = modalEl.querySelector('#cfg-ai-apikey').value.trim();
        const temperature = Number(modalEl.querySelector('#cfg-ai-temp').value);

        try {
          const payload = { provider, model, temperature };
          if (apiKey) payload.apiKey = apiKey;

          const res = await api.saveAiConfig(payload);
          showToast('AI баптаулары сәтті жаңартылды!', 'success');
          // Reload view
          renderAiAssistantView(parentContainer);
          return true;
        } catch (err) {
          showToast('Сақтау қатесі: ' + err.message, 'error');
          return false;
        }
      }
    });

    // Modal ішіндегі оқиғалар
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    // Toggle visibility
    const keyInput = modalRoot.querySelector('#cfg-ai-apikey');
    const toggleBtn = modalRoot.querySelector('#btn-toggle-key-visibility');
    if (toggleBtn && keyInput) {
      toggleBtn.onclick = () => {
        keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
      };
    }

    // Temperature slider display
    const tempInput = modalRoot.querySelector('#cfg-ai-temp');
    const tempVal = modalRoot.querySelector('#temp-val');
    if (tempInput && tempVal) {
      tempInput.oninput = () => {
        tempVal.textContent = tempInput.value;
      };
    }

    // Live test connection
    const testBtn = modalRoot.querySelector('#btn-test-ai-connection');
    const testResult = modalRoot.querySelector('#test-connection-result');
    if (testBtn && testResult) {
      testBtn.onclick = async () => {
        const keyVal = keyInput.value.trim();
        const modelVal = modalRoot.querySelector('#cfg-ai-model').value;

        testBtn.disabled = true;
        testBtn.textContent = '⏳ Тексерілуде...';
        testResult.style.display = 'block';
        testResult.style.color = '#64748b';
        testResult.textContent = 'Gemini API серверіне сұраныс жіберілуде...';

        try {
          const res = await api.testAiConnection({
            apiKey: keyVal || undefined,
            model: modelVal
          });

          if (res.ok) {
            testResult.style.color = '#15803d';
            testResult.innerHTML = `
              ✅ <strong>Байланыс сәтті!</strong> Уақыт: <strong>${res.latencyMs} мс</strong> (${res.model})<br>
              <em style="color:#334155;">«${escapeHtml(res.reply)}»</em>
            `;
          } else {
            testResult.style.color = '#b91c1c';
            testResult.innerHTML = `❌ <strong>Қате:</strong> ${escapeHtml(res.error || 'Байланыс орнатылмады')}`;
          }
        } catch (err) {
          testResult.style.color = '#b91c1c';
          testResult.innerHTML = `❌ <strong>Қате:</strong> ${escapeHtml(err.message)}`;
        } finally {
          testBtn.disabled = false;
          testBtn.textContent = '🔌 Қайта тексеру';
        }
      };
    }

  } catch (err) {
    showToast('Баптауларды жүктеу мүмкін болмады: ' + err.message, 'error');
  }
}
