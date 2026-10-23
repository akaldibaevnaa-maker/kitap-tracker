// Жалпы көмекші функциялар: қателер, тексеру, уақыт.

export class HttpError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function fail(status, code, extra) {
  throw new HttpError(status, code, extra);
}

const pad = (n) => String(n).padStart(2, '0');

/** Сервердің жергілікті күні: YYYY-MM-DD */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Жергілікті уақыт: YYYY-MM-DDTHH:mm:ss (күн шекарасы оқу күнімен сәйкес болуы үшін) */
export function nowIso(d = new Date()) {
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

/** Аптаның дүйсенбісі */
export function weekStart(dateStr = localDate()) {
  const d = parseDate(dateStr);
  const wd = (d.getDay() + 6) % 7;
  return addDays(dateStr, -wd);
}

export function parseJson(s, fallback) {
  if (s == null) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Мәтінді салыстыру үшін қалыпқа келтіру: тыныс белгілерсіз, кіші әріппен */
export function normText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Енгізілген деректерді тексеру
export const V = {
  str(v, field, { min = 0, max = 1000, required = true } = {}) {
    if (v == null || (typeof v === 'string' && v.trim() === '')) {
      if (required) fail(400, min > 0 ? 'too_short' : 'invalid_input', { field, min });
      return null;
    }
    if (typeof v !== 'string') fail(400, 'invalid_input', { field });
    const s = v.trim();
    if (s.length < min) fail(400, 'too_short', { field, min });
    if (s.length > max) fail(400, 'too_long', { field, max });
    return s;
  },
  int(v, field, { min = -Infinity, max = Infinity, required = true } = {}) {
    if (v == null || v === '') {
      if (required) fail(400, 'invalid_input', { field });
      return null;
    }
    const n = Number(v);
    if (!Number.isInteger(n)) fail(400, 'invalid_input', { field });
    if (n < min || n > max) fail(400, 'out_of_range', { field, min, max });
    return n;
  },
  oneOf(v, field, list, { required = true } = {}) {
    if (v == null || v === '') {
      if (required) fail(400, 'invalid_input', { field });
      return null;
    }
    if (!list.includes(v)) fail(400, 'invalid_input', { field });
    return v;
  },
  date(v, field, { required = true } = {}) {
    if (v == null || v === '') {
      if (required) fail(400, 'invalid_input', { field });
      return null;
    }
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(400, 'date_invalid', { field });
    if (localDate(parseDate(v)) !== v) fail(400, 'date_invalid', { field });
    return v;
  },
};
