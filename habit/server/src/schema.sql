-- habit persistence schema: habit + checkin（checkin 对 (habit_id, date) 唯一，防重复打卡）。
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

CREATE TABLE IF NOT EXISTS habit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✅',
  -- frequency_type: 'daily'（每天目标次数）| 'weekly'（每周目标次数）
  frequency_type TEXT NOT NULL DEFAULT 'daily',
  target_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL REFERENCES habit(id) ON DELETE CASCADE,
  -- 打卡日期（本地时区 YYYY-MM-DD）
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_checkin_habit ON checkin(habit_id);
CREATE INDEX IF NOT EXISTS idx_checkin_date ON checkin(date);
