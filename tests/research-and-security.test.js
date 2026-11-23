import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { computeExperimentAnalysis, calcPctChange, formatDelta } from '../server/lib/research.js';

test('KitapTracker — Сегізінші кезең: Ғылыми зерттеу, қауіпсіздік және деректер тұтастығы сынағы', async (t) => {
  const { server, db } = createApp({ dbPath: ':memory:' });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
    db.close();
  });

  const headers = (cookie = null, withCsrf = true) => ({
    'Content-Type': 'application/json',
    ...(withCsrf ? { 'x-kt': '1' } : {}),
    ...(cookie ? { Cookie: cookie } : {})
  });

  // Оқушы және мұғалім ретінде тіркелу / кіру
  const studentLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ role: 'student' })
  });
  assert.equal(studentLoginRes.status, 200);
  const studentCookie = studentLoginRes.headers.get('set-cookie').split(';')[0];
  const student = (await studentLoginRes.json()).user;

  const teacherLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ role: 'teacher' })
  });
  assert.equal(teacherLoginRes.status, 200);
  const teacherCookie = teacherLoginRes.headers.get('set-cookie').split(';')[0];

  // =========================================================================
  // 1. ҚАУІПСІЗДІК ЖӘНЕ РӨЛДІК БӨЛІНІС (RBAC, CSRF, SESSION)
  // =========================================================================
  await t.test('1.1. Рұқсатсыз (авторизациясыз) қорғалған API-ге кіру 401 қайтарады', async () => {
    const res = await fetch(`${baseUrl}/api/world`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'unauthorized');
  });

  await t.test('1.2. Оқушы мұғалім кабинетіне кіре алмайды (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/teacher/classes`, { headers: headers(studentCookie) });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'forbidden');
  });

  await t.test('1.3. CSRF тақырыбы (x-kt: 1) жоқ өзгертуші сұраныс 403 csrf қайтарады', async () => {
    const res = await fetch(`${baseUrl}/api/books`, {
      method: 'POST',
      headers: headers(studentCookie, false), // withCsrf = false
      body: JSON.stringify({ title: 'Жаңа кітап', author: 'Автор', totalPages: 100 })
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'csrf');
  });

  await t.test('1.4. Жалған нәтижелерден қорғау: кітаптың жалпы бетінен асатын оқу жазбасын қабылдамау', async () => {
    // Сөреге 1-кітапты салу
    await fetch(`${baseUrl}/api/shelf/1`, {
      method: 'PUT',
      headers: headers(studentCookie),
      body: JSON.stringify({ status: 'reading', totalPages: 120 })
    });

    // 120 беттік кітапқа 9999 бет оқыдым деп жазу әрекеті
    const cheatRes = await fetch(`${baseUrl}/api/books/1/logs`, {
      method: 'POST',
      headers: headers(studentCookie),
      body: JSON.stringify({ page: 9999, minutes: 20 })
    });
    assert.equal(cheatRes.status, 400);
    const cheatData = await cheatRes.json();
    assert.equal(cheatData.error, 'page_exceeds_total', 'Жалған бет жазбасы қабылданбады');
  });

  // =========================================================================
  // 2. ҒЫЛЫМИ ЭКСПЕРИМЕНТТІК ЗЕРТТЕУ МОДУЛІ (RESEARCH MODULE)
  // =========================================================================
  await t.test('2.1. Ғылыми эксперименттер тізімі және «Нақты эксперимент деректері» белгісі', async () => {
    const res = await fetch(`${baseUrl}/api/research/experiments`, { headers: headers(studentCookie) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.experiments.length >= 1);

    const exp = data.experiments[0];
    assert.equal(exp.school_name, '№290 орта мектеп');
    assert.equal(exp.is_sample, false, 'Ресми нақты эксперимент дерегі ретінде белгіленген');
    assert.equal(exp.data_type_label, 'Нақты эксперимент деректері');
  });

  await t.test('2.2. Салыстырмалы өсім пайызы мен 5 көрсеткішті есептеу алгоритмі', async () => {
    const res = await fetch(`${baseUrl}/api/research/experiments/1`, { headers: headers(studentCookie) });
    assert.equal(res.status, 200);
    const data = await res.json();
    const analysis = data.analysis;

    assert.ok(analysis.indicators.length === 5, '5 негізгі көрсеткіш өлшенген');

    // 1. Аптасына оқылған кітап саны: Бақылау 0.6 -> 0.9 (+50%), Эксперименттік 0.7 -> 2.4 (+242.9%)
    const booksInd = analysis.indicators.find(i => i.key === 'books_per_week');
    assert.ok(booksInd.expGrowth.rawPct > 200, 'Эксперименттік топта кітап саны 200%-дан астам өскен');
    assert.ok(booksInd.controlGrowth.rawPct < 60, 'Бақылау тобында табиғи өсім қалыпты');

    // 2. Мәтінді түсіну сапасы (comprehension_pct)
    const compInd = analysis.indicators.find(i => i.key === 'comprehension_pct');
    assert.equal(compInd.expPost, 84, 'Қорытынды түсіну сапасы 84%-ға жеткен');
    assert.ok(compInd.rawNetAdvantage > 40, 'Эксперименттік топтың таза басымдығы бар');

    // 3. Student t-test статистикалық мәнділігі
    assert.equal(analysis.stats.isSignificant, true);
    assert.equal(analysis.stats.pValue, '< 0.001');
  });

  await t.test('2.3. Мұғалім эксперименттік көрсеткіштерді сәтті өңдей алады, оқушыға тыйым салынады', async () => {
    // Оқушының өзгерту әрекеті -> 403
    const stuEditRes = await fetch(`${baseUrl}/api/research/experiments/1/metrics`, {
      method: 'POST',
      headers: headers(studentCookie),
      body: JSON.stringify({
        group_type: 'experimental',
        stage: 'post',
        books_per_week: 2.5,
        pages_per_month: 290
      })
    });
    assert.equal(stuEditRes.status, 403);

    // Мұғалімнің өзгертуі -> 200
    const teaEditRes = await fetch(`${baseUrl}/api/research/experiments/1/metrics`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        group_type: 'experimental',
        stage: 'post',
        students_count: 25,
        books_per_week: 2.6,
        pages_per_month: 295,
        active_reading_days: 5.4,
        interest_level_pct: 90,
        comprehension_pct: 86
      })
    });
    assert.equal(teaEditRes.status, 200);

    // Қайта тексеру
    const checkRes = await fetch(`${baseUrl}/api/research/experiments/1`, { headers: headers(studentCookie) });
    const checkData = await checkRes.json();
    const updatedBooks = checkData.analysis.indicators.find(i => i.key === 'books_per_week');
    assert.equal(updatedBooks.expPost, 2.6);
  });

  await t.test('2.4. Ресми ғылыми хаттама / PDF дайын есеп беру маршруты (/api/research/experiments/:id/report)', async () => {
    const res = await fetch(`${baseUrl}/api/research/experiments/1/report`, { headers: headers(studentCookie) });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('ЭКСПЕРИМЕНТТІК ЗЕРТТЕУ НӘТИЖЕЛЕРІНІҢ РЕСМИ ХАТТАМАСЫ'));
    assert.ok(html.includes('Құлахметова Аягөз'));
    assert.ok(html.includes('№290 орта мектеп'));
    assert.ok(html.includes('STUDENT t-TEST') || html.includes('t-критерийі'));
  });
});
