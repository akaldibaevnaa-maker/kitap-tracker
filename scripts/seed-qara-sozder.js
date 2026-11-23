import { openDb } from '../server/db.js';
import { QARA_SOZDER } from '../server/data/qara-sozder.js';

const db = openDb('data/kitaptracker.db');
const book = db.get("SELECT id FROM books WHERE title = 'Қара сөздер'");
if (!book) {
  console.error('Book Қара сөздер not found!');
  process.exit(1);
}

db.tx(() => {
  db.run('DELETE FROM chapters WHERE book_id = ?', book.id);
  for (const ch of QARA_SOZDER) {
    db.run(
      'INSERT INTO chapters(book_id, idx, title, body, page_start, page_end) VALUES (?, ?, ?, ?, ?, ?)',
      book.id, ch.idx, ch.title, ch.body, ch.page_start, ch.page_end
    );
  }
  db.run('UPDATE books SET total_pages = 150 WHERE id = ?', book.id);
});

const count = db.get('SELECT COUNT(*) AS c FROM chapters WHERE book_id = ?', book.id).c;
console.log('Successfully inserted chapters for Қара сөздер. Total count:', count);
