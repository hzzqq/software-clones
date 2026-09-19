import db from '../db';
import type { Table } from '../types';

interface TableRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

function toTable(row: TableRow): Table {
  return { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at };
}

/** 列出全部表，按最近更新倒序。 */
export function listTables(): Table[] {
  const rows = db
    .prepare('SELECT id, name, created_at, updated_at FROM g_tables ORDER BY updated_at DESC, id DESC')
    .all() as TableRow[];
  return rows.map(toTable);
}

/** 按 id 查询表；不存在返回 null。 */
export function getTable(id: number): Table | null {
  const row = db
    .prepare('SELECT id, name, created_at, updated_at FROM g_tables WHERE id = ?')
    .get(id) as TableRow | undefined;
  return row ? toTable(row) : null;
}

/** 创建表。 */
export function createTable(name: string): Table {
  const now = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO g_tables (name, created_at, updated_at) VALUES (?, ?, ?)')
    .run(name, now, now);
  return getTable(Number(info.lastInsertRowid))!;
}

/** 重命名表。 */
export function updateTable(id: number, name: string): Table | null {
  if (!getTable(id)) {
    return null;
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE g_tables SET name = ?, updated_at = ? WHERE id = ?').run(name, now, id);
  return getTable(id);
}

/** 删除表（字段/行/单元格随外键级联删除）。 */
export function deleteTable(id: number): boolean {
  const info = db.prepare('DELETE FROM g_tables WHERE id = ?').run(id);
  return info.changes > 0;
}
