import db from '../db';
import type { Bookmark, BookmarkInput } from '../types';
import { normalizeUrl, urlKey } from '../lib/url';

interface BookmarkRow {
  id: number;
  url: string;
  url_key: string;
  title: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  created_at: string;
  updated_at: string;
}

/** 列表查询过滤条件。 */
export interface BookmarkFilter {
  /** 指定分类 id；`null` 表示只看未分类；缺省表示全部。 */
  categoryId?: number | null;
  /** 关键词，匹配标题 / URL / 描述。 */
  q?: string;
}

function rowToBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 转义 LIKE 通配符，配合 ESCAPE '\' 使用。 */
function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

const SELECT_BASE = `
  SELECT b.*, c.name AS category_name
  FROM bookmarks b
  LEFT JOIN categories c ON c.id = b.category_id
`;

/** 查询书签列表，支持按分类过滤与关键词搜索，按最近创建排序。 */
export function listBookmarks(filter: BookmarkFilter = {}): Bookmark[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.categoryId !== undefined) {
    if (filter.categoryId === null) {
      clauses.push('b.category_id IS NULL');
    } else {
      clauses.push('b.category_id = ?');
      params.push(filter.categoryId);
    }
  }
  if (filter.q) {
    clauses.push(
      `(b.title LIKE ? ESCAPE '\\' OR b.url LIKE ? ESCAPE '\\' OR b.description LIKE ? ESCAPE '\\')`,
    );
    const term = `%${likeEscape(filter.q)}%`;
    params.push(term, term, term);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `${SELECT_BASE} ${where} ORDER BY b.created_at DESC, b.id DESC`;
  const rows = db.prepare(sql).all(...params) as BookmarkRow[];
  return rows.map(rowToBookmark);
}

/** 按 id 查询书签；不存在返回 null。 */
export function getBookmark(id: number): Bookmark | null {
  const row = db.prepare(`${SELECT_BASE} WHERE b.id = ?`).get(id) as BookmarkRow | undefined;
  return row ? rowToBookmark(row) : null;
}

/**
 * 创建书签。
 * @returns {{ bookmark: Bookmark; duplicate: boolean }} duplicate=true 表示 URL 与已有书签重复。
 */
export function createBookmark(input: BookmarkInput): { bookmark: Bookmark; duplicate: boolean } {
  const url = normalizeUrl(input.url);
  const key = urlKey(url);
  const title = (input.title ?? '').trim();
  const description = (input.description ?? '').trim();
  const categoryId = input.categoryId === undefined ? null : input.categoryId;

  const clash = db.prepare('SELECT id FROM bookmarks WHERE url_key = ?').get(key) as
    | { id: number }
    | undefined;
  if (clash) {
    return { bookmark: getBookmark(clash.id)!, duplicate: true };
  }

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO bookmarks (url, url_key, title, description, category_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(url, key, title, description, categoryId, now, now);
  return { bookmark: getBookmark(Number(info.lastInsertRowid))!, duplicate: false };
}

/**
 * 更新书签（部分字段）。
 * @returns {Bookmark | null} 不存在返回 null。
 * @throws 更新后 URL 与其它书签重复时抛 Error（message 含 'duplicate'，由路由层转 409）。
 */
export function updateBookmark(
  id: number,
  input: Partial<Pick<BookmarkInput, 'url' | 'title' | 'description' | 'categoryId'>>,
): Bookmark | null {
  const existing = getBookmark(id);
  if (!existing) {
    return null;
  }

  const url = input.url !== undefined ? normalizeUrl(input.url) : existing.url;
  const key = urlKey(url);
  const title = input.title !== undefined ? input.title.trim() : existing.title;
  const description =
    input.description !== undefined ? input.description.trim() : existing.description;
  const categoryId =
    input.categoryId !== undefined
      ? input.categoryId
      : existing.categoryId;

  const clash = db.prepare('SELECT id FROM bookmarks WHERE url_key = ? AND id != ?').get(key, id) as
    | { id: number }
    | undefined;
  if (clash) {
    throw new Error('duplicate url');
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE bookmarks
     SET url = ?, url_key = ?, title = ?, description = ?, category_id = ?, updated_at = ?
     WHERE id = ?`,
  ).run(url, key, title, description, categoryId, now, id);
  return getBookmark(id);
}

/** 删除书签。 */
export function deleteBookmark(id: number): boolean {
  const info = db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  return info.changes > 0;
}
