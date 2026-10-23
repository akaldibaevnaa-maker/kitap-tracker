// Ортақ миссия: сыныптың жинақталған көрсеткіші. Оқушыға басқалардың жеке деректері берілмейді.
export const METRICS = ['reflections', 'reading_days', 'distinct_books'];

function count(db, mission, userId) {
  const members = 'SELECT user_id FROM class_members WHERE class_id = ?';
  const who = userId ? 'user_id = ?' : `user_id IN (${members})`;
  const p = userId ? [userId] : [mission.class_id];
  if (mission.metric === 'reading_days') {
    return db.get(
      `SELECT COUNT(*) AS n FROM (SELECT DISTINCT user_id, log_date FROM reading_logs WHERE ${who} AND log_date BETWEEN ? AND ?)`,
      ...p, mission.start_date, mission.end_date,
    ).n;
  }
  if (mission.metric === 'reflections') {
    return db.get(
      `SELECT COUNT(*) AS n FROM responses WHERE ${who} AND status = 'accepted' AND substr(reviewed_at, 1, 10) BETWEEN ? AND ?`,
      ...p, mission.start_date, mission.end_date,
    ).n;
  }
  if (mission.metric === 'distinct_books') {
    return db.get(
      `SELECT COUNT(DISTINCT book_id) AS n FROM reading_logs WHERE ${who} AND log_date BETWEEN ? AND ?`,
      ...p, mission.start_date, mission.end_date,
    ).n;
  }
  return 0;
}

export function missionView(db, mission, userId = null) {
  const total = count(db, mission, null);
  const out = {
    id: mission.id,
    title: mission.title,
    description: mission.description,
    metric: mission.metric,
    target: mission.target,
    start_date: mission.start_date,
    end_date: mission.end_date,
    active: !!mission.active,
    progress: total,
    remaining: Math.max(0, mission.target - total),
    percent: Math.min(100, Math.round((total / Math.max(1, mission.target)) * 100)),
  };
  if (userId) out.mine = count(db, mission, userId);
  return out;
}
