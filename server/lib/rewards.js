// Марапаттар: тек нақты оқу әрекеті арқылы ашылады. Ақылы, кездейсоқ немесе сатып алынатын марапат жоқ.
import { nowIso, localDate, weekStart } from './util.js';
import { totalXp } from './xp.js';
import { computeJourney } from './journey.js';

export const REWARDS = [
  // Жетістік белгілері
  { id: 'first_log', type: 'badge', emoji: '🌱', cond: (s) => s.logs >= 1 },
  { id: 'first_game', type: 'badge', emoji: '🎯', cond: (s) => s.games >= 1 },
  { id: 'story_path', type: 'badge', emoji: '🧭', cond: (s) => s.sequence >= 1 },
  { id: 'word_master', type: 'badge', emoji: '💎', cond: (s) => s.sentences >= 1 },
  { id: 'evidence_finder', type: 'badge', emoji: '🔍', cond: (s) => s.evidence >= 1 },
  { id: 'thinker', type: 'badge', emoji: '💡', cond: (s) => s.accepted >= 1 },
  { id: 'week_reader', type: 'badge', emoji: '📅', cond: (s) => s.weekDays >= 3 },
  { id: 'summit', type: 'badge', emoji: '🏔️', cond: (s) => s.finished >= 1 },
  // Аватар безендірулері
  { id: 'decor_feather', type: 'decor', emoji: '🪶', cond: (s) => s.xp >= 20 },
  { id: 'decor_star', type: 'decor', emoji: '⭐', cond: (s) => s.xp >= 60 },
  { id: 'decor_tulip', type: 'decor', emoji: '🌷', cond: (s) => s.accepted >= 2 },
  { id: 'decor_cap', type: 'decor', emoji: '🎓', cond: (s) => s.xp >= 120 },
  // Виртуалды сөре заттары
  { id: 'item_lamp', type: 'shelf_item', emoji: '🪔', cond: (s) => s.logs >= 3 },
  { id: 'item_globe', type: 'shelf_item', emoji: '🌍', cond: (s) => s.games >= 3 },
  { id: 'item_plant', type: 'shelf_item', emoji: '🪴', cond: (s) => s.days >= 5 },
  { id: 'item_dombra', type: 'shelf_item', emoji: '🪕', cond: (s) => s.finished >= 1 },
  // Саяхат көріністері
  { id: 'scene_steppe', type: 'scene', emoji: '🌾', cond: () => true },
  { id: 'scene_mountains', type: 'scene', emoji: '⛰️', cond: (s) => s.maxStages >= 3 },
  { id: 'scene_night', type: 'scene', emoji: '🌌', cond: (s) => s.finished >= 1 },
];

export const REWARD_IDS = new Set(REWARDS.map((r) => r.id));

export function userStats(db, userId) {
  const one = (sql, ...p) => Object.values(db.get(sql, ...p))[0] ?? 0;
  const ws = weekStart(localDate());
  const books = db.all("SELECT book_id FROM shelf WHERE user_id = ? AND status != 'want'", userId);
  let maxStages = 0;
  for (const b of books) maxStages = Math.max(maxStages, computeJourney(db, userId, b.book_id)?.done_count ?? 0);
  return {
    xp: totalXp(db, userId),
    logs: one('SELECT COUNT(*) FROM reading_logs WHERE user_id = ?', userId),
    days: one('SELECT COUNT(DISTINCT log_date) FROM reading_logs WHERE user_id = ?', userId),
    weekDays: one('SELECT COUNT(DISTINCT log_date) FROM reading_logs WHERE user_id = ? AND log_date >= ?', userId, ws),
    minutes: one('SELECT COALESCE(SUM(minutes),0) FROM reading_logs WHERE user_id = ?', userId),
    games: one('SELECT COUNT(*) FROM task_progress WHERE user_id = ? AND completed = 1', userId),
    sequence: one("SELECT COUNT(*) FROM task_progress p JOIN tasks t ON t.id = p.task_id WHERE p.user_id = ? AND p.completed = 1 AND t.type = 'sequence'", userId),
    evidence: one("SELECT COUNT(*) FROM task_progress p JOIN tasks t ON t.id = p.task_id WHERE p.user_id = ? AND p.completed = 1 AND t.type = 'evidence'", userId),
    sentences: one("SELECT COUNT(*) FROM responses WHERE user_id = ? AND kind = 'sentence'", userId),
    accepted: one("SELECT COUNT(*) FROM responses WHERE user_id = ? AND status = 'accepted'", userId),
    finished: one("SELECT COUNT(*) FROM shelf WHERE user_id = ? AND status = 'finished'", userId),
    maxStages,
  };
}

/** Жаңа ашылған марапаттарды сақтап, олардың тізімін қайтарады. */
export function checkRewards(db, userId) {
  const stats = userStats(db, userId);
  const fresh = [];
  for (const r of REWARDS) {
    if (!r.cond(stats)) continue;
    const res = db.run('INSERT OR IGNORE INTO user_rewards(user_id, reward_id, earned_at) VALUES (?,?,?)', userId, r.id, nowIso());
    if (res.changes && r.id !== 'scene_steppe') fresh.push({ id: r.id, type: r.type, emoji: r.emoji });
  }
  return fresh;
}

export function rewardInfo(id) {
  const r = REWARDS.find((x) => x.id === id);
  return r ? { id: r.id, type: r.type, emoji: r.emoji } : null;
}
