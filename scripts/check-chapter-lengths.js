import fs from 'fs';

const raw = fs.readFileSync('public/js/client-data.js', 'utf8');
const jsonStart = raw.indexOf('{');
const jsonEnd = raw.lastIndexOf('}');
const clientData = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

console.log('Total books:', clientData.books.length);
const shortChapters = [];
let totalChapters = 0;

clientData.books.forEach(b => {
  (b.chapters || []).forEach(c => {
    totalChapters++;
    const len = (c.body || '').trim().length;
    if (len < 1000) {
      shortChapters.push({
        bookId: b.id,
        bookTitle: b.title,
        chIdx: c.idx,
        chTitle: c.title,
        len
      });
    }
  });
});

console.log('Total chapters across catalog:', totalChapters);
console.log('Chapters < 1000 chars:', shortChapters.length);
shortChapters.forEach(sc => {
  console.log(`[Book ${sc.bookId}] ${sc.bookTitle} -> Ch ${sc.chIdx} (${sc.chTitle}): ${sc.len} chars`);
});
