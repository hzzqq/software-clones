-- Schema for the Finance terminal clone (金融终端).
-- Version table enables forward-compatible migrations.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

-- 标的基础信息（代码 + 名称 + 类型）
CREATE TABLE IF NOT EXISTS tickers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'stock'
);

-- 自选股清单
CREATE TABLE IF NOT EXISTS watchlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  created_at TEXT NOT NULL
);

-- 自选清单 ↔ 标的 多对多
CREATE TABLE IF NOT EXISTS watchlist_items (
  watchlist_id INTEGER NOT NULL,
  ticker_id INTEGER NOT NULL,
  PRIMARY KEY (watchlist_id, ticker_id),
  FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
  FOREIGN KEY (ticker_id) REFERENCES tickers(id) ON DELETE CASCADE
);

-- 行情快照（离线种子数据，可选 refresh 覆盖）
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL UNIQUE,
  price REAL,
  change REAL,
  change_pct REAL,
  volume REAL,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickers_symbol ON tickers(symbol);
CREATE INDEX IF NOT EXISTS idx_quotes_symbol ON quotes(symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_wl ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_ticker ON watchlist_items(ticker_id);
