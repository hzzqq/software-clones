import db from '../db';
import type { Page } from '../types';

interface PageRow {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

function rowToPage(r: PageRow): Page {
  return { id: r.id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** 列表查询：按最近更新倒序。 */
export function listPages(): Page[] {
  return (
    db
      .prepare(
        'SELECT id, title, created_at, updated_at FROM pages ORDER BY updated_at DESC, id DESC',
      )
      .all() as PageRow[]
  ).map(rowToPage);
}

/** 按 id 查询；不存在返回 null。 */
export function getPage(id: number): Page | null {
  const r = db
    .prepare('SELECT id, title, created_at, updated_at FROM pages WHERE id = ?')
    .get(id) as PageRow | undefined;
  return r ? rowToPage(r) : null;
}

/** 按标题（大小写不敏感）查询；不存在返回 null。 */
export function getPageByTitle(title: string): Page | null {
  const r = db
    .prepare('SELECT id, title, created_at, updated_at FROM pages WHERE lower(title) = lower(?)')
    .get(title.trim()) as PageRow | undefined;
  return r ? rowToPage(r) : null;
}

/** 创建页面。 */
export function createPage(title: string): Page {
  const now = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO pages (title, created_at, updated_at) VALUES (?, ?, ?)')
    .run(title.trim(), now, now);
  return getPage(Number(info.lastInsertRowid))!;
}

/** 返回已存在页面或新建页面（双链引用目标不存在时自动创建，复刻 Logseq 行为）。 */
export function findOrCreatePage(title: string): Page {
  const existing = getPageByTitle(title);
  if (existing) {
    return existing;
  }
  return createPage(title);
}

/** 重命名页面。 */
export function updatePage(id: number, title: string): Page | null {
  const existing = getPage(id);
  if (!existing) {
    return null;
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE pages SET title = ?, updated_at = ? WHERE id = ?').run(
    title.trim(),
    now,
    id,
  );
  return getPage(id);
}

/** 删除页面（级联删除其块与引用）。 */
export function deletePage(id: number): boolean {
  const info = db.prepare('DELETE FROM pages WHERE id = ?').run(id);
  return info.changes > 0;
}

/** 按标题关键词搜索（LIKE 转义）。 */
export function searchPages(q: string): Page[] {
  const term = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  return (
    db
      .prepare(
        "SELECT id, title, created_at, updated_at FROM pages WHERE title LIKE ? ESCAPE '\\' ORDER BY updated_at DESC, id DESC LIMIT 50",
      )
      .all(term) as PageRow[]
  ).map(rowToPage);
}
