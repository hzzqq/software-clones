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
}

initSchema();

export default db;
