import { db } from '../db';
import type { Design, CreateDesignInput, UpdateDesignInput } from '../types';

function rowToDesign(row: Record<string, unknown>): Design {
  return {
    id: row.id as number,
    name: row.name as string,
    thumbnail: row.thumbnail as string,
    data: row.data as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** 列出全部设计，按最近更新倒序。 */
export function listDesigns(): Design[] {
  const rows = db.prepare('SELECT * FROM designs ORDER BY updated_at DESC').all() as Record<
    string,
    unknown
  >[];
  return rows.map(rowToDesign);
}

/** 按 id 获取单个设计。 */
export function getDesign(id: number): Design | undefined {
  const row = db.prepare('SELECT * FROM designs WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToDesign(row) : undefined;
}

/** 创建设计；data 为合成后的 PNG dataURL。 */
export function createDesign(input: CreateDesignInput): Design {
  const result = db
    .prepare('INSERT INTO designs (name, thumbnail, data) VALUES (?, ?, ?)')
    .run(input.name ?? '未命名设计', input.thumbnail ?? '', input.data);
  const id = Number(result.lastInsertRowid);
  return getDesign(id) as Design;
}

/** 更新设计字段（缺省字段沿用旧值），并刷新 updated_at。 */
export function updateDesign(id: number, input: UpdateDesignInput): Design | undefined {
  const existing = getDesign(id);
  if (!existing) return undefined;
  const name = input.name ?? existing.name;
  const thumbnail = input.thumbnail ?? existing.thumbnail;
  const data = input.data ?? existing.data;
  db.prepare(
    "UPDATE designs SET name = ?, thumbnail = ?, data = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name, thumbnail, data, id);
  return getDesign(id);
}

/** 删除设计，返回是否成功。 */
export function deleteDesign(id: number): boolean {
  const result = db.prepare('DELETE FROM designs WHERE id = ?').run(id);
  return result.changes > 0;
}
