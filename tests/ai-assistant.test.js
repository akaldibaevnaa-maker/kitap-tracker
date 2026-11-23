import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { maskApiKey, buildStudentContext, buildModePrompt } from '../server/lib/ai.js';

test('KitapTracker — Жетінші кезең: AI BOOK ASSISTANT (Жасанды интеллект кітап көмекшісі) сынағы', async (t) => {
  const { server, db } = createApp({ dbPath: ':memory:' });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
    db.close();
  });

  const headers = (cookie = null) => ({
    'Content-Type': 'application/json',
    'x-kt': '1',
    ...(cookie ? { Cookie: cookie } : {})
  });

  // Оқушы және мұғалім тіркелу / кіру
  const studentLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ role: 'student' })
  });
  assert.equal(studentLoginRes.status, 200);
  const studentCookie = studentLoginRes.headers.get('set-cookie').split(';')[0];
  const studentData = await studentLoginRes.json();
  const student = studentData.user;

  const teacherLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ role: 'teacher' })
  });
  assert.equal(teacherLoginRes.status, 200);
  const teacherCookie = teacherLoginRes.headers.get('set-cookie').split(';')[0];

  // =========================================================================
  // 1. AI STATUS ЖӘНЕ РЕЖИМДЕР ТІЗІМІ
  // =========================================================================
  await t.test('1.1. AI күйі мен режимдерін тексеру', async () => {
    const res = await fetch(`${baseUrl}/api/ai/status`, { headers: headers(studentCookie) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(typeof data.configured, 'boolean');
    assert.equal(data.provider, 'gemini');

    const modesRes = await fetch(`${baseUrl}/api/ai/modes`, { headers: headers(studentCookie) });
    assert.equal(modesRes.status, 200);
    const modesData = await modesRes.json();
    assert.ok(Array.isArray(modesData.modes));
    assert.ok(modesData.modes.length >= 8, 'Кемінде 8 арнайы режим болуы тиіс');

    const modeIds = modesData.modes.map(m => m.id);
    assert.ok(modeIds.includes('recommend'), 'Жасқа сай ұсыну режимі бар');
    assert.ok(modeIds.includes('interest_recommend'), 'Қызығушылыққа сай ұсыну режимі бар');
    assert.ok(modeIds.includes('questions'), 'Мазмұндық сұрақтар режимі бар');
    assert.ok(modeIds.includes('character'), 'Кейіпкерді талдау режимі бар');
    assert.ok(modeIds.includes('theme'), 'Негізгі идеяны түсіндіру режимі бар');
    assert.ok(modeIds.includes('review_help'), 'Пікір жазу көмегі режимі бар');
    assert.ok(modeIds.includes('plan'), 'Жеке оқу жоспары режимі бар');
    assert.ok(modeIds.includes('activity_advice'), 'Белсенділік кеңесі режимі бар');
  });

  // =========================================================================
  // 2. ҚАТАҢ ТАЛАП: API КІЛТІ ЖОҚ КЕЗДЕ СИМУЛЯЦИЯЛЫҚ ЖАЛҒАН AI БЕРІЛМЕЙДІ
  // =========================================================================
  await t.test('2.1. API кілті болмағанда fake AI жауап берілмейді, 400 ai_not_configured қайтарады', async () => {
    // Деректер базасында кілт жоқ екеніне көз жеткіземіз
    db.run('UPDATE ai_config SET api_key = NULL WHERE id = 1');

    const res = await fetch(`${baseUrl}/api/ai/assist`, {
      method: 'POST',
      headers: headers(studentCookie),
      body: JSON.stringify({
        message: 'Маған бір кітап ұсыншы',
        mode: 'recommend'
      })
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'ai_not_configured');
    assert.ok(data.message.includes('API кілті орнатылмаған'), 'Түсінікті қазақша қате хабарламасы бар');
  });

  // =========================================================================
  // 3. ҚАУІПСІЗДІК ЖӘНЕ БАПТАУЛАР (TEACHER / ADMIN)
  // =========================================================================
  await t.test('3.1. Оқушы баптауларға рұқсат ала алмайды (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/ai/config`, { headers: headers(studentCookie) });
    assert.equal(res.status, 403);
  });

  await t.test('3.2. Мұғалім баптауларды қарап, кілтті бүркемеленген түрде көреді', async () => {
    const res = await fetch(`${baseUrl}/api/ai/config`, { headers: headers(teacherCookie) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.provider, 'gemini');
  });

  await t.test('3.3. Мұғалім жаңа Gemini API кілті мен баптауларын сәтті сақтайды', async () => {
    const saveRes = await fetch(`${baseUrl}/api/ai/config`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        apiKey: 'AIzaSyDemoFakeTestKey1234567890ABCDEF',
        model: 'gemini-2.0-flash',
        temperature: 0.8
      })
    });

    assert.equal(saveRes.status, 200);
    const saveData = await saveRes.json();
    assert.equal(saveData.ok, true);
    assert.equal(saveData.configured, true);
    assert.ok(saveData.apiKeyMasked.includes('...'), 'Кілт бүркемеленіп көрсетіледі');

    // Баптау қайта жүктелгенде шифрланған/бүркемеленген кілт қалады
    const checkRes = await fetch(`${baseUrl}/api/ai/config`, { headers: headers(teacherCookie) });
    const checkData = await checkRes.json();
    assert.equal(checkData.configured, true);
    assert.equal(checkData.apiKeyMasked, maskApiKey('AIzaSyDemoFakeTestKey1234567890ABCDEF'));
    assert.notEqual(checkData.apiKeyMasked, 'AIzaSyDemoFakeTestKey1234567890ABCDEF', 'Шикі кілт ешқашан клиентке жіберілмейді');
  });

  // =========================================================================
  // 4. КОНТЕКСТ ЖӘНЕ СОКРАТТЫҚ ПЕДАГОГИКАЛЫҚ ПРОМПТТАР
  // =========================================================================
  await t.test('4.1. Оқушы контексі нақты көрсеткіштерден құрылады', () => {
    const ctx = buildStudentContext(db, student, 1);
    const expectedName = student.nickname || student.name;
    assert.ok(ctx.includes(expectedName), 'Оқушының аты контексте бар');
    assert.ok(ctx.includes('XP'), 'XP мәні бар');
    assert.ok(ctx.includes('Кітап ағашы'), 'Ағаш сатысы бар');
    assert.ok(ctx.includes('ТАЛДАНАТЫН КІТАП АҚПАРАТЫ'), 'Кітап ақпараты қосылған');
  });

  await t.test('4.2. 8 Режимнің промпттары сократтық әдісті сақтайды', () => {
    const pReview = buildModePrompt('review_help', 'Маған пікір жазуға көмектес');
    assert.ok(pReview.includes('4 қадамдық'), '4 қадамдық жоспар бар');
    assert.ok(pReview.includes('орнына дайын пікір жазып берме'), 'Дайын жазып бермеу шарты бар');

    const pCharacter = buildModePrompt('character', 'Кейіпкерді талдайық');
    assert.ok(pCharacter.includes('Дайын мінездеме жазып берме'), 'Сократтық бағыттау талабы бар');
  });

  // =========================================================================
  // 5. ЖИ КӨМЕКШІСІМЕН ТОЛЫҚ СҰХБАТ (MOCKED FETCH) ЖӘНЕ XP БЕРУ
  // =========================================================================
  await t.test('5.1. Gemini API жауабын қабылдап, тарих пен XP ұпайын тіркеу', async () => {
    // Ғаламдық fetch-ті уақытша mock-пен ораймыз
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: '🦉 Сәлем! Өте жақсы кітапты таңдапсың. Басты кейіпкердің іс-әрекеті туралы ойланып көрейікші: ол неге осындай шешім қабылдады деп ойлайсың?' }
                ]
              },
              finishReason: 'STOP'
            }
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(url, options);
    };

    try {
      const assistRes = await fetch(`${baseUrl}/api/ai/assist`, {
        method: 'POST',
        headers: headers(studentCookie),
        body: JSON.stringify({
          message: 'Бұл кітаптағы басты кейіпкерді қалай талдаймыз?',
          mode: 'character',
          bookId: 1,
          sessionId: 'test_session_123'
        })
      });

      assert.equal(assistRes.status, 200);
      const assistData = await assistRes.json();
      assert.equal(assistData.ok, true);
      assert.ok(assistData.reply.includes('🦉 Сәлем!'));
      assert.equal(assistData.sessionId, 'test_session_123');
      assert.equal(assistData.mode, 'character');
      assert.equal(assistData.xpAwarded, 5, 'Оқушыға ізденісі үшін 5 XP берілуі керек');

      // Сұхбат тарихын тексеру
      const histRes = await fetch(`${baseUrl}/api/ai/history?sessionId=test_session_123`, {
        headers: headers(studentCookie)
      });
      assert.equal(histRes.status, 200);
      const histData = await histRes.json();
      assert.equal(histData.messages.length, 2, 'Пайдаланушы мен көмекшінің хабарламасы сақталуы тиіс');
      assert.equal(histData.messages[0].role, 'user');
      assert.equal(histData.messages[1].role, 'assistant');

      // Сұхбат тарихын тазалау
      const delRes = await fetch(`${baseUrl}/api/ai/history?sessionId=test_session_123`, {
        method: 'DELETE',
        headers: headers(studentCookie)
      });
      assert.equal(delRes.status, 200);

      const checkHistRes = await fetch(`${baseUrl}/api/ai/history?sessionId=test_session_123`, {
        headers: headers(studentCookie)
      });
      const checkHistData = await checkHistRes.json();
      assert.equal(checkHistData.messages.length, 0, 'Тарих сәтті тазартылды');

    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // =========================================================================
  // 6. БАЙЛАНЫСТЫ ТЕКСЕРУ (PING TEST)
  // =========================================================================
  await t.test('6.1. Мұғалім тікелей тестілеу (Ping test) жүргізе алады', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: '«Кітап Досы» байланыста!' }] },
              finishReason: 'STOP'
            }
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(url, options);
    };

    try {
      const testRes = await fetch(`${baseUrl}/api/ai/test`, {
        method: 'POST',
        headers: headers(teacherCookie),
        body: JSON.stringify({
          apiKey: 'AIzaSyMockTestKey123',
          model: 'gemini-2.0-flash'
        })
      });

      assert.equal(testRes.status, 200);
      const testData = await testRes.json();
      assert.equal(testData.ok, true);
      assert.ok(testData.latencyMs >= 0);
      assert.equal(testData.reply, '«Кітап Досы» байланыста!');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
