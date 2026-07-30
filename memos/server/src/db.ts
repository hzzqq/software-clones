import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DB_PATH } from './config';

/**
 * Returns the path to `schema.sql` for the current runtime layout.
 * During `tsx watch` (dev) `__dirname` is `src/`; in the compiled `dist/`
 * build the file is copied next to the JS.
 */
function resolveSchemaPath(): string {
  const candidates: string[] = [
    path.join(__dirname, 'schema.sql'),
    path.join(__dirname, '..', 'src', 'schema.sql'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  // Fall back to the dev location.
  return candidates[0];
}

// Ensure the parent directory of the database file exists.
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

/** Shared, lazily-initialized SQLite connection (synchronous API). */
export const db: Database.Database = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/** Initialize the schema by executing `schema.sql` against the database. */
export function initSchema(): void {
  const schemaPath: string = resolveSchemaPath();
  const schema: string = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // 增量迁移：为历史库补充 user_id 列（新建库已在 schema.sql 中定义）。
  // 列已存在时 SQLite 会抛错，捕获后忽略即可（幂等）。
  try {
    db.exec('ALTER TABLE notes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0');
  } catch {
    /* 列已存在 */
  }
}

initSchema();

export default db;
