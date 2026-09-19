-- Schema for the Pastebin clone (文本/代码粘贴板).
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

-- 粘贴板条目
CREATE TABLE IF NOT EXISTS pastes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'text',
  visibility TEXT NOT NULL DEFAULT 'public',
  expires_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pastes_code ON pastes(code);
CREATE INDEX IF NOT EXISTS idx_pastes_expires ON pastes(expires_at);
