// Демо деректерді қалпына келтіру: дерекқор файлын өшіреді (келесі іске қосуда демо қайта жасалады).
// НАЗАР АУДАРЫҢЫЗ: барлық деректер өшеді.
import fs from 'node:fs';
import { DEFAULT_DB } from './app.js';

const file = process.env.KT_DB || DEFAULT_DB;
for (const f of [file, file + '-wal', file + '-shm']) if (fs.existsSync(f)) fs.rmSync(f);
console.log('Дерекқор өшірілді. Серверді қайта іске қосыңыз: npm start');
