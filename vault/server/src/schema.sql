-- vault persistence schema: 密码条目（密码字段以 AES-256-GCM 密文存储，绝不明文落库）。
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, datetime('now'));

CREATE TABLE IF NOT EXISTS vault_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  -- 密文：base64(iv).base64(tag).base64(ciphertext)，空串表示没有密码。
  password_enc TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '其他',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_entry_category ON vault_entry(category);
CREATE INDEX IF NOT EXISTS idx_vault_entry_title ON vault_entry(title);
