import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

test('KitapTracker — Мұғалімнің кәсіби аналитикалық кабинеті (Бесінші кезең) сынағы', async () => {
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
    // -------------------------------------------------------------
    // 1. МҰҒАЛІМНІҢ ЖЕКЕ ТІРКЕЛУІ ЖӘНЕ ЖҮЙЕГЕ КІРУІ
    // -------------------------------------------------------------
    const regRes = await fetch(`${baseUrl}/api/auth/teacher/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'Аскарова Айнур Калдыбаевна',
        login: 'ainur.teacher',
        password: 'securePassword123'
      })
    });
    assert.equal(regRes.status, 200, 'Мұғалім тіркелуі 200 қайтаруы керек');
    const teacherCookie = regRes.headers.get('set-cookie').split(';')[0];
    const regData = await regRes.json();
    assert.equal(regData.user.role, 'teacher');
    assert.equal(regData.user.nickname, 'Аскарова Айнур Калдыбаевна');

    // Қайталап тіркелгенде login_taken (409) қайтаруы керек
    const dupRegRes = await fetch(`${baseUrl}/api/auth/teacher/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'Басқа Мұғалім',
        login: 'ainur.teacher',
        password: 'securePassword123'
      })
    });
    assert.equal(dupRegRes.status, 409, 'Бар логинге 409 беруі керек');

    // -------------------------------------------------------------
    // 2. СЫНЫПТАРДЫ ҚҰРУ ЖӘНЕ БАСҚАРУ
    // -------------------------------------------------------------
    const createClassRes = await fetch(`${baseUrl}/api/teacher/classes`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        name: '5 «А» сыныбы',
        level: 'junior'
      })
    });
    assert.equal(createClassRes.status, 200);
    const classData = await createClassRes.json();
    assert.ok(classData.id, 'Сынып ID-і болуы тиіс');
    assert.ok(classData.invite_code, 'Шақыру коды генерациялануы тиіс');
    const classId = classData.id;

    // Екінші сыныпты да құру (салыстыру үшін)
    const createClassRes2 = await fetch(`${baseUrl}/api/teacher/classes`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        name: '6 «Б» сыныбы',
        level: 'senior'
      })
    });
    assert.equal(createClassRes2.status, 200);
    const class2Data = await createClassRes2.json();
    const class2Id = class2Data.id;

    // -------------------------------------------------------------
    // 3. ОҚУШЫНЫ ЖЕКЕ ТІРКЕУ
    // -------------------------------------------------------------
    const addStudRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/students`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        nickname: 'Ахметов Әли',
        avatar: 'fox',
        pin: '5678'
      })
    });
    assert.equal(addStudRes.status, 200);
    const addStudData = await addStudRes.json();
    assert.equal(addStudData.student.nickname, 'Ахметов Әли');
    assert.equal(addStudData.student.pin, '5678');
    const student1Id = addStudData.student.id;

    // Бір сыныпта аттас оқушы қайталанса 409 беруі керек
    const dupStudRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/students`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        nickname: 'Ахметов Әли'
      })
    });
    assert.equal(dupStudRes.status, 409, 'Аттас оқушыға 409 беруі керек');

    // -------------------------------------------------------------
    // 4. EXCEL/CSV АРҚЫЛЫ ОҚУШЫЛАРДЫ ЖАППАЙ ИМПОРТТАУ
    // -------------------------------------------------------------
    const importText = `
      1. Серік Дина
      2. Омаров Бауыржан; 2468
      3. Қасымова Әмина
      4. Дәулет Ерасыл
    `;
    const importRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/import-students`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({ text: importText })
    });
    assert.equal(importRes.status, 200);
    const importData = await importRes.json();
    assert.equal(importData.count, 4, '4 оқушы сәтті импортталуы керек');
    assert.equal(importData.imported.length, 4);
    assert.ok(importData.imported[0].pin, 'Автоматты PIN жасалуы тиіс');
    assert.equal(importData.imported[1].pin, '2468', 'Берілген PIN сақталуы тиіс');

    // 2-сыныпқа да 1 оқушы қосу
    await fetch(`${baseUrl}/api/teacher/classes/${class2Id}/students`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({ nickname: 'Маратұлы Асан', pin: '1111' })
    });

    // -------------------------------------------------------------
    // 5. ОҚУШЫНЫҢ ОҚУ БЕЛСЕНДІЛІГІН ТІРКЕУ ЖӘНЕ ТЕСТ ТАПСЫРУ
    // -------------------------------------------------------------
    // Оқушы Әли ретінде кіру
    const aliLoginRes = await fetch(`${baseUrl}/api/auth/student/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        classCode: classData.invite_code,
        nickname: 'Ахметов Әли',
        pin: '5678'
      })
    });
    assert.equal(aliLoginRes.status, 200);
    const aliCookie = aliLoginRes.headers.get('set-cookie').split(';')[0];

    const book = db.get("SELECT id, title FROM books WHERE title = 'Менің атым Қожа'");

    // Кітапты сөреге қосып оқу
    const shelfRes = await fetch(`${baseUrl}/api/shelf/${book.id}`, {
      method: 'PUT',
      headers: headers(aliCookie),
      body: JSON.stringify({ status: 'reading', totalPages: 120, goalText: 'Күнде 10 бет' })
    });
    assert.equal(shelfRes.status, 200);

    // Оқу күнделігін тіркеу
    const logRes = await fetch(`${baseUrl}/api/books/${book.id}/logs`, {
      method: 'POST',
      headers: headers(aliCookie),
      body: JSON.stringify({
        page: 35,
        minutes: 25,
        note: 'Қожаның мектептегі сәттері өте қызықты суреттелген.'
      })
    });
    assert.equal(logRes.status, 200);

    // Мазмұндық тест тапсыру
    await fetch(`${baseUrl}/api/books/${book.id}/comprehension/test/submit`, {
      method: 'POST',
      headers: headers(aliCookie),
      body: JSON.stringify({ answers: [0, 1, 0, 0, 0, 0, 0] })
    });

    // -------------------------------------------------------------
    // 6. ОҚУШЫНЫҢ ЖЕКЕ ОҚУ ПОРТФОЛИОСЫН ТЕКСЕРУ
    // -------------------------------------------------------------
    const portfolioRes = await fetch(`${baseUrl}/api/teacher/students/${student1Id}/portfolio`, {
      headers: headers(teacherCookie)
    });
    assert.equal(portfolioRes.status, 200);
    const portData = await portfolioRes.json();

    assert.equal(portData.student.nickname, 'Ахметов Әли');
    assert.ok(portData.tree_stage, 'Кітап ағашының сатысы болуы тиіс');
    assert.ok(portData.tree_stage.stage >= 1, '1-7 сатылардың бірі болуы керек');
    assert.ok(portData.tree_stage.name, 'Саты атауы бар');
    assert.equal(portData.metrics.total_minutes, 25);
    assert.equal(portData.metrics.total_pages, 35);
    assert.ok(portData.metrics.comprehension_avg > 0, 'Түсіну тест орташасы есептелген');
    assert.equal(portData.comprehension_attempts.length, 1);
    assert.equal(portData.recent_logs.length, 1);
    assert.equal(portData.shelf.length, 1);

    // -------------------------------------------------------------
    // 7. МҰҒАЛІМНІҢ ЖЕКЕ ПЕДАГОГИКАЛЫҚ КЕРІ БАЙЛАНЫС БЕРУІ
    // -------------------------------------------------------------
    const fbRes = await fetch(`${baseUrl}/api/teacher/students/${student1Id}/feedback`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        message: 'Әли, мазмұндық тестті өте жақсы тапсырдың! Қожаның Майқановамен қарым-қатынасына назар аудар.'
      })
    });
    assert.equal(fbRes.status, 200);
    const fbData = await fbRes.json();
    assert.equal(fbData.ok, true);

    // Оқушы Әли өз кабинетінде (/api/world) мұғалім пікірін көруі тиіс
    const worldRes = await fetch(`${baseUrl}/api/world`, { headers: headers(aliCookie) });
    assert.equal(worldRes.status, 200);
    const worldData = await worldRes.json();
    assert.ok(worldData.teacher_feedback, 'Оқушы кабинетіне мұғалім пікірі жетуі тиіс');
    assert.equal(worldData.teacher_feedback.message, 'Әли, мазмұндық тестті өте жақсы тапсырдың! Қожаның Майқановамен қарым-қатынасына назар аудар.');

    // -------------------------------------------------------------
    // 8. ОҚУ БЕЛСЕНДІЛІГІ ТӨМЕНДЕГЕН (AT-RISK) ОҚУШЫЛАРДЫ АНЫҚТАУ
    // -------------------------------------------------------------
    const atRiskRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/at-risk`, {
      headers: headers(teacherCookie)
    });
    assert.equal(atRiskRes.status, 200);
    const atRiskData = await atRiskRes.json();

    assert.ok(atRiskData.at_risk_count > 0, 'Импортталған оқушылар әлі кітап оқымағандықтан, at-risk болып шығуы тиіс');
    assert.ok(atRiskData.at_risk_students.some(s => s.reasons.includes('never_read') || s.reasons.includes('low_goal')));
    assert.ok(atRiskData.at_risk_students[0].recommendation, 'Педагогикалық ұсыныс болуы керек');

    // -------------------------------------------------------------
    // 9. СЫНЫПТА ЕҢ КӨП ОҚЫЛҒАН КІТАПТАР
    // -------------------------------------------------------------
    const popBooksRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/popular-books`, {
      headers: headers(teacherCookie)
    });
    assert.equal(popBooksRes.status, 200);
    const popBooksData = await popBooksRes.json();
    assert.ok(Array.isArray(popBooksData.popular_books));
    assert.ok(popBooksData.popular_books.length >= 1);
    assert.equal(popBooksData.popular_books[0].title, 'Менің атым Қожа');

    // -------------------------------------------------------------
    // 10. ТОҚСАНДЫҚ ЖӘНЕ АЙЛЫҚ АКАДЕМИЯЛЫҚ ЕСЕП
    // -------------------------------------------------------------
    const reportRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/report?period=q2&year=2026`, {
      headers: headers(teacherCookie)
    });
    assert.equal(reportRes.status, 200);
    const repData = await reportRes.json();

    assert.equal(repData.meta.school, '№290 орта мектеп');
    assert.equal(repData.meta.teacher_name, 'Аскарова Айнур Калдыбаевна');
    assert.equal(repData.meta.class_name, '5 «А» сыныбы');
    assert.equal(repData.totals.total_students, 5); // 1 individual + 4 imported
    assert.ok(repData.totals.total_pages >= 35);
    assert.ok(Array.isArray(repData.tree_distribution));
    assert.equal(repData.tree_distribution.length, 7, '7 сатылы ағаш бөлінісі болуы керек');
    assert.ok(Array.isArray(repData.students));
    assert.ok(repData.students.find(s => s.nickname === 'Ахметов Әли'));

    // -------------------------------------------------------------
    // 11. СЫНЫПТАРДЫ ӨЗАРА САЛЫСТЫРУ
    // -------------------------------------------------------------
    const compRes = await fetch(`${baseUrl}/api/teacher/classes-comparison`, {
      headers: headers(teacherCookie)
    });
    assert.equal(compRes.status, 200);
    const compAllData = await compRes.json();
    assert.equal(compAllData.classes.length, 2, 'Мұғалімнің 2 сыныбы қатар салыстырылуы тиіс');
    assert.equal(compAllData.classes[0].name, '5 «А» сыныбы');
    assert.equal(compAllData.classes[1].name, '6 «Б» сыныбы');

    // -------------------------------------------------------------
    // 12. ҚАУІПСІЗДІК ЖӘНЕ ИЕЛИК (SECURITY & ACCESS CONTROL)
    // -------------------------------------------------------------
    // Басқа мұғалім тіркеледі
    const otherTeacherRes = await fetch(`${baseUrl}/api/auth/teacher/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'Басқа Мұғалім',
        login: 'other.teacher',
        password: 'securePassword456'
      })
    });
    assert.equal(otherTeacherRes.status, 200);
    const otherTeacherCookie = otherTeacherRes.headers.get('set-cookie').split(';')[0];

    // Басқа мұғалім бірінші мұғалімнің сыныбын немесе оқушысын көре алмауы керек (403 немесе 404)
    const unauthorizedClassRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/overview`, {
      headers: headers(otherTeacherCookie)
    });
    assert.ok(unauthorizedClassRes.status === 403 || unauthorizedClassRes.status === 404, 'Бөтен сыныпқа кіру бұғатталуы тиіс');

    const unauthorizedStudentRes = await fetch(`${baseUrl}/api/teacher/students/${student1Id}/portfolio`, {
      headers: headers(otherTeacherCookie)
    });
    assert.ok(unauthorizedStudentRes.status === 403 || unauthorizedStudentRes.status === 404, 'Бөтен оқушы портфолиосына кіру бұғатталуы тиіс');

    const unauthorizedFeedbackRes = await fetch(`${baseUrl}/api/teacher/students/${student1Id}/feedback`, {
      method: 'POST',
      headers: headers(otherTeacherCookie),
      body: JSON.stringify({ message: 'Рұқсатсыз пікір' })
    });
    assert.ok(unauthorizedFeedbackRes.status === 403 || unauthorizedFeedbackRes.status === 404, 'Бөтен оқушыға кері байланыс беру бұғатталуы тиіс');

    // -------------------------------------------------------------
    // 13. CSV ЭКСПОРТТЫ ТЕКСЕРУ
    // -------------------------------------------------------------
    const csvRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/export.csv`, {
      headers: headers(teacherCookie)
    });
    assert.equal(csvRes.status, 200);
    assert.equal(csvRes.headers.get('content-type'), 'text/csv; charset=utf-8');
    const csvText = await csvRes.text();
    assert.ok(csvText.includes('Кітап ағашының сатысы'), 'CSV-де жаңа бағандар бар');
    assert.ok(csvText.includes('Ахметов Әли'), 'Оқушы мәліметтері бар');

  } finally {
    server.close();
  }
});
