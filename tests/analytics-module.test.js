import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { localDate } from '../server/lib/util.js';

test('KitapTracker — Smart Reader Analytics (Ақылды оқырман аналитикасы) модулі сынағы', async () => {
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
    // 1. Авторизацияланбаған сұраныс 401 қайтаруы керек
    const unauthRes = await fetch(`${baseUrl}/api/student/analytics`, { headers: headers() });
    assert.equal(unauthRes.status, 401, 'Рұқсатсыз қолданушы 401 алуы қажет');

    // 2. Демо оқушы болып жүйеге кіру
    const studLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ role: 'student' })
    });
    assert.equal(studLoginRes.status, 200);
    const studCookie = studLoginRes.headers.get('set-cookie').split(';')[0];

    // 3. Оқушының жеке аналитикасын тексеру (/api/student/analytics)
    const analyticsRes = await fetch(`${baseUrl}/api/student/analytics`, { headers: headers(studCookie) });
    assert.equal(analyticsRes.status, 200, 'Студент аналитикасы сәтті қайтарылуы керек');
    const data = await analyticsRes.json();

    // Негізгі метрикалар
    assert.ok(data.totals, 'totals нысаны болуы тиіс');
    assert.equal(typeof data.totals.pages, 'number', 'Жалпы бет саны сан болуы керек');
    assert.equal(typeof data.totals.books, 'number', 'Оқылған кітаптар саны сан болуы керек');
    assert.equal(typeof data.totals.minutes, 'number', 'Жалпы уақыт сан болуы керек');
    assert.equal(typeof data.totals.streak_count, 'number', 'Оқу сериясы анықталуы тиіс');
    assert.equal(typeof data.totals.goal_percent, 'number', 'Мақсат пайызы есептелуі тиіс');

    // Күнделікті, апталық және айлық статистика
    assert.ok(data.daily, 'daily статистикасы бар');
    assert.equal(typeof data.daily.pages, 'number');
    assert.ok(data.weekly, 'weekly деректері бар');
    assert.equal(typeof data.weekly.pages, 'number');
    assert.ok(data.last_weekly, 'last_weekly деректері бар');
    assert.ok(data.monthly, 'monthly деректері бар');

    // Апталық салыстыру деректері
    assert.ok(data.comparison, 'comparison нысаны бар');
    assert.equal(typeof data.comparison.delta_pages, 'number', 'Апталық бет айырмашылығы есептелуі керек');
    assert.equal(typeof data.comparison.is_growth, 'boolean', 'Өсу белгісі бар');

    // Графиктер деректері (Бағандық, Сызықтық, Күнтізбелік, Дөңгелек)
    assert.ok(data.charts, 'Графиктер блогы болуы керек');
    assert.ok(Array.isArray(data.charts.bar_chart), 'Бағандық диаграмма массив болуы тиіс');
    assert.equal(data.charts.bar_chart.length, 7, 'Бағандық диаграммада соңғы 7 күннің бағандары болуы керек');

    assert.ok(Array.isArray(data.charts.line_chart), 'Сызықтық график массив болуы тиіс');
    assert.equal(data.charts.line_chart.length, 14, 'Сызықтық графикте соңғы 14 күн динамикасы болуы керек');

    assert.ok(Array.isArray(data.charts.calendar), 'Оқу күнтізбесі массив болуы тиіс');
    assert.equal(data.charts.calendar.length, 28, 'Күнтізбеде 28 күннің активтілігі болуы керек');

    assert.ok(Array.isArray(data.charts.donut_chart), 'Жанрлық дөңгелек диаграмма массив болуы тиіс');

    // Ақылды ұсыныстар (Smart Pedagogical Recommendations)
    assert.ok(Array.isArray(data.recommendations), 'Ұсыныстар массив болуы керек');
    assert.ok(data.recommendations.length >= 1, 'Кем дегенде 1 ақылды педагогикалық ұсыныс берілуі керек');
    assert.ok(typeof data.recommendations[0] === 'string', 'Ұсыныс мәтіні жол болуы керек');

    // 4. Оқушы жаңа кітап оқылымын тіркегенде аналитиканың динамикалық жаңаруын тексеру
    const studUser = db.get("SELECT id FROM users WHERE role = 'student' LIMIT 1");
    const book = db.get("SELECT id FROM books LIMIT 1");
    if (studUser && book) {
      const prevTotalPages = data.totals.pages;
      const today = localDate();

      const logRes = await fetch(`${baseUrl}/api/books/${book.id}/logs`, {
        method: 'POST',
        headers: headers(studCookie),
        body: JSON.stringify({
          page: 25,
          minutes: 20,
          date: today,
          note: 'Сынақ оқылым жазбасы'
        })
      });
      assert.equal(logRes.status, 200, 'Оқу жазбасы сәтті қосылуы керек');

      // Қайта аналитика алу
      const reAnalyticsRes = await fetch(`${baseUrl}/api/student/analytics`, { headers: headers(studCookie) });
      const reData = await reAnalyticsRes.json();
      assert.ok(reData.totals.pages >= prevTotalPages, 'Оқылған жалпы бет саны кемімеуі тиіс');
      assert.ok(reData.daily.pages >= 25, 'Бүгінгі күннің оқылым беттері жаңартылуы тиіс');
      assert.ok(reData.daily.minutes >= 20, 'Бүгінгі минуттар қосылуы тиіс');
    }

    // 5. Мұғалімнің сынып аналитикасын тексеру (/api/teacher/classes/:id/analytics)
    const teacherLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ role: 'teacher' })
    });
    assert.equal(teacherLoginRes.status, 200);
    const teacherCookie = teacherLoginRes.headers.get('set-cookie').split(';')[0];

    const teacherClassesRes = await fetch(`${baseUrl}/api/teacher/classes`, { headers: headers(teacherCookie) });
    const teacherClassesData = await teacherClassesRes.json();
    assert.ok(teacherClassesData.classes.length > 0, 'Мұғалімнің кемінде 1 сыныбы болуы керек');
    const classId = teacherClassesData.classes[0].id;

    const classAnalyticsRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/analytics`, { headers: headers(teacherCookie) });
    assert.equal(classAnalyticsRes.status, 200, 'Сынып аналитикасы сәтті қайтарылуы керек');
    const classData = await classAnalyticsRes.json();

    assert.ok(classData.class_name, 'Сынып атауы болуы керек');
    assert.equal(typeof classData.total_students, 'number', 'Оқушылар саны сан болуы керек');
    assert.ok(classData.this_week, 'Осы апталық көрсеткіштер бар');
    assert.equal(typeof classData.this_week.pages, 'number');
    assert.ok(classData.last_week, 'Өткен апталық көрсеткіштер бар');
    assert.ok(classData.comparison, 'Салыстыру көрсеткіштері бар');
    assert.ok(Array.isArray(classData.daily_bar), 'Күнделікті сынып беттерінің графигі бар');
    assert.ok(Array.isArray(classData.genre_distribution), 'Сынып оқыған жанрлар үлесі бар');
    assert.ok(Array.isArray(classData.top_readers), 'Үздік оқырмандар рейтингі бар');
    assert.ok(Array.isArray(classData.recommendations), 'Мұғалімге арналған әдістемелік ұсыныстар бар');

    // 6. Қауіпсіздік: Оқушы мұғалімнің сынып аналитикасын ала алмайды (403 Forbidden)
    const forbiddenRes = await fetch(`${baseUrl}/api/teacher/classes/${classId}/analytics`, { headers: headers(studCookie) });
    assert.equal(forbiddenRes.status, 403, 'Оқушы басқа сынып аналитикасына қол жеткізе алмауы керек');

  } finally {
    server.close();
  }
});
