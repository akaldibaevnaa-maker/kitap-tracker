// Ойын тапсырмалары: құрастыру, мәтінге сүйенуін тексеру, жауапты серверде тексеру.
import crypto from 'node:crypto';
import { fail, normText, parseJson, shuffle } from './util.js';

export const AUTO_TYPES = ['sequence', 'character', 'who_said', 'vocab', 'evidence'];
export const OPEN_TYPES = ['choice', 'creative'];
export const TASK_TYPES = [...AUTO_TYPES, ...OPEN_TYPES];

const rid = () => crypto.randomBytes(3).toString('hex');
const s = (v, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (field) => fail(400, 'invalid_task', { field });

/**
 * Мұғалім енгізген spec-тен оқушыға көрінетін payload пен жасырын answer жасайды.
 * Дұрыс жауап ешқашан payload ішінде болмайды.
 */
export function buildTask(type, spec) {
  if (!TASK_TYPES.includes(type)) bad('type');
  spec = spec || {};
  switch (type) {
    case 'sequence': {
      const items = (spec.items || []).map((x) => s(x)).filter(Boolean);
      if (items.length < 3 || items.length > 8) bad('items');
      const withIds = items.map((text) => ({ id: rid(), text }));
      let shuffled = shuffle(withIds);
      // Араластырылған тізім дұрыс ретпен бірдей болмауы керек
      for (let k = 0; k < 10 && shuffled.every((x, i) => x.id === withIds[i].id); k++) shuffled = shuffle(withIds);
      return { payload: { items: shuffled }, answer: { order: withIds.map((x) => x.id) } };
    }
    case 'character': {
      const qs = (spec.questions || []).map((q) => ({
        prompt: s(q.prompt),
        options: (q.options || []).map((o) => s(o, 80)).filter(Boolean),
        answer: s(q.answer, 80),
      }));
      if (!qs.length || qs.length > 8) bad('questions');
      const payload = { questions: [] };
      const answer = {};
      for (const q of qs) {
        if (!q.prompt || q.options.length < 2 || !q.options.includes(q.answer)) bad('questions');
        const id = rid();
        payload.questions.push({ id, prompt: q.prompt, options: q.options });
        answer[id] = q.answer;
      }
      return { payload, answer };
    }
    case 'who_said': {
      const quotes = (spec.quotes || []).map((q) => ({ text: s(q.text), speaker: s(q.speaker, 80) }));
      if (quotes.length < 2 || quotes.length > 8 || quotes.some((q) => !q.text || !q.speaker)) bad('quotes');
      const speakers = [...new Set([...quotes.map((q) => q.speaker), ...(spec.extraSpeakers || []).map((x) => s(x, 80)).filter(Boolean)])];
      const payload = { quotes: [], speakers };
      const answer = {};
      for (const q of shuffle(quotes)) {
        const id = rid();
        payload.quotes.push({ id, text: q.text });
        answer[id] = q.speaker;
      }
      return { payload, answer };
    }
    case 'vocab': {
      const words = (spec.words || []).map((w) => ({ word: s(w.word, 60), meaning: s(w.meaning, 300) }));
      if (words.length < 2 || words.length > 8 || words.some((w) => !w.word || !w.meaning)) bad('words');
      const payload = { words: [], meanings: [], sentence: spec.sentence !== false };
      const answer = {};
      const meanings = [];
      for (const w of words) {
        const wid = rid();
        const mid = rid();
        payload.words.push({ id: wid, word: w.word });
        meanings.push({ id: mid, text: w.meaning });
        answer[wid] = mid;
      }
      payload.meanings = shuffle(meanings);
      return { payload, answer };
    }
    case 'evidence': {
      const claims = (spec.claims || []).map((c) => ({
        claim: s(c.claim),
        options: (c.options || []).map((o) => s(o)).filter(Boolean),
        correct: Number(c.correct),
      }));
      if (!claims.length || claims.length > 6) bad('claims');
      const payload = { claims: [] };
      const answer = {};
      for (const c of claims) {
        if (!c.claim || c.options.length < 2 || !Number.isInteger(c.correct) || !c.options[c.correct]) bad('claims');
        const id = rid();
        const opts = c.options.map((text) => ({ id: rid(), text }));
        answer[id] = opts[c.correct].id;
        payload.claims.push({ id, claim: c.claim, options: shuffle(opts) });
      }
      return { payload, answer };
    }
    case 'choice': {
      const situation = s(spec.situation, 1200);
      const question = s(spec.question);
      const positions = (spec.positions || []).map((p) => s(p, 120)).filter(Boolean);
      if (!situation || !question) bad('situation');
      return { payload: { situation, question, positions }, answer: {} };
    }
    case 'creative': {
      const kinds = ['cover', 'letter', 'ending'];
      const prompts = (spec.prompts || [])
        .map((p) => ({ kind: kinds.includes(p.kind) ? p.kind : 'letter', instruction: s(p.instruction) }))
        .filter((p) => p.instruction);
      if (!prompts.length) bad('prompts');
      return { payload: { prompts }, answer: {} };
    }
  }
}

/** Тапсырмадағы дәйексөздер нақты мәтінде (немесе мұғалім үзіндісінде) бар ма? */
export function groundingIssues(type, spec, sourceText) {
  const src = ' ' + normText(sourceText) + ' ';
  const missing = [];
  const has = (t) => {
    const n = normText(t);
    return n.length > 0 && src.includes(n);
  };
  if (type === 'who_said') for (const q of spec.quotes || []) if (!has(q.text)) missing.push(q.text);
  if (type === 'evidence') for (const c of spec.claims || []) for (const o of c.options || []) if (!has(o)) missing.push(o);
  if (type === 'vocab')
    for (const w of spec.words || []) {
      const n = normText(w.word);
      const stem = n.slice(0, Math.max(3, n.length - 2));
      if (!src.includes(' ' + stem)) missing.push(w.word);
    }
  return missing;
}

/** Жауапты тексеру. Қайтарады: { correct, items: [{id, ok}] } */
export function checkAnswer(task, ans) {
  const answer = parseJson(task.answer, {});
  ans = ans || {};
  if (task.type === 'sequence') {
    const order = Array.isArray(ans.order) ? ans.order : [];
    const items = answer.order.map((id, i) => ({ id: order[i] ?? null, ok: order[i] === id }));
    return { correct: order.length === answer.order.length && items.every((x) => x.ok), items };
  }
  if (['character', 'who_said', 'evidence', 'vocab'].includes(task.type)) {
    const choices = ans.choices && typeof ans.choices === 'object' ? ans.choices : {};
    const items = Object.keys(answer).map((id) => ({ id, ok: choices[id] === answer[id] }));
    return { correct: items.every((x) => x.ok), items };
  }
  fail(400, 'not_auto_task');
}

export function publicTask(t, extra = {}) {
  return {
    id: t.id,
    book_id: t.book_id,
    class_id: t.class_id,
    type: t.type,
    stage_no: t.stage_no,
    title: t.title,
    instruction: t.instruction,
    example: t.example,
    source_excerpt: t.source_excerpt,
    source_chapter: t.source_chapter,
    payload: parseJson(t.payload, {}),
    status: t.status,
    is_demo: !!t.is_demo,
    ...extra,
  };
}

export function visibleTasks(db, userId, bookId) {
  return db.all(
    `SELECT * FROM tasks WHERE book_id = ? AND status = 'published'
       AND (class_id IS NULL OR class_id = (SELECT class_id FROM class_members WHERE user_id = ?))
     ORDER BY stage_no, id`,
    bookId, userId,
  );
}

/** Оқушы орындаған (немесе жауап жіберген) тапсырмалар жиыны */
export function doneTaskIds(db, userId) {
  const ids = new Set();
  for (const r of db.all('SELECT task_id FROM task_progress WHERE user_id = ? AND completed = 1', userId)) ids.add(r.task_id);
  for (const r of db.all(
    `SELECT r.task_id FROM responses r JOIN tasks t ON t.id = r.task_id
     WHERE r.user_id = ? AND t.type IN ('choice','creative')`, userId)) ids.add(r.task_id);
  return ids;
}

/** Бастапқы мәтін: мұғалім үзіндісі + кітаптың платформадағы мәтіні */
export function sourceTextFor(db, bookId, excerpt) {
  const chapters = db.all('SELECT body FROM chapters WHERE book_id = ? ORDER BY idx', bookId);
  return [excerpt || '', ...chapters.map((c) => c.body)].join('\n');
}
