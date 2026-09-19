-- Schema for the Gallery (self-hosted photo album) backend.
-- Version table enables forward-compatible migrations.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

-- 资源（图片）元信息。文件本体落盘，文件名用短码生成，不暴露用户文件名。
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  taken_at TEXT,
  created_at TEXT NOT NULL
);

-- 相册
CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 相册与资源的多对多关系
CREATE TABLE IF NOT EXISTS album_assets (
  album_id INTEGER NOT NULL,
  asset_id INTEGER NOT NULL,
  PRIMARY KEY (album_id, asset_id),
  FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE
);

-- 标签（去重）
CREATE TABLE IF NOT EXISTS asset_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- 资源与标签的多对多关系
CREATE TABLE IF NOT EXISTS asset_tag_map (
  asset_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (asset_id, tag_id),
  FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES asset_tags (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets (created_at);
CREATE INDEX IF NOT EXISTS idx_album_assets_asset ON album_assets (asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tag_map_tag ON asset_tag_map (tag_id);
