-- Web API 客户端 Schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS requests (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL DEFAULT '',
  method   TEXT NOT NULL DEFAULT 'GET',
  url      TEXT NOT NULL DEFAULT '',
  headers  TEXT NOT NULL DEFAULT '{}',
  params   TEXT NOT NULL DEFAULT '{}',
  body     TEXT NOT NULL DEFAULT '',
  folder   TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_requests_folder ON requests(folder);

-- 环境（Environment）：一组 {{变量}} 键值，可在请求 URL / 参数 / 头 / 请求体中插值。
-- 同一时刻至多一个环境处于激活状态（is_active = 1），由仓储层保证互斥。
CREATE TABLE IF NOT EXISTS environments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL DEFAULT '',
  variables  TEXT NOT NULL DEFAULT '{}',
  is_active  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_environments_active ON environments(is_active);

CREATE TABLE IF NOT EXISTS history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  method      TEXT NOT NULL,
  url         TEXT NOT NULL,
  status      INTEGER NOT NULL,
  status_text TEXT NOT NULL DEFAULT '',
  time_ms     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);
