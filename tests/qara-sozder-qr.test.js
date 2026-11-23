import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

test('Абайдың 45 қара сөзі және QR-сілтеме тексеруі', async (t) => {
  const { server, db } = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => server.close());

  await t.test('1. Абайдың толық 45 қара сөзінің дерекқорда болуы', async () => {
    const book = db.get("SELECT id, title, total_pages FROM books WHERE title = 'Қара сөздер'");
    assert.ok(book, 'Қара сөздер кітабы табылды');
    assert.equal(book.total_pages, 150, 'Бет саны 150 бет');

    const chaptersCount = db.get('SELECT COUNT(*) AS c FROM chapters WHERE book_id = ?', book.id).c;
    assert.equal(chaptersCount, 45, 'Дәл 45 қара сөз тіркелген');

    const first = db.get('SELECT * FROM chapters WHERE book_id = ? AND idx = 1', book.id);
    assert.equal(first.title, 'Бірінші сөз');
    assert.ok(first.body.includes('ақ қағаз бен қара сияны ермек қылайын'));

    const last = db.get('SELECT * FROM chapters WHERE book_id = ? AND idx = 45', book.id);
    assert.equal(last.title, 'Қырық бесінші сөз');
    assert.ok(last.body.includes('Адамзаттың бәрін сүй бауырым деп'));
  });

  await t.test('2. Қонаққа (авторизациясыз) кітап ақпаратының ашылуы', async () => {
    const book = db.get("SELECT id FROM books WHERE title = 'Қара сөздер'");
    const res = await fetch(`${baseUrl}/api/books/${book.id}`);
    assert.equal(res.status, 200, 'Қонаққа 401 емес, 200 қайтарады');
    const data = await res.json();
    assert.equal(data.chapters.length, 45);
    assert.equal(data.book.title, 'Қара сөздер');
  });

  await t.test('3. Қонаққа (авторизациясыз) 45-сөз мәтінінің ашылуы', async () => {
    const book = db.get("SELECT id FROM books WHERE title = 'Қара сөздер'");
    const res = await fetch(`${baseUrl}/api/books/${book.id}/chapters/45`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.chapter.idx, 45);
    assert.equal(data.count, 45);
    assert.ok(data.chapter.body.includes('махаббат пен ғаділет'));
  });

  await t.test('4. QR сілтемесі (/b/:id) 302 бағыттау жасайды', async () => {
    const book = db.get("SELECT id FROM books WHERE title = 'Қара сөздер'");
    const res = await fetch(`${baseUrl}/b/${book.id}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), `/#/book/${book.id}`);
  });
});
