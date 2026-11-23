import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

test('KitapTracker — Reading Comprehension (Кітапты түсіну және талдау) модулі сынағы', async () => {
  const { server, db } = createApp({ dbPath: ':memory:' });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const headers = (cookie = null) => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-KT': '1',
    ...(cookie ? { 'Cookie': cookie } : {})
  });

  try {
    // 1. Демо оқушы болып жүйеге кіру
    const studLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ role: 'student' })
    });
    assert.equal(studLoginRes.status, 200);
    const studCookie = studLoginRes.headers.get('set-cookie').split(';')[0];

    // Базадағы «Менің атым Қожа» кітабын табу
    const book = db.get("SELECT id, title FROM books WHERE title = 'Менің атым Қожа'");
    assert.ok(book, '«Менің атым Қожа» кітабы базада болуы тиіс');

    // 2. /api/books/:id/comprehension сұранысын тексеру
    const compRes = await fetch(`${baseUrl}/api/books/${book.id}/comprehension`, { headers: headers(studCookie) });
    assert.equal(compRes.status, 200);
    const compData = await compRes.json();

    assert.equal(compData.has_test, true, 'Мазмұндық тест бар болуы тиіс');
    assert.ok(compData.test, 'Тест нысаны бар');
    assert.ok(compData.test.questions.length >= 5, 'Кемінде 5-10 сұрақ болуы керек');
    assert.ok(Array.isArray(compData.analysis_types), '6 талдау бағытының тізімі бар');
    assert.equal(compData.analysis_types.length, 6, 'Дәл 6 талдау бағыты болуы керек');

    // Оқушыға дұрыс жауап әлі көрінбеуі керек (жасырын)
    assert.equal(compData.test.questions[0].correct, undefined, 'Тест тапсырғанға дейін дұрыс жауап жасырылуы тиіс');

    // 3. Мазмұндық тестті тапсыру (/api/books/:id/comprehension/test/submit)
    // 7 сұрақтың барлығына 0-нұсқаны (дұрыс жауаптарды) белгілеп жібереміз
    const answers = [0, 1, 0, 0, 0, 0, 0]; // сұрақтар бойынша дұрыс жауаптар
    const submitRes = await fetch(`${baseUrl}/api/books/${book.id}/comprehension/test/submit`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({ answers })
    });
    assert.equal(submitRes.status, 200, 'Тест жауабы сәтті қабылдануы керек');
    const result = await submitRes.json();

    assert.equal(result.ok, true);
    assert.equal(typeof result.score, 'number');
    assert.equal(typeof result.percent, 'number');
    assert.ok(result.percent >= 80, 'Пайыз 80-нен жоғары болуы тиіс');
    assert.ok(result.level_name, 'Түсіну деңгейінің атауы бар');
    assert.ok(Array.isArray(result.details), 'Әр сұрақтың талдауы бар');
    assert.equal(result.details.length, compData.test.questions.length);

    // Қателер мен түсіндірмелердің дәйектелуін тексеру
    assert.ok(result.details[0].explanation, 'Дұрыс жауаптың түсіндірмесі болуы керек');
    assert.equal(result.details[0].is_correct, true);

    // 4. Тесттен соң қайта сұрағанда оқушыға нәтижесі көрінуі тиіс
    const reCompRes = await fetch(`${baseUrl}/api/books/${book.id}/comprehension`, { headers: headers(studCookie) });
    const reCompData = await reCompRes.json();
    assert.equal(reCompData.test.is_completed, true);
    assert.ok(reCompData.test.last_attempt);
    assert.equal(reCompData.test.last_attempt.score, result.score);

    // 5. Терең талдау тапсырмаларын жіберу (6 бағыт)
    // А) Кейіпкерлерді сипаттау
    const charAnalysisRes = await fetch(`${baseUrl}/api/books/${book.id}/comprehension/analysis/submit`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({
        analysis_type: 'character_analysis',
        title: '👤 Кейіпкерлерді сипаттау',
        character_name: 'Қожаберген',
        content: 'Қожа — ақкөңіл, бірақ тентек бала. Ол өтірік айтуды жек көреді және өзін тәрбиелеуге ұмтылады.'
      })
    });
    assert.equal(charAnalysisRes.status, 200);
    const charData = await charAnalysisRes.json();
    assert.ok(charData.analysis_id, 'Талдау ID-і қайтарылуы керек');
    assert.ok(charData.xp_awarded > 0, 'Жазбаша талдау үшін XP берілуі керек');

    // Ә) Шығарманың негізгі идеясы
    const ideaRes = await fetch(`${baseUrl}/api/books/${book.id}/comprehension/analysis/submit`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({
        analysis_type: 'main_idea',
        title: '💡 Шығарманың негізгі идеясы',
        content: 'Бұл шығарма баланың қателігін түсініп, адал адам болып өсуіне жол көрсетеді.'
      })
    });
    assert.equal(ideaRes.status, 200);

    // Б) Қысқаша аннотация
    const annotRes = await fetch(`${baseUrl}/api/books/${book.id}/comprehension/analysis/submit`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({
        analysis_type: 'annotation',
        title: '📝 Қысқаша аннотация (аңдатпа)',
        content: '«Менің атым Қожа» — әрбір оқушының жүрегіне жақын, мектеп өмірі мен достықты сипаттайтын тамаша повесть.'
      })
    });
    assert.equal(annotRes.status, 200);

    // 6. Мұғалім болып кіріп, сыныптың түсіну көрсеткіштері мен жазбаша жауаптарын тексеру
    const teacherLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ role: 'teacher' })
    });
    assert.equal(teacherLoginRes.status, 200);
    const teacherCookie = teacherLoginRes.headers.get('set-cookie').split(';')[0];

    const teacherClassesRes = await fetch(`${baseUrl}/api/teacher/classes`, { headers: headers(teacherCookie) });
    const teacherClassesData = await teacherClassesRes.json();
    const classId = teacherClassesData.classes[0].id;

    // Мұғалім сыныптық түсіну нәтижелерін алады
    const classCompRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/comprehension`, {
      headers: headers(teacherCookie)
    });
    assert.equal(classCompRes.status, 200);
    const classCompData = await classCompRes.json();

    assert.ok(classCompData.attempts.length >= 1, 'Сыныптың тест тапсырған оқушылары көрінуі тиіс');
    assert.ok(classCompData.analyses.length >= 3, 'Сыныптың 3 талдауы көрінуі тиіс');

    // Мұғалім талдау жұмысын тексереді және бағалайды
    const reviewRes = await fetch(`${baseUrl}/api/teacher/comprehension/analyses/${charData.analysis_id}/review`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        status: 'accepted',
        feedback: 'Жарайсың! Қожаның мінезін өте дұрыс талдағансың.',
        score: 10
      })
    });
    assert.equal(reviewRes.status, 200);
    const reviewData = await reviewRes.json();
    assert.equal(reviewData.status, 'accepted');
    assert.ok(reviewData.xp_awarded > 0, 'Қабылданған талдауға марапат берілуі керек');

    // 7. Мұғалімнің өз жаңа мазмұндық тестін енгізуі (мұғалім құрастырушысы)
    const newTestRes = await fetch(`${baseUrl}/api/teacher/comprehension/tests`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        book_id: book.id,
        title: 'Мұғалімнің қосымша мазмұндық бақылау тесті',
        description: 'Қосымша бекіту сұрақтары',
        questions: [
          {
            question: 'Қожа Жанарға неліктен ерекше құрметпен қарайды?',
            options: ['Оның ақылдылығы мен парасаттылығы үшін', 'Бай болғандықтан', 'Көрші болғандықтан', 'Қорқатындықтан'],
            correct: 0,
            explanation: 'Жанар — сыныптағы үлгілі оқушы.'
          },
          {
            question: 'Сұлтан Қожаға қандай ұсыныс айтты?',
            options: ['Жайлауға барып демалуды', 'Қалаға қашуды', 'Сабақ оқуды', 'Спортпен шұғылдануды'],
            correct: 0,
            explanation: 'Сұлтан Қожаны жайлауға барып тынығуға шақырған.'
          },
          {
            question: 'Қожа күнделікті не үшін бастады?',
            options: ['Өзін-өзі тәрбиелеп, жазушы болу үшін', 'Мұғалім бұйырғандықтан', 'Баға алу үшін', 'Еріккендіктен'],
            correct: 0,
            explanation: 'Қожа кемшіліктерін жою үшін күнделік арқылы өзін тәрбиелеуге кіріседі.'
          }
        ],
        xp_reward: 35
      })
    });
    assert.equal(newTestRes.status, 200, 'Мұғалімнің тесті сәтті жариялануы тиіс');

    // 8. Қауіпсіздік: Оқушы мұғалімнің сыныптық түсінуін көре алмайды және сұрақ қоса алмайды
    const forbiddenRes1 = await fetch(`${baseUrl}/api/teacher/classes/${classId}/comprehension`, {
      headers: headers(studCookie)
    });
    assert.equal(forbiddenRes1.status, 403, 'Оқушы мұғалім кабинетіне рұқсатсыз өте алмайды');

    const forbiddenRes2 = await fetch(`${baseUrl}/api/teacher/comprehension/tests`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({ book_id: book.id, title: 'Жалған тест' })
    });
    assert.equal(forbiddenRes2.status, 403, 'Оқушы мұғалім орнына тест жариялай алмайды');

  } finally {
    server.close();
  }
});
