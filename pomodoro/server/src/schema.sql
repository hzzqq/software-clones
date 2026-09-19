-- Schema for the Pomodoro clone (番茄钟).
-- Version table enables forward-compatible migrations.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

-- 任务（番茄目标）
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  estimated_pomodoros INTEGER NOT NULL DEFAULT 1,
  completed_pomodoros INTEGER NOT NULL DEFAULT 0,
  is_done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 会话日志（只追加）。kind: focus | short_break | long_break
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_sec INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);
