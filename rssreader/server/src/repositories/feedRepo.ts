import { createHash } from 'crypto';
import db from '../db';
import { Feed, FeedRow } from '../types';

/**
 * 订阅源（feed）仓储：feeds 表 + 未读/总数统计。
 */

function rowToFeed(row: FeedRow, unreadCount: number, itemCount: number): Feed {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    category: row.category,
    createdAt: row.created_at,
    lastFetchedAt: row.last_fetched_at,
    unreadCount,
    itemCount,
  };
}

export interface CreateFeedInput {
  title: string;
  url: string;
  category: string;
  lastFetchedAt?: string;
}

export function findFeedByUrl(url: string): FeedRow | null {
  const row = db.prepare('SELECT * FROM feeds WHERE url = ?').get(url) as FeedRow | undefined;
  return row ?? null;
}

export function getFeedById(id: number): FeedRow | null {
  const row = db.prepare('SELECT * FROM feeds WHERE id = ?').get(id) as FeedRow | undefined;
  return row ?? null;
}

/** 创建订阅源；URL 已存在时返回 null（由路由层转 409）。 */
export function createFeed(input: CreateFeedInput): Feed | null {
  if (findFeedByUrl(input.url)) return null;
  const now = new Date().toISOString();
  const info = db
    .prepare(
      'INSERT INTO feeds (title, url, category, created_at, last_fetched_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(input.title, input.url, input.category, now, input.lastFetchedAt ?? null);
  const row = getFeedById(Number(info.lastInsertRowid)) as FeedRow;
  return rowToFeed(row, 0, 0);
}

export function listFeeds(): Feed[] {
  const rows = db
    .prepare(
      `SELECT f.*,
              (SELECT COUNT(*) FROM items i WHERE i.feed_id = f.id AND i.is_read = 0) AS unread,
              (SELECT COUNT(*) FROM items i WHERE i.feed_id = f.id) AS total
       FROM feeds f
       ORDER BY f.created_at DESC, f.id DESC`
    )
    .all() as (FeedRow & { unread: number; total: number })[];
  return rows.map((r) => rowToFeed(r, r.unread, r.total));
}

export function deleteFeed(id: number): boolean {
  const info = db.prepare('DELETE FROM feeds WHERE id = ?').run(id);
  return info.changes > 0;
}

export function updateFeedLastFetched(id: number, at: string): void {
  db.prepare('UPDATE feeds SET last_fetched_at = ? WHERE id = ?').run(at, id);
}

/** 稳定地生成文章去重 key：guid → link → title|pubDate 的 md5。 */
export function itemGuidKey(item: {
  guid: string;
  link: string;
  title: string;
  pubDate: string;
}): string {
  if (item.guid) return item.guid;
  if (item.link) return item.link;
  return createHash('md5').update(`${item.title}\n${item.pubDate}`).digest('hex');
}
