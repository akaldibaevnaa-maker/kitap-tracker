import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

test('KitapTracker — «Кітап ағашы» модулі, API және әкімшілік баптаулар сынағы', async () => {
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
    // 1. Демо оқушы жүйеге кіреді
    const studLoginRes = await fetch(`${baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ role: 'student' })
    });
    assert.equal(studLoginRes.status, 200);
    const studCookie = studLoginRes.headers.get('set-cookie').split(';')[0];

    // 2. /api/tree сұранысы мен 7 сатылық құрылымды тексеру
    const treeRes = await fetch(`${baseUrl}/api/tree`, { headers: headers(studCookie) });
    assert.equal(treeRes.status, 200);
    const treeData = await treeRes.json();

    assert.ok(treeData.stats, 'Статистика болуы керек');
    assert.ok(treeData.stats.xp !== undefined, 'XP ұпайы болуы керек');
    assert.ok(treeData.stats.total_pages !== undefined, 'Оқылған беттер саны есептелуі керек');
    assert.ok(treeData.stats.finished_books !== undefined, 'Аяқталған кітаптар саны болуы керек');
    assert.equal(treeData.stages.length, 7, 'Дәл 7 даму сатысы болуы керек');

    assert.equal(treeData.stages[0].name, 'Тұқым');
    assert.equal(treeData.stages[1].name, 'Өскін');
    assert.equal(treeData.stages[2].name, 'Жас өркен');
    assert.equal(treeData.stages[3].name, 'Жас ағаш');
    assert.equal(treeData.stages[4].name, 'Жапырақты ағаш');
    assert.equal(treeData.stages[5].name, 'Гүлдеген ағаш');
    assert.equal(treeData.stages[6].name, 'Жемісті ағаш');

    assert.ok(treeData.current_stage, 'Ағымдағы саты анықталуы керек');
    assert.ok(Array.isArray(treeData.history), 'Даму тарихы массив болуы керек');
    assert.ok(treeData.history.length >= 1, 'Кемінде 1 тарихи оқиға болуы керек');

    // 3. Әкімші жүйеге кіріп, сатылардың табалдырықтарын өзгерту сынағы
    // Әкімшілік тіркелгісі: login demo.mugalim немесе admin
    const adminUser = db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    assert.ok(adminUser, 'Әкімші тіркелгісі болуы керек');

    // Сессия жасау: kt_sid cookie және 64 таңбалы hex token
    const crypto = await import('node:crypto');
    const adminToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(adminToken).digest('hex');
    db.run("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?,?,?)", tokenHash, adminUser.id, '2030-01-01T00:00:00Z');
    const adminCookie = `kt_sid=${adminToken}`;

    const adminTreeGet = await fetch(`${baseUrl}/api/admin/tree/config`, { headers: headers(adminCookie) });
    assert.equal(adminTreeGet.status, 200);
    const adminTreeData = await adminTreeGet.json();
    assert.equal(adminTreeData.stages.length, 7);

    // Әкімші 4-сатының табалдырығын өзгертеді
    const updateRes = await fetch(`${baseUrl}/api/admin/tree/config`, {
      method: 'PUT',
      headers: headers(adminCookie),
      body: JSON.stringify({
        stage: 4,
        min_books: 2,
        min_pages: 140,
        min_xp: 180,
        name: 'Жас ағаш (Жаңартылған)'
      })
    });
    assert.equal(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.equal(updateData.stage.min_xp, 180);
    assert.equal(updateData.stage.name, 'Жас ағаш (Жаңартылған)');

    // Оқушы қайта сұрағанда өзгертілген деректер көрінуі керек
    const reTreeRes = await fetch(`${baseUrl}/api/tree`, { headers: headers(studCookie) });
    const reTreeData = await reTreeRes.json();
    const st4 = reTreeData.stages.find(s => s.stage === 4);
    assert.equal(st4.min_xp, 180);
    assert.equal(st4.name, 'Жас ағаш (Жаңартылған)');
  } finally {
    server.close();
  }
});
