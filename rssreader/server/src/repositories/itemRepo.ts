import db from '../db';
import { Article, ArticleRow } from '../types';
import { itemGuidKey } from './feedRepo';
import { ParsedItem } from '../lib/xml';

/**
 * 文章（item）仓储：按 feed_id + guid 去重（UNIQUE 约束 + INSERT OR IGNORE）。
 */

function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    feedId: row.feed_id,
    feedTitle: row.feed_title,
    guid: row.guid,
    title: row.title,
    link: row.link,
    description: row.description,
    content: row.content,
    author: row.author,
    pubDate: row.pub_date,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

export interface UpsertResult {
  added: number;
}

/** 把抓取到的文章批量写入；返回新增条数。 */
export function upsertItems(feedId: number, items: ParsedItem[]): UpsertResult {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO items
       (feed_id, guid, title, link, description, content, author, pub_date, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  );
  let added = 0;
  const tx = db.transaction((rows: ParsedItem[]) => {
    for (const item of rows) {
      const guid = itemGuidKey(item);
      const info = insert.run(
        feedId,
        guid,
        item.title || '(无标题)',
        item.link,
        item.description,
        item.content,
        item.author,
        item.pubDate,
        now
      );
      if (info.changes > 0) added += 1;
    }
  });
  tx(items);
  return { added };
}

export interface ArticleFilter {
  feedId?: number;
  unreadOnly?: boolean;
  q?: string;
}

/** 文章列表（可筛选订阅源 / 只看未读 / 关键词）。 */
export function listItems(filter: ArticleFilter = {}): Article[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.feedId !== undefined) {
    where.push('i.feed_id = ?');
    params.push(filter.feedId);
  }
  if (filter.unreadOnly) {
    where.push('i.is_read = 0');
  }
  if (filter.q) {
    where.push('(i.title LIKE ? OR i.description LIKE ? OR i.content LIKE ?)');
    const like = `%${filter.q}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT i.*, COALESCE(f.title, '') AS feed_title
       FROM items i
       LEFT JOIN feeds f ON f.id = i.feed_id
       ${whereSql}
       ORDER BY
         CASE WHEN i.pub_date = '' THEN 0 ELSE 1 END DESC,
         i.pub_date DESC,
         i.id DESC`
    )
    .all(...params) as ArticleRow[];
  return rows.map(rowToArticle);
}

export function getItemById(id: number): Article | null {
  const row = db
    .prepare(
      `SELECT i.*, COALESCE(f.title, '') AS feed_title
       FROM items i
       LEFT JOIN feeds f ON f.id = i.feed_id
       WHERE i.id = ?`
    )
    .get(id) as ArticleRow | undefined;
  return row ? rowToArticle(row) : null;
}

export function markItemRead(id: number): Article | null {
  const info = db.prepare('UPDATE items SET is_read = 1 WHERE id = ?').run(id);
  if (info.changes === 0) return null;
  return getItemById(id);
}

/** 把某订阅源（或全部）的文章标为已读；返回受影响行数。 */
export function markAllRead(feedId?: number): number {
  if (feedId !== undefined) {
    const info = db.prepare('UPDATE items SET is_read = 1 WHERE feed_id = ?').run(feedId);
    return info.changes;
  }
  const info = db.prepare('UPDATE items SET is_read = 1').run();
  return info.changes;
}

/** 全部未读数（列表页顶部）。 */
export function totalUnread(): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM items WHERE is_read = 0').get() as {
    n: number;
  };
  return row.n;
}
