-- kanban persistence schema: board / list / card / tag / card_tag / checklist_item.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

CREATE TABLE IF NOT EXISTS board (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  wip_limit INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL REFERENCES list(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  assignee TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tag (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6'
);

CREATE TABLE IF NOT EXISTS card_tag (
  card_id INTEGER NOT NULL REFERENCES card(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);

-- 卡片检查清单（子任务）。position 为整型排序键，done=1 表示已勾选。
CREATE TABLE IF NOT EXISTS checklist_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES card(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 卡片活动时间线：系统自动事件与用户评论共用一张表。
-- kind 取值见 activityRepo.ACTIVITY_KINDS；仅 kind='comment' 允许用户删除。
-- author 为自由文本（空串表示系统 / 匿名）。
CREATE TABLE IF NOT EXISTS card_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES card(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_list_board ON list(board_id);
CREATE INDEX IF NOT EXISTS idx_card_list ON card(list_id);
CREATE INDEX IF NOT EXISTS idx_tag_board ON tag(board_id);
CREATE INDEX IF NOT EXISTS idx_checklist_card ON checklist_item(card_id);
CREATE INDEX IF NOT EXISTS idx_activity_card ON card_activity(card_id);
