-- knowledge (双链大纲笔记) persistence schema: pages + blocks (tree) + block_links (反链).

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

-- 页面（Page）。title 全局唯一（双链按标题定位页面）。
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 大纲块（Block）。parent_id 自引用构成树；page_id 归属页面；sort_order 控制同级顺序。
CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 块间引用（反链）。from_block_id 指向引用方；to_page_id / to_block_id 指向被引用方（二选一）。
CREATE TABLE IF NOT EXISTS block_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_block_id INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  to_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  to_block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_blocks_parent ON blocks(parent_id);
CREATE INDEX IF NOT EXISTS idx_block_links_from ON block_links(from_block_id);
CREATE INDEX IF NOT EXISTS idx_block_links_to_page ON block_links(to_page_id);
CREATE INDEX IF NOT EXISTS idx_block_links_to_block ON block_links(to_block_id);
