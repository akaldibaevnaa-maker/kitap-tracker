// Әкімші: жалпы каталог және жүйе шолуы (оқушылардың жеке деректерін көрсетпейді).
import { fail, nowIso, V } from '../lib/util.js';

export default function register(r, db) {
  const A = ['admin'];

  r.get('/api/admin/summary', A, () => {
    const count = (sql) => db.get(sql).n;
    return {
      counts: {
        students: count("SELECT COUNT(*) AS n FROM users WHERE role = 'student'"),
        teachers: count("SELECT COUNT(*) AS n FROM users WHERE role = 'teacher'"),
        classes: count('SELECT COUNT(*) AS n FROM classes'),
        books: count("SELECT COUNT(*) AS n FROM books WHERE visibility = 'public'"),
        logs: count('SELECT COUNT(*) AS n FROM reading_logs'),
      },
      classes: db.all(
        `SELECT c.id, c.name, c.level, c.is_demo, u.nickname AS teacher,
                (SELECT COUNT(*) FROM class_members m WHERE m.class_id = c.id) AS students
         FROM classes c JOIN users u ON u.id = c.teacher_id ORDER BY c.id`,
      ),
      books: db.all(
        `SELECT b.id, b.title, b.author, b.language, b.genre, b.grade_min, b.grade_max, b.total_pages, b.is_demo,
                (SELECT COUNT(*) FROM shelf s WHERE s.book_id = b.id) AS readers
         FROM books b WHERE b.visibility = 'public' ORDER BY b.title`,
      ),
    };
  });

  r.post('/api/admin/books', A, ({ body }) => {
    const gradeMin = V.int(body.gradeMin ?? 1, 'gradeMin', { min: 1, max: 11 });
    const id = db.run(
      `INSERT INTO books(title, author, description, language, genre, interests, grade_min, grade_max, total_pages, cover_color, cover_emoji, visibility, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'public',?)`,
      V.str(body.title, 'title', { min: 1, max: 120 }),
      V.str(body.author, 'author', { min: 1, max: 80 }),
      V.str(body.description, 'description', { max: 600, required: false }) || '',
      V.oneOf(body.language || 'kk', 'language', ['kk', 'ru', 'en', 'other']),
      V.str(body.genre, 'genre', { max: 40, required: false }) || '',
      V.str(body.interests, 'interests', { max: 120, required: false }) || '',
      gradeMin,
      V.int(body.gradeMax ?? 11, 'gradeMax', { min: gradeMin, max: 11 }),
      V.int(body.totalPages, 'totalPages', { min: 1, max: 5000, required: false }),
      '#7b4f2c', '📙', nowIso(),
    ).lastInsertRowid;
    return { id };
  });

  r.delete('/api/admin/books/:id', A, ({ params }) => {
    const b = db.get("SELECT * FROM books WHERE id = ? AND visibility = 'public'", Number(params.id));
    if (!b) fail(404, 'not_found');
    if (db.get('SELECT 1 AS x FROM shelf WHERE book_id = ? LIMIT 1', b.id)) fail(409, 'book_in_use');
    db.run('DELETE FROM books WHERE id = ?', b.id);
    return { ok: true };
  });
}
