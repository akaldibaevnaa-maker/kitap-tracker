/**
 * KitapTracker — 3D Cartoon Mascot: "Kitap dos" (Reading Buddy)
 * Түлкі (Fox) және Үкі (Owl) маскоттары, 5 түрлі көңіл-күй (emotional states):
 * - happy (қуанышты)
 * - excited (шабыттанған)
 * - thinking (ойланып тұрған)
 * - reading (кітап оқып отырған)
 * - celebrating (марапаттап жатқан)
 */

export function generateMascotSvg(character = 'fox', emotion = 'happy', size = 120) {
  const isFox = character !== 'owl';
  const width = size;
  const height = size;

  if (isFox) {
    return generateFoxSvg(emotion, width, height);
  } else {
    return generateOwlSvg(emotion, width, height);
  }
}

/**
 * 3D Cartoon Fox Mascot (Балаларға арналған сүйкімді 3D Түлкі)
 */
function generateFoxSvg(emotion, w, h) {
  // Түстер
  const orangeDark = '#c2410c';
  const orangeMain = '#ea580c';
  const orangeLight = '#fb923c';
  const cream = '#fffbeb';
  const nose = '#1e293b';
  const eye = '#0f172a';

  // Көңіл-күйге байланысты элементтер
  let eyesSvg = '';
  let mouthSvg = '';
  let extrasSvg = '';
  let armsSvg = '';

  if (emotion === 'happy') {
    // Жымиып тұрған көздер мен күлкі
    eyesSvg = `
      <path d="M42 56 Q50 50 58 56" stroke="${eye}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M72 56 Q80 50 88 56" stroke="${eye}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <circle cx="38" cy="62" r="5" fill="#fca5a5" opacity="0.6"/>
      <circle cx="92" cy="62" r="5" fill="#fca5a5" opacity="0.6"/>
    `;
    mouthSvg = `<path d="M60 70 Q65 76 70 70" stroke="${nose}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    armsSvg = `
      <!-- Оң қолда кітап ұстаған -->
      <path d="M40 92 Q32 102 46 108" stroke="${orangeMain}" stroke-width="8" stroke-linecap="round" fill="none"/>
      <!-- Ашық кітап -->
      <g transform="translate(48, 86)">
        <polygon points="0,18 16,12 32,18 32,32 16,26 0,32" fill="#238451" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"/>
        <polygon points="2,17 16,13 16,25 2,29" fill="#FFF8E9"/>
        <polygon points="16,13 30,17 30,29 16,25" fill="#FFF8E9"/>
        <line x1="16" y1="13" x2="16" y2="25" stroke="#E8B95C" stroke-width="1.5"/>
      </g>
    `;
    extrasSvg = `
      <!-- Жұлдызша ұшқыны -->
      <polygon points="98,30 100,35 105,36 101,40 102,45 98,42 94,45 95,40 91,36 96,35" fill="#FFD36A"/>
    `;
  } else if (emotion === 'excited') {
    // Үлкен дөңгелек қуанышты көздер мен ашық ауыз
    eyesSvg = `
      <ellipse cx="48" cy="54" rx="7" ry="9" fill="${eye}"/>
      <circle cx="46" cy="50" r="3" fill="#ffffff"/>
      <ellipse cx="82" cy="54" rx="7" ry="9" fill="${eye}"/>
      <circle cx="80" cy="50" r="3" fill="#ffffff"/>
      <circle cx="36" cy="62" r="6" fill="#f87171" opacity="0.6"/>
      <circle cx="94" cy="62" r="6" fill="#f87171" opacity="0.6"/>
    `;
    mouthSvg = `
      <path d="M57 68 Q65 82 73 68 Z" fill="#b91c1c"/>
      <path d="M60 74 Q65 79 70 74" fill="#f87171"/>
    `;
    armsSvg = `
      <!-- Екі қолы жоғары көтерілген -->
      <path d="M36 84 Q22 72 26 60" stroke="${orangeMain}" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M94 84 Q108 72 104 60" stroke="${orangeMain}" stroke-width="8" stroke-linecap="round" fill="none"/>
    `;
    extrasSvg = `
      <circle cx="20" cy="45" r="4" fill="#FFD36A"/>
      <circle cx="110" cy="45" r="5" fill="#FF9D8A"/>
      <polygon points="65,12 68,18 74,19 70,23 71,29 65,26 59,29 60,23 56,19 62,18" fill="#FFD36A"/>
    `;
  } else if (emotion === 'thinking') {
    // Ойланып қараған көздер мен шамшырақ
    eyesSvg = `
      <ellipse cx="48" cy="50" rx="6" ry="7" fill="${eye}"/>
      <circle cx="50" cy="48" r="2.5" fill="#ffffff"/>
      <ellipse cx="82" cy="50" rx="6" ry="7" fill="${eye}"/>
      <circle cx="84" cy="48" r="2.5" fill="#ffffff"/>
      <path d="M42 42 Q48 40 54 44" stroke="${orangeDark}" stroke-width="2.5" fill="none"/>
      <path d="M76 44 Q82 40 88 42" stroke="${orangeDark}" stroke-width="2.5" fill="none"/>
    `;
    mouthSvg = `<path d="M62 72 Q66 70 70 73" stroke="${nose}" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
    armsSvg = `
      <!-- Бір қолы иегінде ойланып тұр -->
      <path d="M44 92 Q50 96 60 82" stroke="${orangeMain}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <circle cx="60" cy="80" r="4.5" fill="${cream}"/>
    `;
    extrasSvg = `
      <!-- Ой лампочкасы (Lightbulb) -->
      <g transform="translate(86, 12)">
        <ellipse cx="14" cy="14" rx="9" ry="11" fill="#FFD36A" filter="drop-shadow(0 0 6px rgba(255,211,106,0.8))"/>
        <rect x="11" y="23" width="6" height="4" fill="#64748b" rx="1"/>
        <line x1="14" y1="2" x2="14" y2="0" stroke="#FFD36A" stroke-width="2"/>
        <line x1="25" y1="8" x2="28" y2="6" stroke="#FFD36A" stroke-width="2"/>
        <line x1="3" y1="8" x2="0" y2="6" stroke="#FFD36A" stroke-width="2"/>
      </g>
    `;
  } else if (emotion === 'reading') {
    // Көзәйнек киіп кітап оқып отырған
    eyesSvg = `
      <!-- Сүйкімді көзәйнек -->
      <circle cx="48" cy="54" r="10" stroke="#0284c7" stroke-width="3" fill="rgba(169, 221, 245, 0.4)"/>
      <circle cx="82" cy="54" r="10" stroke="#0284c7" stroke-width="3" fill="rgba(169, 221, 245, 0.4)"/>
      <line x1="58" y1="54" x2="72" y2="54" stroke="#0284c7" stroke-width="2.5"/>
      <circle cx="48" cy="56" r="3.5" fill="${eye}"/>
      <circle cx="82" cy="56" r="3.5" fill="${eye}"/>
    `;
    mouthSvg = `<path d="M62 70 Q65 74 68 70" stroke="${nose}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    armsSvg = `
      <!-- Үлкен кітапты екі қолымен ұстаған -->
      <g transform="translate(34, 76)">
        <polygon points="0,20 30,12 60,20 60,40 30,32 0,40" fill="#176B4D" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.25))"/>
        <polygon points="3,19 30,13 30,31 3,37" fill="#FFF8E9"/>
        <polygon points="30,13 57,19 57,37 30,31" fill="#FFF8E9"/>
        <line x1="30" y1="13" x2="30" y2="31" stroke="#E8B95C" stroke-width="2"/>
      </g>
    `;
    extrasSvg = `
      <circle cx="30" cy="80" r="5" fill="${orangeLight}"/>
      <circle cx="98" cy="80" r="5" fill="${orangeLight}"/>
    `;
  } else if (emotion === 'celebrating') {
    // Алтын тәж немесе мерекелік қалпақ, кубок
    eyesSvg = `
      <path d="M42 54 Q50 48 58 54" stroke="${eye}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M72 54 Q80 48 88 54" stroke="${eye}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <circle cx="36" cy="60" r="6" fill="#f43f5e" opacity="0.6"/>
      <circle cx="94" cy="60" r="6" fill="#f43f5e" opacity="0.6"/>
    `;
    mouthSvg = `
      <path d="M57 66 Q65 80 73 66 Z" fill="#dc2626"/>
    `;
    armsSvg = `
      <!-- Алтын кубок ұстаған -->
      <g transform="translate(48, 76)">
        <path d="M8 8 L24 8 L22 22 Q16 26 10 22 Z" fill="#FFD36A" stroke="#b45309" stroke-width="1.5"/>
        <path d="M6 10 Q0 14 6 18" stroke="#FFD36A" stroke-width="2" fill="none"/>
        <path d="M26 10 Q32 14 26 18" stroke="#FFD36A" stroke-width="2" fill="none"/>
        <rect x="14" y="24" width="4" height="6" fill="#b45309"/>
        <rect x="10" y="30" width="12" height="4" rx="1" fill="#FFD36A"/>
      </g>
    `;
    extrasSvg = `
      <!-- Алтын тәж (Crown) -->
      <polygon points="52,26 56,12 65,22 74,12 78,26" fill="#FFD36A" stroke="#d97706" stroke-width="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"/>
      <circle cx="56" cy="12" r="2" fill="#ef4444"/>
      <circle cx="65" cy="22" r="2.5" fill="#3b82f6"/>
      <circle cx="74" cy="12" r="2" fill="#ef4444"/>
      <!-- Отшашу ұшқындары -->
      <circle cx="24" cy="28" r="3" fill="#ec4899"/>
      <circle cx="106" cy="28" r="3.5" fill="#3b82f6"/>
      <polygon points="100,60 102,64 106,65 103,68 104,72 100,70 96,72 97,68 94,65 98,64" fill="#FFD36A"/>
    `;
  }

  return `
    <svg viewBox="0 0 130 130" width="${w}" height="${h}" class="mascot-svg-figure" style="filter: drop-shadow(0 8px 16px rgba(35, 132, 81, 0.22)); overflow:visible;">
      <defs>
        <radialGradient id="foxBodyGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fb923c"/>
          <stop offset="70%" stop-color="#ea580c"/>
          <stop offset="100%" stop-color="#c2410c"/>
        </radialGradient>
        <radialGradient id="foxBellyGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#FFF8E9"/>
        </radialGradient>
      </defs>

      <!-- Құйрығы (Fluffy 3D tail) -->
      <g>
        <path d="M88 88 Q118 78 122 56 Q124 38 106 44 Q90 50 82 72 Z" fill="url(#foxBodyGrad)"/>
        <!-- Ақ ұшы -->
        <path d="M122 56 Q124 38 106 44 Q114 52 118 64 Z" fill="#ffffff"/>
      </g>

      <!-- Денесі (Round 3D body) -->
      <ellipse cx="65" cy="94" rx="28" ry="24" fill="url(#foxBodyGrad)"/>
      <ellipse cx="65" cy="95" rx="17" ry="16" fill="url(#foxBellyGrad)"/>

      <!-- Құлақтары (Ears with Kazakh ornament motif) -->
      <polygon points="34,42 42,12 60,34" fill="url(#foxBodyGrad)"/>
      <polygon points="38,38 44,18 56,32" fill="#fed7aa"/>
      <polygon points="96,42 88,12 70,34" fill="url(#foxBodyGrad)"/>
      <polygon points="92,38 86,18 74,32" fill="#fed7aa"/>

      <!-- Басы (Cute round 3D head) -->
      <ellipse cx="65" cy="58" rx="34" ry="28" fill="url(#foxBodyGrad)"/>

      <!-- Беттегі ақ бөліктер (Cheeks) -->
      <path d="M36 62 Q52 76 65 74 Q78 76 94 62 Q86 82 65 82 Q44 82 36 62 Z" fill="url(#foxBellyGrad)"/>

      <!-- Мұрны (Button nose) -->
      <ellipse cx="65" cy="66" rx="4.5" ry="3.5" fill="${nose}"/>
      <circle cx="64" cy="65" r="1.2" fill="#ffffff"/>

      <!-- Көздері мен аузы (Expressions) -->
      ${eyesSvg}
      ${mouthSvg}

      <!-- Қолдары мен заттары -->
      ${armsSvg}

      <!-- Экстра әсерлер (шамшырақ, жұлдыз, тәж, т.б.) -->
      ${extrasSvg}
    </svg>
  `;
}

/**
 * 3D Cartoon Owl Mascot (Данагөй сүйкімді 3D Үкі)
 */
function generateOwlSvg(emotion, w, h) {
  const purpleMain = '#7c3aed';
  const purpleLight = '#a78bfa';
  const cream = '#fef3c7';

  return `
    <svg viewBox="0 0 130 130" width="${w}" height="${h}" class="mascot-svg-figure" style="filter: drop-shadow(0 8px 16px rgba(124, 58, 237, 0.22)); overflow:visible;">
      <defs>
        <radialGradient id="owlBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="${purpleLight}"/>
          <stop offset="100%" stop-color="${purpleMain}"/>
        </radialGradient>
      </defs>
      <!-- Қауырсын құлақтары -->
      <polygon points="36,36 44,14 58,32" fill="${purpleMain}"/>
      <polygon points="94,36 86,14 72,32" fill="${purpleMain}"/>

      <!-- Денесі мен басы біртұтас жұмсақ сопақ -->
      <ellipse cx="65" cy="68" rx="36" ry="42" fill="url(#owlBody)"/>
      <ellipse cx="65" cy="74" rx="22" ry="26" fill="${cream}"/>

      <!-- Үлкен дана көздер -->
      <circle cx="48" cy="54" r="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="82" cy="54" r="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="48" cy="54" r="7" fill="#1e1b4b"/>
      <circle cx="82" cy="54" r="7" fill="#1e1b4b"/>
      <circle cx="46" cy="51" r="3" fill="#ffffff"/>
      <circle cx="80" cy="51" r="3" fill="#ffffff"/>

      <!-- Тұмсығы -->
      <polygon points="65,62 60,70 70,70" fill="#f59e0b"/>

      <!-- Қанаттарындағы кітап -->
      <g transform="translate(42, 82)">
        <polygon points="0,16 23,10 46,16 46,30 23,24 0,30" fill="#238451"/>
        <polygon points="3,15 23,11 23,23 3,27" fill="#FFF8E9"/>
        <polygon points="23,11 43,15 43,27 23,23" fill="#FFF8E9"/>
      </g>
    </svg>
  `;
}

/**
 * Интерактивті Reading Buddy виджетін генерациялау
 */
export function renderMascotWidget({
  character = 'fox',
  emotion = 'happy',
  quote = 'Кітап — білім бұлағы! Бүгін 15 минут оқып, ағашыңды өсір!',
  ctaText = 'Оқуды бастау 🚀',
  ctaLink = '#/shelf',
  size = 110
}) {
  return `
    <div class="reading-buddy-widget" style="display:flex; align-items:center; gap:18px; background:linear-gradient(135deg, #ffffff 0%, #FFF8E9 100%); border:2px solid #FFD36A; border-radius:var(--radius-lg); padding:16px 20px; box-shadow:0 8px 24px rgba(255, 211, 106, 0.25); position:relative; overflow:visible;">
      <!-- Маскот бейнесі -->
      <div class="mascot-avatar-container" style="flex-shrink:0; position:relative; cursor:pointer;" title="Мені бас — көңіл-күйімді жаңартайын!">
        ${generateMascotSvg(character, emotion, size)}
      </div>

      <!-- Сөйлеу көпіршігі (Speech Bubble) -->
      <div class="mascot-speech-bubble" style="flex:1; position:relative; background:#ffffff; border:1.5px solid #FFD36A; border-radius:16px; padding:12px 18px; box-shadow:0 4px 12px rgba(38, 55, 70, 0.06);">
        <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:#d97706; letter-spacing:0.5px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
          <span>🦊</span> <span>Kitap Dos · Сенің оқырман досың</span>
        </div>
        <p style="margin:0 0 10px 0; font-size:13.5px; font-weight:600; color:var(--text-main); line-height:1.4;">
          ${quote}
        </p>
        ${ctaText ? `
          <a href="${ctaLink}" class="btn-3d btn-3d-yellow" style="padding:6px 14px; font-size:12px; border-radius:12px; font-weight:800;">
            ${ctaText}
          </a>
        ` : ''}
      </div>
    </div>
  `;
}
