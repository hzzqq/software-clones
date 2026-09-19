-- Schema for the File Manager backend.
-- 仅保存元信息（分享短链、书签）；文件本体始终在虚拟根目录的磁盘上。
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

-- 路径分享短链：code 全局唯一，path 为相对虚拟根的路径。
CREATE TABLE IF NOT EXISTS fm_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL,
  expiry TEXT,
  created_at TEXT NOT NULL
);

-- 书签（常用目录快捷入口）
CREATE TABLE IF NOT EXISTS fm_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fm_shares_code ON fm_shares (code);
