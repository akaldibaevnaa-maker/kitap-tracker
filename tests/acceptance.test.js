// Автоматты қабылдау тесті: қабылдау сценарийі мен барлық негізгі талаптарды тексеру
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

test('KitapTracker — Толық қабылдау сценарийі және қауіпсіздік сынақтары', async () => {
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
    // 1. ДЕМО ОҚУШЫ КІРЕДІ
    const studLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ role: 'student' })
    });
    assert.equal(studLoginRes.status, 200);
    const studCookie = studLoginRes.headers.get('set-cookie').split(';')[0];
    const studData = await studLoginRes.json();
    assert.equal(studData.user.nickname, 'Құлахметова Аягөз');

    // 2. БАСТЫ КАБИНЕТТЕ 3 СҰРАҚҚА ЖАУАП БАР МА?
    const worldRes = await fetch(`${baseUrl}/api/world`, { headers: headers(studCookie) });
    assert.equal(worldRes.status, 200);
    const worldData = await worldRes.json();
    assert.ok(worldData.current.book.title, 'Қазір қай кітапты оқып жүрмін белгілі болуы керек');
    assert.ok(worldData.today, 'Бүгін не істеймін белгілі болуы керек');
    assert.ok(worldData.xp !== undefined, 'Қандай жетістікке жеттім белгілі болуы керек');

    // 3. МӘТІН ОҚУ (1-бөлім)
    const bookId = worldData.current.book.id;
    const chapterRes = await fetch(`${baseUrl}/api/books/${bookId}/chapters/1`, { headers: headers(studCookie) });
    assert.equal(chapterRes.status, 200);
    const chData = await chapterRes.json();
    assert.ok(chData.chapter.body.length > 50, 'Әңгіме мәтіні толық болуы керек');

    // 4. ОҚУ БАРЫСЫН БЕЛГІЛЕУ (4-бет, +10 XP)
    const logRes = await fetch(`${baseUrl}/api/books/${bookId}/logs`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({ page: 4, minutes: 15, note: 'Ерасыл маған ұнады' })
    });
    assert.equal(logRes.status, 200);
    const logData = await logRes.json();
    assert.equal(logData.xp_awarded, 10, 'Күндегі алғашқы жазбаға +10 XP берілуі керек');
    assert.equal(logData.shelf.current_page, 4);

    // 5. ҚАЙТАЛАНҒАН ОҚУ ЖАЗБАСЫ АРТЫҚ ҰПАЙ БЕРМЕЙДІ
    const dupLogRes = await fetch(`${baseUrl}/api/books/${bookId}/logs`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({ page: 5, minutes: 10, note: 'Тағы оқыдым' })
    });
    assert.equal(dupLogRes.status, 200);
    const dupLogData = await dupLogRes.json();
    assert.equal(dupLogData.xp_awarded, 0, 'Сол күнгі екінші жазбаға қайта ұпай берілмейді');

    // 6. ЖАЛПЫ БЕТ САНЫНАН АРТЫҚ БЕТТІ ҚАБЫЛДАМАЙДЫ
    const invalidLogRes = await fetch(`${baseUrl}/api/books/${bookId}/logs`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({ page: 9999, minutes: 10 })
    });
    assert.equal(invalidLogRes.status, 400, 'Жалпы беттен артық бет қабылданбауы керек');

    // 7. ОЙЫН ТАПСЫРМАСЫН ОРЫНДАУ («Кейіпкерді таны»)
    // Алдымен ойын алаңынан ашылған тапсырманы аламыз
    const playRes = await fetch(`${baseUrl}/api/play`, { headers: headers(studCookie) });
    const playData = await playRes.json();
    const charTask = playData.books[0].tasks.find(t => t.type === 'character');
    assert.ok(charTask.unlocked, '4-бет оқылған соң 2-кезең ойыны ашылуы керек');

    // Тапсырманың сұрақтарын аламыз (жауап серверде ғана жасырын)
    const taskDetailRes = await fetch(`${baseUrl}/api/tasks/${charTask.id}`, { headers: headers(studCookie) });
    const taskDetail = await taskDetailRes.json();
    const qs = taskDetail.task.payload.questions;

    // Қате жауап жіберіп көрейік (қолдау және ишара қайтаруы керек)
    const wrongAttempt = await fetch(`${baseUrl}/api/tasks/${charTask.id}/attempt`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({ answer: { choices: { [qs[0].id]: 'Қате кісі' } } })
    });
    assert.equal(wrongAttempt.status, 200);
    const wrongResData = await wrongAttempt.json();
    assert.equal(wrongResData.correct, false);
    assert.equal(wrongResData.xp_awarded, 0);
    assert.ok(wrongResData.feedback.hint, 'Қате жауаптан кейін ишара берілуі керек');

    // Дұрыс жауап жібереміз: демо әңгіме бойынша
    // Ерасыл, Күлпаш әже, Ақтөс, Нұрлан ата
    const rightChoices = {};
    for (const q of qs) {
      if (q.prompt.includes('көзілдірік')) rightChoices[q.id] = 'Ерасыл';
      else if (q.prompt.includes('қоржын')) rightChoices[q.id] = 'Күлпаш әже';
      else if (q.prompt.includes('тас белгіні')) rightChoices[q.id] = 'Ақтөс';
      else if (q.prompt.includes('жайлау') || q.prompt.includes('жаңбыр')) rightChoices[q.id] = 'Нұрлан ата';
      else rightChoices[q.id] = q.options[0];
    }

    const correctAttempt = await fetch(`${baseUrl}/api/tasks/${charTask.id}/attempt`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({ answer: { choices: rightChoices } })
    });
    assert.equal(correctAttempt.status, 200);
    const correctData = await correctAttempt.json();
    assert.equal(correctData.correct, true);
    assert.equal(correctData.xp_awarded, 10, 'Ойынды алғаш орындағанда +10 XP беріледі');

    // 8. РЕФЛЕКСИЯ ЖІБЕРУ (мұғалімге тексеруге)
    const reflRes = await fetch(`${baseUrl}/api/books/${bookId}/reflection`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({ text: 'Бұл әңгімеден достықтың және табиғатты аялаудың маңызын түсіндім.' })
    });
    assert.equal(reflRes.status, 200);
    const reflData = await reflRes.json();
    assert.equal(reflData.response.status, 'pending');

    // 9. МҰҒАЛІМ КІРЕДІ ЖӘНЕ ШОЛУ КӨРСЕТКІШТЕРІН ТЕКСЕРЕДІ
    const teacherLogin = await fetch(`${baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ role: 'teacher' })
    });
    assert.equal(teacherLogin.status, 200);
    const teacherCookie = teacherLogin.headers.get('set-cookie').split(';')[0];

    const teacherClsRes = await fetch(`${baseUrl}/api/teacher/classes`, { headers: headers(teacherCookie) });
    const teacherCls = await teacherClsRes.json();
    const myClsId = teacherCls.classes[0].id;

    const overviewRes = await fetch(`${baseUrl}/api/teacher/classes/${myClsId}/overview`, { headers: headers(teacherCookie) });
    assert.equal(overviewRes.status, 200);
    const ov = await overviewRes.json();
    assert.ok(ov.activity, '1. Оқу белсенділігі болуы керек');
    assert.ok(ov.books, '2. Кітаптар прогресі болуы керек');
    assert.ok(ov.tasks, '3. Тапсырмалар нәтижесі болуы керек');
    assert.ok(ov.pending >= 1, '4. Тексеруді күтетін жауаптар болуы керек');

    // 10. МҰҒАЛІМ ЖАУАПТЫ ТЕКСЕРІП, ҚАБЫЛДАЙДЫ (+20 XP)
    const reviewsRes = await fetch(`${baseUrl}/api/teacher/reviews?classId=${myClsId}`, { headers: headers(teacherCookie) });
    const reviews = await reviewsRes.json();
    const pendingItem = reviews.reviews.find(r => r.student.nickname === 'Құлахметова Аягөз');
    assert.ok(pendingItem, 'Құлахметова Аягөздің жауабы тексеру кезегінде тұруы керек');

    const acceptRes = await fetch(`${baseUrl}/api/teacher/reviews/${pendingItem.id}`, {
      method: 'POST',
      headers: headers(teacherCookie),
      body: JSON.stringify({ decision: 'accept', feedback: 'Өте жақсы ой түйгенсің, жарайсың!' })
    });
    assert.equal(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.equal(acceptData.status, 'accepted');
    assert.equal(acceptData.xp_awarded, 20, 'Қабылданған рефлексияға +20 XP берілуі керек');

    // 11. ОҚУШЫ МҰҒАЛІМНІҢ ПІКІРІ МЕН ЖАҢАРҒАН XP-ДІ КӨРЕДІ
    const finalWorldRes = await fetch(`${baseUrl}/api/world`, { headers: headers(studCookie) });
    const finalWorld = await finalWorldRes.json();
    assert.ok(finalWorld.feedback, 'Оқушыға мұғалімнің жаңа пікірі көрсетілуі керек');
    assert.equal(finalWorld.feedback.feedback, 'Өте жақсы ой түйгенсің, жарайсың!');
    assert.ok(finalWorld.xp >= 40, 'Оқу жазбасы + ойын + рефлексия XP-лері жинақталуы керек');

    // 12. ОҚЫРМАН КҮНДЕЛІГІ ЖӘНЕ ДӘЙЕКСӨЗ ҚОСУ (+5 XP)
    const diaryAddRes = await fetch(`${baseUrl}/api/diary`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({
        book_id: bookId,
        entry_type: 'quote',
        quote_text: 'Оқусыз білім жоқ, білімсіз күнің жоқ.',
        page_number: 10,
        student_thoughts: 'Бұл сөз маған қатты әсер етті.'
      })
    });
    assert.equal(diaryAddRes.status, 200);
    const diaryAddData = await diaryAddRes.json();
    assert.equal(diaryAddData.xp_awarded, 5, 'Күнделікке жазба қосқаны үшін +5 XP берілуі керек');

    const diaryListRes = await fetch(`${baseUrl}/api/diary`, { headers: headers(studCookie) });
    assert.equal(diaryListRes.status, 200);
    const diaryList = await diaryListRes.json();
    assert.ok(diaryList.entries.length >= 1, 'Күнделік жазбасы тізімде көрінуі керек');

    // 13. МҰҒАЛІМНІҢ САЯХАТ КАРТАСЫНЫҢ 5 КЕЗЕҢІН БАҚЫЛАУЫ
    assert.ok(ov.stage_distribution, '5 кезең бойынша үлестірім болуы керек');
    assert.equal(ov.stage_distribution.length, 5, 'Тура 5 саяхат кезеңі болуы керек');
    assert.ok(ov.students[0].journey_stage.stage_name, 'Оқушының саяхат кезеңінің қазақша атауы болуы керек');

    // 14. ҚАУІПСІЗДІК ЖӘНЕ ҚҰПИЯЛЫҚ: ОҚУШЫ МҰҒАЛІМНІҢ ӘКІМШІЛІК API-ІНЕ КІРЕ АЛМАЙДЫ
    const forbiddenRes = await fetch(`${baseUrl}/api/teacher/classes`, { headers: headers(studCookie) });
    assert.equal(forbiddenRes.status, 403, 'Оқушы мұғалім кабинетінің API-іне кіре алмауы керек (403)');

    // 15. СЫНЫП РЕЙТИНГІ (LEADERBOARD) ТЕСТІ
    const leaderRes = await fetch(`${baseUrl}/api/leaderboard`, { headers: headers(studCookie) });
    assert.equal(leaderRes.status, 200);
    const leaderData = await leaderRes.json();
    assert.ok(Array.isArray(leaderData.leaderboard), 'Рейтинг оқушылар массиві болуы керек');
    assert.ok(leaderData.leaderboard.length >= 1, 'Кемінде 1 оқушы рейтингте болуы керек');
    assert.ok(leaderData.leaderboard[0].rank === 1, '1-орын белгіленуі керек');
    assert.ok(leaderData.leaderboard[0].baiterek, 'Бәйтерек деңгейі болуы керек');

    // 16. КЕЙІПКЕРДІҢ МИНИ-ТЕСТ/КВИЗІ ЖӘНЕ КРИСТАЛДАР
    const quizRes = await fetch(`${baseUrl}/api/books/${bookId}/quiz`, { headers: headers(studCookie) });
    const quizJson = await quizRes.json();
    const quiz = quizJson.quiz;
    assert.ok(quiz, 'Квиз табылуы керек');
    assert.ok(quiz.character_name, 'Кейіпкер аты болуы керек');
    assert.ok(quiz.questions.length > 0, 'Квиз сұрақтары болуы керек');

    // Квизді дұрыс жауаптармен тапсыру
    const quizAnswers = quiz.questions.map((q) => q.correct);
    const quizSubmitRes = await fetch(`${baseUrl}/api/books/${bookId}/quiz/submit`, {
      method: 'POST',
      headers: headers(studCookie),
      body: JSON.stringify({ answers: quizAnswers })
    });
    assert.equal(quizSubmitRes.status, 200);
    const quizResult = await quizSubmitRes.json();
    assert.equal(quizResult.score, quiz.questions.length);
    assert.equal(quizResult.passed, true);
    assert.equal(quizResult.xp_awarded, 15, 'Квизден өткенде +15 XP берілуі керек');
    assert.equal(quizResult.crystals_awarded, 2, 'Квизден өткенде +2 Кристалл берілуі керек');

    // Жетістіктерде бай значоктар мен кристалдар көрінуі керек
    const achRes = await fetch(`${baseUrl}/api/achievements`, { headers: headers(studCookie) });
    assert.equal(achRes.status, 200);
    const achData = await achRes.json();
    assert.ok(achData.crystals >= 2, 'Кристалдар саны өсуі керек');
    assert.ok(Array.isArray(achData.badges), 'Жетістік белгілері болуы керек');
    assert.ok(achData.badges.length >= 7, '7 түрлі белгі болуы керек');
  } finally {
    server.close();
  }
});
