-- gridbase schema (EAV model): dynamic structured data without runtime ALTER TABLE.
-- Metadata: g_tables / g_fields.  Data: g_rows / g_cells.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

-- 表（元数据）
CREATE TABLE IF NOT EXISTS g_tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 字段（元数据，动态结构）。options 以 JSON 存 select 选项数组。
CREATE TABLE IF NOT EXISTS g_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id INTEGER NOT NULL REFERENCES g_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  options TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 行（数据容器）
CREATE TABLE IF NOT EXISTS g_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id INTEGER NOT NULL REFERENCES g_tables(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 单元格（EAV：每个 cell 是 field_id 在某 row 上的取值）
CREATE TABLE IF NOT EXISTS g_cells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row_id INTEGER NOT NULL REFERENCES g_rows(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES g_fields(id) ON DELETE CASCADE,
  value TEXT,
  UNIQUE (row_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_g_fields_table ON g_fields(table_id);
CREATE INDEX IF NOT EXISTS idx_g_rows_table ON g_rows(table_id);
CREATE INDEX IF NOT EXISTS idx_g_cells_field ON g_cells(field_id);
CREATE INDEX IF NOT EXISTS idx_g_cells_row ON g_cells(row_id);
