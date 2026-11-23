import test from 'node:test';
import assert from 'node:assert/strict';
import { getBaiterekLevel } from '../public/js/views/world.js';
import { calculateBookTreeStage, TREE_STAGES } from '../public/js/algorithms.js';

test('KitapTracker — 7 сатылы Бәйтерек ағашы алгоритмінің тұрақтылығы', () => {
  // 1. Деңгейлердің XP аралықтары
  const st1 = getBaiterekLevel(10);
  assert.equal(st1.level, 1);
  assert.equal(st1.name, 'Тұқым');

  const st2 = getBaiterekLevel(30);
  assert.equal(st2.level, 2);
  assert.equal(st2.name, 'Өскін');

  const st3 = getBaiterekLevel(100);
  assert.equal(st3.level, 3);
  assert.equal(st3.name, 'Жас өркен');

  const st4 = getBaiterekLevel(200);
  assert.equal(st4.level, 4);
  assert.equal(st4.name, 'Жас ағаш');

  const st5 = getBaiterekLevel(350);
  assert.equal(st5.level, 5);
  assert.equal(st5.name, 'Жапырақты ағаш');

  const st6 = getBaiterekLevel(500);
  assert.equal(st6.level, 6);
  assert.equal(st6.name, 'Гүлдеген ағаш');

  const st7 = getBaiterekLevel(750);
  assert.equal(st7.level, 7);
  assert.equal(st7.name, 'Жемісті Бәйтерек');

  // 2. algorithms.js ішіндегі 7 сатылы деректер толықтығы
  assert.equal(TREE_STAGES.length, 7);
  const stageRes = calculateBookTreeStage({ xp: 800, finishedBooks: 16, totalPages: 700 });
  assert.equal(stageRes.stage, 7);
  assert.ok(stageRes.name);
});
