import db from '../db';
import type { Field, FieldType } from '../types';

interface FieldRow {
  id: number;
  table_id: number;
  name: string;
  type: string;
  options: string | null;
  sort_order: number;
}

function parseOptions(raw: string | null): string[] | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

function toField(row: FieldRow): Field {
  return {
    id: row.id,
    tableId: row.table_id,
    name: row.name,
    type: row.type as FieldType,
    options: parseOptions(row.options),
    sortOrder: row.sort_order,
  };
}

/** 列出某表的全部字段，按 sort_order 升序。 */
export function listFields(tableId: number): Field[] {
  const rows = db
    .prepare(
      'SELECT id, table_id, name, type, options, sort_order FROM g_fields WHERE table_id = ? ORDER BY sort_order ASC, id ASC',
    )
    .all(tableId) as FieldRow[];
  return rows.map(toField);
}

/** 按 id 查询字段。 */
export function getField(id: number): Field | null {
  const row = db
    .prepare('SELECT id, table_id, name, type, options, sort_order FROM g_fields WHERE id = ?')
    .get(id) as FieldRow | undefined;
  return row ? toField(row) : null;
}

/** 新增字段（追加到末尾，sort_order = 当前字段数）。 */
export function createField(
  tableId: number,
  name: string,
  type: FieldType,
  options: string[] | null,
): Field {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM g_fields WHERE table_id = ?').get(tableId) as { c: number })
    .c;
  const info = db
    .prepare(
      'INSERT INTO g_fields (table_id, name, type, options, sort_order) VALUES (?, ?, ?, ?, ?)',
    )
    .run(tableId, name, type, options ? JSON.stringify(options) : null, count);
  return getField(Number(info.lastInsertRowid))!;
}

/** 更新字段（部分字段）。 */
export function updateField(
  id: number,
  patch: Partial<{ name: string; type: FieldType; options: string[] | null; sortOrder: number }>,
): Field | null {
  const existing = getField(id);
  if (!existing) {
    return null;
  }
  const name = patch.name ?? existing.name;
  const type = patch.type ?? existing.type;
  const options = patch.options !== undefined ? patch.options : existing.options;
  const sortOrder = patch.sortOrder ?? existing.sortOrder;
  db.prepare('UPDATE g_fields SET name = ?, type = ?, options = ?, sort_order = ? WHERE id = ?').run(
    name,
    type,
    options ? JSON.stringify(options) : null,
    sortOrder,
    id,
  );
  return getField(id);
}

/** 删除字段（单元格随外键级联删除）。 */
export function deleteField(id: number): boolean {
  const info = db.prepare('DELETE FROM g_fields WHERE id = ?').run(id);
  return info.changes > 0;
}

/** 返回字段所属的表 id；不存在返回 null。 */
export function getTableIdOfField(id: number): number | null {
  const row = db.prepare('SELECT table_id FROM g_fields WHERE id = ?').get(id) as
    | { table_id: number }
    | undefined;
  return row ? row.table_id : null;
}
