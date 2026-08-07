import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DB_PATH } from './config';

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

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db: Database.Database = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

interface TableInfoRow {
  name: string;
}

/**
 * 判断某张表是否已存在指定列。用于「已有库」的平滑迁移：
 * `CREATE TABLE IF NOT EXISTS` 对已存在的表不会补列，必须显式 ALTER。
 */
function hasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as TableInfoRow[];
  return rows.some((r) => r.name === column);
}

/**
 * 幂等地为已有表补列。列已存在时直接跳过，避免重复 ALTER 抛错。
 * @param table 表名（内部常量，不来自用户输入）
 * @param column 列名
 * @param ddl 列定义片段，如 `assignee TEXT NOT NULL DEFAULT ''`
 */
function addColumnIfMissing(table: string, column: string, ddl: string): void {
  if (hasColumn(table, column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

/**
 * 执行 schema.sql，并对历史数据库做增量迁移。
 * 迁移必须是「加法式」的：只新增列 / 表，不改动已有数据语义。
 */
export function initSchema(): void {
  const schemaPath: string = resolveSchemaPath();
  const schema: string = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // ---- 增量迁移（老库补列）----
  // cycle 270：卡片指派人
  addColumnIfMissing('card', 'assignee', "assignee TEXT NOT NULL DEFAULT ''");
  // cycle 271：列 WIP 限制（0 = 不限制）
  addColumnIfMissing('list', 'wip_limit', 'wip_limit INTEGER NOT NULL DEFAULT 0');
}

initSchema();

export default db;
