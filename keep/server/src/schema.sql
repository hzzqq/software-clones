-- Schema for the Keep clone (极简便签).
-- Version table enables forward-compatible migrations.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

-- 便签主表
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'default',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  is_trash INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 标签定义（名称唯一）
CREATE TABLE IF NOT EXISTS note_labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- 便签 ↔ 标签 多对多映射
CREATE TABLE IF NOT EXISTS note_label_map (
  note_id INTEGER NOT NULL,
  label_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, label_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES note_labels(id) ON DELETE CASCADE
);

-- 便签内的勾选清单（checklist 项）
CREATE TABLE IF NOT EXISTS note_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(is_archived);
CREATE INDEX IF NOT EXISTS idx_notes_trash ON notes(is_trash);
CREATE INDEX IF NOT EXISTS idx_note_label_map_label ON note_label_map(label_id);
CREATE INDEX IF NOT EXISTS idx_note_items_note ON note_items(note_id);
