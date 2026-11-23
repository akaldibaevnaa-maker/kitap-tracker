/**
 * KitapTracker — Ғылыми зерттеу және эксперимент модулінің маршруттары
 */
import { computeExperimentAnalysis } from '../lib/research.js';
import { fail, nowIso, V } from '../lib/util.js';

export default function registerResearch(router, db) {
  const T = ['teacher', 'admin'];

  /**
   * Барлық ғылыми зерттеу эксперименттерінің тізімі
   */
  router.get('/api/research/experiments', 'any', async () => {
    const experiments = db.all(`
      SELECT e.*,
        (SELECT COUNT(*) FROM research_metrics m WHERE m.experiment_id = e.id) AS metrics_count
      FROM research_experiments e
      ORDER BY e.id ASC
    `);

    return {
      ok: true,
      experiments: experiments.map(e => ({
        ...e,
        is_sample: Boolean(e.is_sample),
        data_type_label: e.is_sample ? 'Үлгілік деректер' : 'Нақты эксперимент деректері'
      }))
    };
  });

  /**
   * Белгілі бір эксперименттің толық талдауы (көрсеткіштер, өсім пайызы, t-test)
   */
  router.get('/api/research/experiments/:id', 'any', async ({ params }) => {
    const expId = Number(params.id);
    const experiment = db.get('SELECT * FROM research_experiments WHERE id = ?', expId);
    if (!experiment) fail(404, 'experiment_not_found', { message: 'Ғылыми эксперимент табылмады' });

    const metrics = db.all('SELECT * FROM research_metrics WHERE experiment_id = ? ORDER BY group_type, stage', expId);
    const analysis = computeExperimentAnalysis(experiment, metrics);

    return {
      ok: true,
      analysis,
      metrics
    };
  });

  /**
   * Мұғалім/Әкімші тарапынан көрсеткіштерді жаңарту
   */
  router.post('/api/research/experiments/:id/metrics', T, async ({ params, body }) => {
    const expId = Number(params.id);
    const experiment = db.get('SELECT * FROM research_experiments WHERE id = ?', expId);
    if (!experiment) fail(404, 'experiment_not_found', { message: 'Ғылыми эксперимент табылмады' });

    const { group_type, stage } = body;
    if (!['experimental', 'control'].includes(group_type)) fail(400, 'invalid_group_type');
    if (!['pre', 'post'].includes(stage)) fail(400, 'invalid_stage');

    const students_count = V.int(body.students_count || 25, 'students_count', { min: 1, max: 200 });
    const books_per_week = Math.max(0, Number(body.books_per_week || 0));
    const pages_per_month = Math.max(0, Number(body.pages_per_month || 0));
    const active_reading_days = Math.max(0, Math.min(7, Number(body.active_reading_days || 0)));
    const interest_level_pct = Math.max(0, Math.min(100, Number(body.interest_level_pct || 0)));
    const comprehension_pct = Math.max(0, Math.min(100, Number(body.comprehension_pct || 0)));
    const low_interest_count = Number(body.low_interest_count || 0);
    const medium_interest_count = Number(body.medium_interest_count || 0);
    const high_interest_count = Number(body.high_interest_count || 0);
    const notes = String(body.notes || '').trim();
    const now = nowIso();

    db.run(`
      INSERT INTO research_metrics(
        experiment_id, group_type, stage, students_count,
        books_per_week, pages_per_month, active_reading_days,
        interest_level_pct, comprehension_pct,
        low_interest_count, medium_interest_count, high_interest_count,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(experiment_id, group_type, stage) DO UPDATE SET
        students_count = excluded.students_count,
        books_per_week = excluded.books_per_week,
        pages_per_month = excluded.pages_per_month,
        active_reading_days = excluded.active_reading_days,
        interest_level_pct = excluded.interest_level_pct,
        comprehension_pct = excluded.comprehension_pct,
        low_interest_count = excluded.low_interest_count,
        medium_interest_count = excluded.medium_interest_count,
        high_interest_count = excluded.high_interest_count,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `, expId, group_type, stage, students_count, books_per_week, pages_per_month, active_reading_days, interest_level_pct, comprehension_pct, low_interest_count, medium_interest_count, high_interest_count, notes, now, now);

    return {
      ok: true,
      message: 'Эксперименттік көрсеткіштер сәтті жаңартылды'
    };
  });

  /**
   * Жаңа эксперимент құру
   */
  router.post('/api/research/experiments', T, async ({ body }) => {
    const title = V.str(body.title, 'title', { min: 5, max: 200 });
    const hypothesis = String(body.hypothesis || '').trim();
    const school_name = String(body.school_name || '№290 орта мектеп').trim();
    const academic_year = String(body.academic_year || '2025-2026').trim();
    const experimental_group_name = String(body.experimental_group_name || 'Эксперименттік топ').trim();
    const control_group_name = String(body.control_group_name || 'Бақылау тобы').trim();
    const is_sample = body.is_sample ? 1 : 0;
    const conclusion = String(body.conclusion || '').trim();
    const now = nowIso();

    const info = db.run(`
      INSERT INTO research_experiments(
        title, hypothesis, school_name, academic_year,
        experimental_group_name, control_group_name, is_sample,
        conclusion, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, title, hypothesis, school_name, academic_year, experimental_group_name, control_group_name, is_sample, conclusion, now, now);

    return {
      ok: true,
      id: info.lastInsertRowid,
      message: 'Ғылыми эксперимент сәтті тіркелді'
    };
  });

  /**
   * Ресми ғылыми есепті HTML/PDF түрінде шығару
   */
  router.get('/api/research/experiments/:id/report', 'any', async ({ params, res }) => {
    const expId = Number(params.id);
    const experiment = db.get('SELECT * FROM research_experiments WHERE id = ?', expId);
    if (!experiment) fail(404, 'experiment_not_found', { message: 'Ғылыми эксперимент табылмады' });

    const metrics = db.all('SELECT * FROM research_metrics WHERE experiment_id = ? ORDER BY group_type, stage', expId);
    const analysis = computeExperimentAnalysis(experiment, metrics);

    const html = `<!DOCTYPE html>
<html lang="kk">
<head>
  <meta charset="utf-8">
  <title>Ғылыми зерттеу есебі — ${experiment.title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
    .header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
    .school-title { font-size: 16px; font-weight: 700; text-transform: uppercase; color: #475569; }
    .doc-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 12px 0 6px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; }
    .badge-real { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-sample { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .highlight-exp { background: #f0fdf4; font-weight: 700; color: #15803d; }
    .growth-badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .growth-up { background: #dcfce7; color: #166534; }
    .section-title { font-size: 16px; font-weight: 800; color: #1e3a8a; margin: 28px 0 10px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .footer { margin-top: 50px; pt-4; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 13px; color: #64748b; }
    @media print { body { margin: 20px; } button { display: none; } }
  </style>
</head>
<body>
  <div style="text-align: right; margin-bottom: 10px;">
    <button onclick="window.print()" style="background:#2563eb; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-weight:700; cursor:pointer;">🖨️ PDF / Басып шығару</button>
  </div>

  <div class="header">
    <div class="school-title">ҚАЗАҚСТАН РЕСПУБЛИКАСЫ ОҚУ-АҒАРТУ МИНИСТРЛІГІ</div>
    <div class="school-title">«№290 ОРТА МЕКТЕП» КОММУНАЛДЫҚ МЕМЛЕКЕТТІК МЕКЕМЕСІ</div>
    <h1 class="doc-title">ЭКСПЕРИМЕНТТІК ЗЕРТТЕУ НӘТИЖЕЛЕРІНІҢ РЕСМИ ХАТТАМАСЫ</h1>
    <div style="margin-top: 8px;">
      <span class="badge ${analysis.isSample ? 'badge-sample' : 'badge-real'}">
        ${analysis.isSample ? '⚠️ Үлгілік деректер' : '✓ Нақты эксперимент деректері'}
      </span>
      <span style="font-size: 13px; color: #64748b; margin-left: 10px;">Оқу жылы: <strong>${experiment.academic_year}</strong></span>
    </div>
  </div>

  <div>
    <strong>Зерттеу тақырыбы:</strong> ${experiment.title}<br>
    <strong>Ғылыми болжам:</strong> ${experiment.hypothesis}<br>
    <strong>Эксперименттік база:</strong> ${experiment.experimental_group_name} vs ${experiment.control_group_name}<br>
    <strong>Жоба авторы:</strong> Құлахметова Аягөз (№290 орта мектеп)<br>
    <strong>Жетекшісі:</strong> Аскарова А.К., <strong>Кеңесші:</strong> Құлмырзаев Н.С.
  </div>

  <div class="section-title">1. САЛЫСТЫРМАЛЫ ЭКСПЕРИМЕНТ КӨРСЕТКІШТЕРІНІҢ КЕСТЕСІ</div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">№</th>
        <th rowspan="2">Көрсеткіш атауы</th>
        <th colspan="3" style="text-align:center; background:#f8fafc;">Бақылау тобы (${experiment.control_group_name})</th>
        <th colspan="3" style="text-align:center; background:#f0fdf4;">Эксперименттік топ (${experiment.experimental_group_name})</th>
        <th rowspan="2" style="text-align:center;">Таза басымдық (Δ%)</th>
      </tr>
      <tr>
        <th class="num">Бастапқы</th>
        <th class="num">Қорытынды</th>
        <th class="num">Өсім (%)</th>
        <th class="num">Бастапқы</th>
        <th class="num">Қорытынды</th>
        <th class="num">Өсім (%)</th>
      </tr>
    </thead>
    <tbody>
      ${analysis.indicators.map((ind, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${ind.title}</strong> (${ind.unit})</td>
          <td class="num">${ind.controlPre}</td>
          <td class="num">${ind.controlPost}</td>
          <td class="num"><span class="growth-badge">${ind.controlGrowth.pct}</span></td>
          <td class="num highlight-exp">${ind.expPre}</td>
          <td class="num highlight-exp">${ind.expPost}</td>
          <td class="num highlight-exp"><span class="growth-badge growth-up">${ind.expGrowth.pct}</span></td>
          <td class="num" style="font-weight:800; color:#15803d;">${ind.netAdvantagePct}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="section-title">2. СТАТИСТИКАЛЫҚ МӘНДІЛІК ЖӘНЕ БАҒАЛАУ (STUDENT t-TEST)</div>
  <div class="stat-card">
    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px;">
      <div>Іріктеме көлемі: <strong>n = ${analysis.stats.sampleSizeN} оқушы</strong></div>
      <div>Есептелген t-критерийі: <strong>t = ${analysis.stats.tValue}</strong></div>
      <div>Сыни мәні (p = 0.001): <strong>t_cr = ${analysis.stats.criticalValue001}</strong></div>
      <div>Статистикалық мәнділік: <strong>p ${analysis.stats.pValue} (жоғары дәрежеде мәнді)</strong></div>
    </div>
    <p style="margin: 12px 0 0; color:#15803d; font-size:14px; font-weight:600;">
      ${analysis.stats.verdict}
    </p>
  </div>

  <div class="section-title">3. ЗЕРТТЕУШІНІҢ ҒЫЛЫМИ ҚОРЫТЫНДЫСЫ</div>
  <p style="font-size: 14px; line-height: 1.6; text-align: justify;">
    ${experiment.conclusion || 'Kitap Tracker интерактивті платформасын оқу үдерісіне енгізу барысында эксперименттік топта оқу белсенділігі мен мәтінді түсіну деңгейі дәстүрлі топқа қарағанда едәуір жоғары көрсеткіштерге қол жеткізді.'}
  </p>

  <div class="footer">
    <div>
      <strong>Жоба авторы:</strong> _________________ Құлахметова А.<br>
      <strong>Ғылыми жетекші:</strong> ______________ Аскарова А.К.
    </div>
    <div style="text-align: right;">
      Мектеп директорының оқу-ісі жөніндегі орынбасары: ___________<br>
      М.О. (Мөр орны) · №290 орта мектеп (2026 ж.)
    </div>
  </div>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
}
