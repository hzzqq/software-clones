import db from '../db';
import type { Category } from '../types';

interface CategoryRow {
  id: number;
  name: string;
  created_at: string;
  bookmark_count: number;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    bookmarkCount: Number(row.bookmark_count ?? 0),
    createdAt: row.created_at,
  };
}

/** 列出全部分类（含书签数），按名称排序。 */
export function listCategories(): Category[] {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM bookmarks b WHERE b.category_id = c.id) AS bookmark_count
       FROM categories c
       ORDER BY c.name COLLATE NOCASE ASC`,
    )
    .all() as CategoryRow[];
  return rows.map(rowToCategory);
}

/** 按 id 查找分类；不存在返回 null。 */
export function getCategory(id: number): Category | null {
  const row = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM bookmarks b WHERE b.category_id = c.id) AS bookmark_count
       FROM categories c WHERE c.id = ?`,
    )
    .get(id) as CategoryRow | undefined;
  return row ? rowToCategory(row) : null;
}

/**
 * 创建分类。
 * @returns {Category | null} 名称重复时返回 null（调用方转为 409）。
 */
export function createCategory(name: string): Category | null {
  const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name) as
    | { id: number }
    | undefined;
  if (exists) {
    return null;
  }
  const now = new Date().toISOString();
  const info = db.prepare('INSERT INTO categories (name, created_at) VALUES (?, ?)').run(name, now);
  return getCategory(Number(info.lastInsertRowid));
}

/** 重命名分类。返回 null 表示不存在或名称被占用。 */
export function renameCategory(id: number, name: string): Category | null {
  const existing = getCategory(id);
  if (!existing) {
    return null;
  }
  const clash = db
    .prepare('SELECT id FROM categories WHERE name = ? AND id != ?')
    .get(name, id) as { id: number } | undefined;
  if (clash) {
    return null;
  }
  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id);
  return getCategory(id);
}

/** 删除分类（书签的 category_id 通过外键置空）。 */
export function deleteCategory(id: number): boolean {
  const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return info.changes > 0;
}
