import fs from 'fs';
import { QARA_SOZDER } from '../server/data/qara-sozder.js';

let content = fs.readFileSync('public/js/client-data.js', 'utf8');
const regex = /\{\s*"id":\s*8,\s*"title":\s*"Қара сөздер"[\s\S]*?"quiz":\s*null\s*\}/;

const replacement = JSON.stringify({
  id: 8,
  title: 'Қара сөздер',
  author: 'Абай Құнанбайұлы',
  description: 'Абайдың адамгершілік, ғылым, еңбек және парасат туралы жазылған ой-толғаулары (толық 45 қара сөз).',
  language: 'kk',
  genre: 'Философиялық проза',
  interests: 'философия,адамгершілік,ғылым',
  grade_min: 8,
  grade_max: 11,
  total_pages: 150,
  cover_color: '#4a3b2a',
  cover_emoji: '🪶',
  chapters: QARA_SOZDER,
  quiz: null
}, null, 6);

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('public/js/client-data.js', content, 'utf8');
  console.log('Successfully updated client-data.js with 45 Qara Sozder chapters!');
} else {
  console.error('Regex match failed!');
  process.exit(1);
}
