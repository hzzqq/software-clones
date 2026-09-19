import db from '../db';
import type { Row, GridRow, GridView, Table, Field } from '../types';
import { getTable } from './tableRepo';
import { listFields } from './fieldRepo';

interface RowRow {
  id: number;
  table_id: number;
  created_at: string;
  updated_at: string;
}

function toRow(r: RowRow): Row {
  return { id: r.id, tableId: r.table_id, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** 列出某表的全部行，按 id 升序。 */
export function listRows(tableId: number): Row[] {
  const rows = db
    .prepare('SELECT id, table_id, created_at, updated_at FROM g_rows WHERE table_id = ? ORDER BY id ASC')
    .all(tableId) as RowRow[];
  return rows.map(toRow);
}

/** 按 id 查询行。 */
export function getRow(id: number): Row | null {
  const row = db
    .prepare('SELECT id, table_id, created_at, updated_at FROM g_rows WHERE id = ?')
    .get(id) as RowRow | undefined;
  return row ? toRow(row) : null;
}

/** 新增空行。 */
export function createRow(tableId: number): Row {
  const now = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO g_rows (table_id, created_at, updated_at) VALUES (?, ?, ?)')
    .run(tableId, now, now);
  return getRow(Number(info.lastInsertRowid))!;
}

/** 删除行（单元格随外键级联删除）。 */
export function deleteRow(id: number): boolean {
  const info = db.prepare('DELETE FROM g_rows WHERE id = ?').run(id);
  return info.changes > 0;
}

/** 返回行所属的表 id；不存在返回 null。 */
export function getTableIdOfRow(id: number): number | null {
  const row = db.prepare('SELECT table_id FROM g_rows WHERE id = ?').get(id) as
    | { table_id: number }
    | undefined;
  return row ? row.table_id : null;
}

interface CellRow {
  row_id: number;
  field_id: number;
  value: string | null;
}

/**
 * 网格视图：一次性取出表、字段定义与所有单元格值。
 * cells 以 fieldId -> value 形式嵌入每行，便于前端直接按列渲染。
 */
export function getGrid(tableId: number): GridView | null {
  const table: Table | null = getTable(tableId);
  if (!table) {
    return null;
  }
  const fields: Field[] = listFields(tableId);
  const rows: Row[] = listRows(tableId);

  const cellsByRow = new Map<number, Record<number, string | null>>();
  if (fields.length > 0) {
    const placeholders = fields.map(() => '?').join(',');
    const cellRows = db
      .prepare(`SELECT row_id, field_id, value FROM g_cells WHERE field_id IN (${placeholders})`)
      .all(...fields.map((f) => f.id)) as CellRow[];
    for (const c of cellRows) {
      if (!cellsByRow.has(c.row_id)) {
        cellsByRow.set(c.row_id, {});
      }
      cellsByRow.get(c.row_id)![c.field_id] = c.value;
    }
  }

  const gridRows: GridRow[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    cells: cellsByRow.get(r.id) ?? {},
  }));

  return { table, fields, rows: gridRows };
}

/** 写入（或更新）某行某字段的单元格值；并刷新行的 updated_at。 */
export function upsertCell(rowId: number, fieldId: number, value: string | null): void {
  const existing = db
    .prepare('SELECT id FROM g_cells WHERE row_id = ? AND field_id = ?')
    .get(rowId, fieldId) as { id: number } | undefined;
  if (existing) {
    db.prepare('UPDATE g_cells SET value = ? WHERE id = ?').run(value, existing.id);
  } else {
    db.prepare('INSERT INTO g_cells (row_id, field_id, value) VALUES (?, ?, ?)').run(
      rowId,
      fieldId,
      value,
    );
  }
  db.prepare('UPDATE g_rows SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), rowId);
}
