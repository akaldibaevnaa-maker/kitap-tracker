/**
 * KitapTracker — Жетінші кезең: AI BOOK ASSISTANT (Жасанды интеллект кітап көмекшісі)
 * 🦉 «Кітап Досы»
 */
import {
  AI_MODES,
  BASE_SYSTEM_PROMPT,
  getAiConfig,
  maskApiKey,
  buildStudentContext,
  buildModePrompt,
  callGeminiApi
} from '../lib/ai.js';
import { fail, nowIso, V } from '../lib/util.js';
import { award } from '../lib/xp.js';

export default function registerAi(router, db) {
  /**
   * AI күйі мен дайындығын тексеру (барлық рөлдер үшін)
   */
  router.get('/api/ai/status', 'any', async () => {
    const cfg = getAiConfig(db);
    return {
      ok: true,
      configured: cfg.configured,
      provider: cfg.provider,
      model: cfg.model,
      source: cfg.source,
      hasKey: Boolean(cfg.apiKey)
    };
  });

  /**
   * Қолжетімді режимдер тізімі
   */
  router.get('/api/ai/modes', 'any', async () => {
    return {
      ok: true,
      modes: Object.values(AI_MODES)
    };
  });

  /**
   * Мұғалім / Әкімші үшін толық баптауларды алу (API кілті бүркемеленген)
   */
  router.get('/api/ai/config', ['teacher', 'admin'], async () => {
    const cfg = getAiConfig(db);
    return {
      ok: true,
      provider: cfg.provider,
      model: cfg.model,
      apiKeyMasked: maskApiKey(cfg.apiKey),
      hasKey: Boolean(cfg.apiKey),
      configured: cfg.configured,
      source: cfg.source,
      temperature: cfg.temperature,
      systemPrompt: cfg.systemPrompt,
      updatedAt: cfg.updatedAt
    };
  });

  /**
   * Мұғалім / Әкімші тарапынан AI баптауларын сақтау
   */
  router.post('/api/ai/config', ['teacher', 'admin'], async ({ body }) => {
    const provider = String(body.provider || 'gemini').trim();
    const model = String(body.model || 'gemini-2.0-flash').trim();
    const temperature = body.temperature !== undefined ? Math.max(0, Math.min(2, Number(body.temperature))) : 0.7;
    const systemPrompt = body.systemPrompt ? String(body.systemPrompt).trim() : null;
    const now = nowIso();

    const currentCfg = db.get('SELECT * FROM ai_config WHERE id = 1');
    let apiKey = currentCfg?.api_key || null;

    if (body.apiKey !== undefined) {
      const cleanKey = String(body.apiKey).trim();
      if (cleanKey.length > 0) {
        apiKey = cleanKey;
      } else if (body.clearKey) {
        apiKey = null;
      }
    }

    if (currentCfg) {
      db.run(`
        UPDATE ai_config
        SET provider = ?, model = ?, api_key = ?, system_prompt = ?, temperature = ?, updated_at = ?
        WHERE id = 1
      `, provider, model, apiKey, systemPrompt, temperature, now);
    } else {
      db.run(`
        INSERT INTO ai_config(id, provider, model, api_key, system_prompt, temperature, is_active, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, 1, ?)
      `, provider, model, apiKey, systemPrompt, temperature, now);
    }

    const updated = getAiConfig(db);
    return {
      ok: true,
      message: 'AI баптаулары сәтті сақталды!',
      configured: updated.configured,
      apiKeyMasked: maskApiKey(updated.apiKey),
      model: updated.model,
      source: updated.source
    };
  });

  /**
   * Мұғалім / Әкімші үшін байланысты және API кілтін тікелей тексеру
   */
  router.post('/api/ai/test', ['teacher', 'admin'], async ({ body }) => {
    const cfg = getAiConfig(db);
    const apiKey = (body.apiKey && String(body.apiKey).trim()) || cfg.apiKey;
    const model = (body.model && String(body.model).trim()) || cfg.model;

    if (!apiKey) {
      fail(400, 'api_key_required', { message: 'Тексеру үшін Gemini API кілтін енгізіңіз немесе жүйеге сақтаңыз.' });
    }

    const t0 = Date.now();
    try {
      const result = await callGeminiApi({
        apiKey,
        model,
        systemInstruction: 'Сен — «Kitap Tracker» жүйесінің көмекшісісің. 1 қысқа сөйлеммен сәлемдес.',
        contents: [
          { role: 'user', parts: [{ text: 'Сәлем! «Кітап Досы» байланысы қалай?' }] }
        ],
        temperature: 0.5
      });
      const latencyMs = Date.now() - t0;

      return {
        ok: true,
        latencyMs,
        reply: result.text,
        model: result.model
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message || 'Gemini API-мен байланысу кезінде қате орын алды.',
        status: err.status || 500
      };
    }
  });

  /**
   * Оқушы мен мұғалімге арналған AI көмекшісімен сұхбат (негізгі орталық)
   */
  router.post('/api/ai/assist', 'any', async ({ user, body }) => {
    const cfg = getAiConfig(db);

    // ҚАТАҢ ТАЛАП: Егер API кілті қосылмаған болса, ешқандай жалған жауап қайтармау!
    if (!cfg.configured) {
      fail(400, 'ai_not_configured', { message: 'Жасанды интеллект API кілті орнатылмаған. Мұғалім немесе әкімші баптаулар бөлімінде Gemini API кілтін қосуы қажет.' });
    }

    const mode = (body.mode && AI_MODES[body.mode]) ? body.mode : 'chat';
    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
    const bookId = body.bookId ? Number(body.bookId) : null;
    let sessionId = body.sessionId ? String(body.sessionId).trim() : '';

    if (!sessionId) {
      sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    let bookInfo = null;
    if (bookId) {
      bookInfo = db.get('SELECT id, title, author, total_pages, genre, description FROM books WHERE id = ?', bookId);
    }

    // Оқушы контексі мен сұраныс нұсқаулығын жинау
    const studentContext = buildStudentContext(db, user, bookId);
    const modeInstruction = buildModePrompt(mode, rawMessage || AI_MODES[mode].label, bookInfo);

    // Бұрынғы сұхбат тарихын алу (соңғы 6 хабарлама)
    const historyRows = db.all(`
      SELECT role, content 
      FROM ai_chat_history 
      WHERE user_id = ? AND session_id = ? 
      ORDER BY id DESC LIMIT 6
    `, user.id, sessionId);

    const historyReversed = historyRows.reverse();

    // Gemini contents массивін жинақтау
    const contents = [];

    // Өткен сұхбат тарихын қосу
    for (const h of historyReversed) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    }

    // Ағымдағы қадам
    const currentTurnPrompt = `${studentContext}\n\n${modeInstruction}`;
    contents.push({
      role: 'user',
      parts: [{ text: currentTurnPrompt }]
    });

    // Gemini API шақыру
    let result;
    try {
      result = await callGeminiApi({
        apiKey: cfg.apiKey,
        model: cfg.model,
        systemInstruction: cfg.systemPrompt || BASE_SYSTEM_PROMPT,
        contents,
        temperature: cfg.temperature
      });
    } catch (err) {
      fail(502, 'ai_service_error', { message: `AI көмекшісімен байланыс қатесі: ${err.message}` });
    }

    const now = nowIso();

    // Сұхбат тарихын сақтау
    const userTextToSave = rawMessage || `${AI_MODES[mode].label}: ${bookInfo ? `«${bookInfo.title}»` : ''}`;
    db.run(`
      INSERT INTO ai_chat_history(user_id, book_id, session_id, mode, role, content, created_at)
      VALUES (?, ?, ?, ?, 'user', ?, ?)
    `, user.id, bookId, sessionId, mode, userTextToSave, now);

    db.run(`
      INSERT INTO ai_chat_history(user_id, book_id, session_id, mode, role, content, created_at)
      VALUES (?, ?, ?, ?, 'assistant', ?, ?)
    `, user.id, bookId, sessionId, mode, result.text, now);

    // Оқушыға ізденісі үшін XP беру (күніне ең көп 3 рет, әрқайсысына 5 XP)
    let xpGiven = 0;
    if (user.role === 'student') {
      const today = now.slice(0, 10);
      const countToday = db.get(`
        SELECT COUNT(*) AS c FROM ai_chat_history
        WHERE user_id = ? AND role = 'user' AND created_at LIKE ?
      `, user.id, `${today}%`)?.c || 0;

      if (countToday <= 3) {
        award(db, user.id, 5, 'ai_consultation', bookId);
        xpGiven = 5;
      }
    }

    return {
      ok: true,
      reply: result.text,
      sessionId,
      mode,
      bookId,
      xpAwarded: xpGiven
    };
  });

  /**
   * Сұхбат тарихын қарау
   */
  router.get('/api/ai/history', 'any', async ({ user, query }) => {
    const sessionId = query.sessionId ? String(query.sessionId).trim() : null;
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 30));

    let rows;
    if (sessionId) {
      rows = db.all(`
        SELECT id, book_id, session_id, mode, role, content, created_at
        FROM ai_chat_history
        WHERE user_id = ? AND session_id = ?
        ORDER BY id ASC LIMIT ?
      `, user.id, sessionId, limit);
    } else {
      rows = db.all(`
        SELECT id, book_id, session_id, mode, role, content, created_at
        FROM ai_chat_history
        WHERE user_id = ?
        ORDER BY id ASC LIMIT ?
      `, user.id, limit);
    }

    return {
      ok: true,
      messages: rows
    };
  });

  /**
   * Сұхбат тарихын тазалау
   */
  router.delete('/api/ai/history', 'any', async ({ user, query, body }) => {
    const sessionId = (query?.sessionId || body?.sessionId) ? String(query.sessionId || body.sessionId).trim() : null;
    if (sessionId) {
      db.run('DELETE FROM ai_chat_history WHERE user_id = ? AND session_id = ?', user.id, sessionId);
    } else {
      db.run('DELETE FROM ai_chat_history WHERE user_id = ?', user.id);
    }
    return { ok: true, message: 'Сұхбат тарихы тазартылды.' };
  });
}
