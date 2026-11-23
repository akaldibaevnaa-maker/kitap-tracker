import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

test('KitapTracker — Алтыншы кезең: Оқырман марафоны, Электронды күнделік және QR кітап жүйесі сынағы', async (t) => {
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

  // 1. Оқушы және мұғалім ретінде тіркелу / кіру
  const studentLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ role: 'student' })
  });
  assert.equal(studentLoginRes.status, 200);
  const studentCookie = studentLoginRes.headers.get('set-cookie').split(';')[0];
  const studentData = await studentLoginRes.json();
  const studentId = studentData.user.id;

  const teacherLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ role: 'teacher' })
  });
  assert.equal(teacherLoginRes.status, 200);
  const teacherCookie = teacherLoginRes.headers.get('set-cookie').split(';')[0];

  // =========================================================================
  // 1. READING CHALLENGE — ОҚЫРМАН МАРАФОНЫ ТЕСТТЕРІ
  // =========================================================================
  await t.test('1.1. Әдепкі оқырман марафондары тізімі мен құрылымы', async () => {
    const res = await fetch(`${baseUrl}/api/challenges`, { headers: headers(studentCookie) });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.challenges), 'Марафондар тізімі массив болуы тиіс');
    assert.ok(data.challenges.length >= 5, 'Кемінде 5 әдепкі марафон болуы тиіс');

    const titles = data.challenges.map(c => c.title);
    assert.ok(titles.some(t => t.includes('7 күндік')), '7 күндік оқу марафоны бар');
    assert.ok(titles.some(t => t.includes('30 күндік')), '30 күндік оқу марафоны бар');
    assert.ok(titles.some(t => t.includes('1000 бет')), '1000 бет оқу марафоны бар');
    assert.ok(titles.some(t => t.includes('3 кітап')), 'Бір айда 3 кітап оқу марафоны бар');
    assert.ok(titles.some(t => t.includes('Сыныптар арасындағы')), 'Сыныптық жарыс бар');
  });

  await t.test('1.2. Марафонға тіркелу (Join challenge)', async () => {
    const listRes = await fetch(`${baseUrl}/api/challenges`, { headers: headers(studentCookie) });
    const listData = await listRes.json();
    const chal7 = listData.challenges.find(c => c.challenge_type === 'days' && c.target_value === 7);
    assert.ok(chal7, '7 күндік марафон табылды');

    const joinRes = await fetch(`${baseUrl}/api/challenges/${chal7.id}/join`, {
      method: 'POST',
      headers: headers(studentCookie)
    });
    assert.equal(joinRes.status, 200);
    const joinData = await joinRes.json();
    assert.equal(joinData.ok, true);

    // Қайта тексергенде is_joined true болуы керек
    const detailRes = await fetch(`${baseUrl}/api/challenges/${chal7.id}`, { headers: headers(studentCookie) });
    assert.equal(detailRes.status, 200);
    const detailData = await detailRes.json();
    assert.ok(detailData.participant, 'Қатысушы ретінде тіркелген');
    assert.equal(detailData.participant.user_id, studentId);
  });

  await t.test('1.3. Оқылым әрекеттерінен кейін марафон прогресі мен жеңімпазды автоматты анықтау', async () => {
    // 7 күндік марафон үшін 7 түрлі күнге жазба жасау
    const book = db.get('SELECT id FROM books LIMIT 1');
    assert.ok(book);

    // Кітапты сөреге қосу
    await fetch(`${baseUrl}/api/shelf/${book.id}`, {
      method: 'PUT',
      headers: headers(studentCookie),
      body: JSON.stringify({ status: 'reading', totalPages: 200 })
    });

    // 7 күн қатарынан оқу күнделігін тіркеу
    const dates = [
      '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13',
      '2026-11-14', '2026-11-15', '2026-11-16'
    ];
    for (let i = 0; i < dates.length; i++) {
      await fetch(`${baseUrl}/api/books/${book.id}/logs`, {
        method: 'POST',
        headers: headers(studentCookie),
        body: JSON.stringify({
          page: 10 + i * 5,
          minutes: 15,
          date: dates[i],
          note: `${dates[i]} күнгі оқылым`
        })
      });
    }

    // 7 күндік марафонды тексеру
    const listRes = await fetch(`${baseUrl}/api/challenges`, { headers: headers(studentCookie) });
    const listData = await listRes.json();
    const chal7 = listData.challenges.find(c => c.challenge_type === 'days' && c.target_value === 7);

    assert.equal(chal7.is_completed, true, '7 күн оқылғандықтан, марафон аяқталып жеңімпаз атануы тиіс');
    assert.ok(chal7.certificate_code, 'Жеңімпазға бірегей сертификат коды берілген');
    assert.ok(chal7.my_progress >= 7, 'Прогресс 7 күннен кем емес');

    // Ресми жеңімпаз сертификатын алу
    const certRes = await fetch(`${baseUrl}/api/challenges/${chal7.id}/certificate`, {
      headers: headers(studentCookie)
    });
    assert.equal(certRes.status, 200);
    const certData = await certRes.json();
    const cert = certData.certificate;

    assert.equal(cert.school, '№290 орта мектеп');
    assert.equal(cert.student_name, studentData.user.nickname);
    assert.ok(cert.certificate_code, 'Сертификат коды бар');
    assert.ok(cert.qr_svg && cert.qr_svg.includes('<svg'), 'Сертификатта ресми QR-код бар');
    assert.ok(cert.verification_url.includes(cert.certificate_code), 'Тексеру сілтемесі бар');
  });

  await t.test('1.4. Мұғалім жаңа оқырман марафонын құра алады', async () => {
    const createRes = await fetch(`${baseUrl}/api/challenges`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({
        title: 'Қысқы демалыс: 500 бет оқу',
        description: 'Қысқы каникулда 500 бет көркем шығарма оқып, сыйлық ұтып ал!',
        challenge_type: 'pages',
        target_value: 500,
        start_date: '2026-12-01',
        end_date: '2026-12-31',
        reward_xp: 350,
        badge_name: 'Қысқы оқырман қарлығашы',
        badge_icon: '❄️'
      })
    });
    assert.equal(createRes.status, 200);
    const createData = await createRes.json();
    assert.ok(createData.id, 'Жаңа марафон ID-і жасалды');
  });

  // =========================================================================
  // 2. ELECTRONIC READING DIARY — ЭЛЕКТРОНДЫ ОҚЫРМАН КҮНДЕЛІГІ ТЕСТТЕРІ
  // =========================================================================
  await t.test('2.1. Электронды күнделік парағын сақтау және өрістердің толықтығы', async () => {
    const book = db.get("SELECT id, title FROM books WHERE title = 'Менің атым Қожа'") || db.get('SELECT id, title FROM books LIMIT 1');
    assert.ok(book);

    // Күнделікті сақтау
    const saveRes = await fetch(`${baseUrl}/api/diary/books/${book.id}`, {
      method: 'POST',
      headers: headers(studentCookie),
      body: JSON.stringify({
        start_date: '2026-11-05',
        finish_date: '2026-11-20',
        total_pages: 140,
        pages_read: 140,
        opinion: 'Шығарма балалар психологиясын өте шынайы әрі әзілмен жеткізеді.',
        favorite_character: 'Қожа — оның тапқырлығы мен адалдығы ұнады.',
        impression: 'Өзімнің мектептегі күндерімді есіме түсірді, рух берді.',
        summary: 'Шынайы достық пен еңбексүйгіштік кез келген қиындықты жеңеді.',
        rating: 5
      })
    });
    assert.equal(saveRes.status, 200);
    const saveData = await saveRes.json();
    assert.equal(saveData.ok, true);

    // Сақталған күнделік парағын жеке оқып тексеру
    const getRes = await fetch(`${baseUrl}/api/diary/books/${book.id}`, {
      headers: headers(studentCookie)
    });
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();

    assert.equal(getData.diary.start_date, '2026-11-05');
    assert.equal(getData.diary.finish_date, '2026-11-20');
    assert.equal(getData.diary.total_pages, 140);
    assert.equal(getData.diary.pages_read, 140);
    assert.equal(getData.diary.opinion, 'Шығарма балалар психологиясын өте шынайы әрі әзілмен жеткізеді.');
    assert.equal(getData.diary.favorite_character, 'Қожа — оның тапқырлығы мен адалдығы ұнады.');
    assert.equal(getData.diary.impression, 'Өзімнің мектептегі күндерімді есіме түсірді, рух берді.');
    assert.equal(getData.diary.summary, 'Шынайы достық пен еңбексүйгіштік кез келген қиындықты жеңеді.');
    assert.equal(getData.diary.rating, 5);

    // Барлық күнделік кітаптарының тізімін алу
    const listRes = await fetch(`${baseUrl}/api/diary/books`, {
      headers: headers(studentCookie)
    });
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.ok(Array.isArray(listData.entries));
    assert.ok(listData.entries.length >= 1);
    assert.ok(listData.entries.some(e => e.has_diary_entry && e.opinion));
  });

  await t.test('2.2. Оқушының толық электронды күнделік портфолиосын алу (Print/PDF дайын)', async () => {
    const portRes = await fetch(`${baseUrl}/api/diary/portfolio`, {
      headers: headers(studentCookie)
    });
    assert.equal(portRes.status, 200);
    const portData = await portRes.json();
    const port = portData.portfolio;

    assert.equal(port.school, '№290 орта мектеп');
    assert.equal(port.student_name, studentData.user.nickname);
    assert.ok(port.stats.total_pages > 0);
    assert.ok(Array.isArray(port.entries));
    assert.ok(port.entries.length >= 1);

    const entry = port.entries[0];
    assert.ok(entry.title, 'Кітап атауы бар');
    assert.ok(entry.author, 'Авторы бар');
    assert.ok(entry.opinion, 'Пікірі бар');
    assert.ok(entry.favorite_character, 'Кейіпкері бар');
    assert.ok(entry.impression, 'Әсері бар');
    assert.ok(entry.summary, 'Қорытындысы бар');
    assert.ok(entry.qr_svg && entry.qr_svg.includes('<svg'), 'Әр кітапта сканерленетін QR-код бар');
  });

  // =========================================================================
  // 3. QR BOOK SYSTEM — QR КІТАП ЖҮЙЕСІ ТЕСТТЕРІ
  // =========================================================================
  await t.test('3.1. Кітаптың тікелей QR SVG бейнесін қайтару (/api/books/:id/qr.svg)', async () => {
    const book = db.get('SELECT id FROM books LIMIT 1');
    const qrRes = await fetch(`${baseUrl}/api/books/${book.id}/qr.svg`);
    assert.equal(qrRes.status, 200);
    assert.ok(qrRes.headers.get('content-type').includes('image/svg+xml'));
    const svgText = await qrRes.text();
    assert.ok(svgText.includes('<svg'), 'SVG тегі бар');
    assert.ok(svgText.includes('viewBox='), 'viewBox өлшемі дұрыс');
  });

  await t.test('3.2. Кітаптың QR төлқұжаты (/api/books/:id/qr-card)', async () => {
    const book = db.get('SELECT id, title FROM books LIMIT 1');
    const cardRes = await fetch(`${baseUrl}/api/books/${book.id}/qr-card`);
    assert.equal(cardRes.status, 200);
    const cardData = await cardRes.json();

    assert.equal(cardData.school, '№290 орта мектеп');
    assert.ok(cardData.library_code.includes('№290-КИТ-'), 'Кітапханалық шифр дұрыс');
    assert.ok(cardData.qr_url.includes(`/book/${book.id}`), 'Платформалық сілтеме дұрыс');
    assert.ok(cardData.qr_svg.includes('<svg'), 'SVG QR код бар');
  });

  await t.test('3.3. Мектеп кітапханасының толық QR-каталогы (/api/library/qr-catalog)', async () => {
    const catRes = await fetch(`${baseUrl}/api/library/qr-catalog`);
    assert.equal(catRes.status, 200);
    const catData = await catRes.json();

    assert.ok(catData.total_books > 0);
    assert.ok(Array.isArray(catData.catalog));
    assert.equal(catData.catalog.length, catData.total_books);

    const first = catData.catalog[0];
    assert.ok(first.title);
    assert.ok(first.library_code.startsWith('№290-КИТ-'));
    assert.ok(first.qr_svg.includes('<svg'));
  });

  await t.test('3.4. Телефон камерасымен QR сканерленгенде бағыттау (/b/:id -> /#/book/:id)', async () => {
    const book = db.get('SELECT id FROM books LIMIT 1');
    const scanRes = await fetch(`${baseUrl}/b/${book.id}`, {
      redirect: 'manual'
    });
    assert.equal(scanRes.status, 302, 'QR сілтеме 302 бағыттауын жасауы тиіс');
    assert.equal(scanRes.headers.get('location'), `/#/book/${book.id}`);
  });

  await t.test('3.5. Динамикалық кез келген QR код генераторы (/api/qr?text=...)', async () => {
    const dynRes = await fetch(`${baseUrl}/api/qr?text=KitapTracker2026&size=180`);
    assert.equal(dynRes.status, 200);
    assert.ok(dynRes.headers.get('content-type').includes('image/svg+xml'));
    const svg = await dynRes.text();
    assert.ok(svg.includes('width="180"'));
  });
});
