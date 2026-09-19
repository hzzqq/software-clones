-- canvas (无限画布) persistence schema: canvases + nodes + edges.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

-- 画布（Canvas）。
CREATE TABLE IF NOT EXISTS canvases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT 'Untitled',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 节点（note / group / image）。坐标与尺寸为画布世界坐标（REAL）。
CREATE TABLE IF NOT EXISTS canvas_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canvas_id INTEGER NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  w REAL NOT NULL,
  h REAL NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 连线（节点 A → 节点 B，带连接点方位）。
CREATE TABLE IF NOT EXISTS canvas_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canvas_id INTEGER NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  from_id INTEGER NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  to_id INTEGER NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  from_side TEXT NOT NULL DEFAULT 'right',
  to_side TEXT NOT NULL DEFAULT 'left'
);

CREATE INDEX IF NOT EXISTS idx_canvas_nodes_canvas ON canvas_nodes(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_edges_canvas ON canvas_edges(canvas_id);
