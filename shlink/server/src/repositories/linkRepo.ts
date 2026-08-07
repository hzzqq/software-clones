import db from '../db';
import { ShortLink, ShortLinkRow } from '../types';
import { generateUniqueShortCode, isValidShortCode } from '../lib/shortCode';

/**
 * Link repository: all SQLite access for short links lives here.
 * The schema guarantees `code` uniqueness with a UNIQUE index, and creation
 * retries with a fresh random code when a collision is detected.
 */

function rowToLink(row: ShortLinkRow): ShortLink {
  return {
    id: row.id,
    code: row.code,
    url: row.url,
    title: row.title,
    clicks: row.clicks,
    createdAt: row.created_at,
  };
}

export function isCodeTaken(code: string): boolean {
  const row = db
    .prepare('SELECT 1 FROM links WHERE code = ?')
    .get(code) as { 1: number } | undefined;
  return row !== undefined;
}

export interface CreateLinkInput {
  url: string;
  title: string;
}

/** 创建一个短链接；短码由本函数生成并做碰撞重试。 */
export function createLink(input: CreateLinkInput): ShortLink {
  const now = new Date().toISOString();
  const code = generateUniqueShortCode(isCodeTaken);
  const info = db
    .prepare('INSERT INTO links (code, url, title, clicks, created_at) VALUES (?, ?, ?, 0, ?)')
    .run(code, input.url, input.title, now);
  return getLinkById(Number(info.lastInsertRowid)) as ShortLink;
}

export function getLinkById(id: number): ShortLink | null {
  const row = db.prepare('SELECT * FROM links WHERE id = ?').get(id) as ShortLinkRow | undefined;
  return row ? rowToLink(row) : null;
}

export function getLinkByCode(code: string): ShortLink | null {
  if (!isValidShortCode(code)) return null;
  const row = db.prepare('SELECT * FROM links WHERE code = ?').get(code) as ShortLinkRow | undefined;
  return row ? rowToLink(row) : null;
}

export function listLinks(): ShortLink[] {
  const rows = db
    .prepare('SELECT * FROM links ORDER BY created_at DESC, id DESC')
    .all() as ShortLinkRow[];
  return rows.map(rowToLink);
}

export function deleteLink(id: number): boolean {
  const info = db.prepare('DELETE FROM links WHERE id = ?').run(id);
  return info.changes > 0;
}

/** 点击计数 +1，返回更新后的链接；链接不存在返回 null。 */
export function incrementClicks(id: number): ShortLink | null {
  const info = db
    .prepare('UPDATE links SET clicks = clicks + 1 WHERE id = ?')
    .run(id);
  if (info.changes === 0) return null;
  return getLinkById(id);
}

/** 汇总统计（供列表页顶部展示）。 */
export function summarizeLinks(): { total: number; totalClicks: number } {
  const row = db
    .prepare('SELECT COUNT(*) AS total, COALESCE(SUM(clicks), 0) AS totalClicks FROM links')
    .get() as { total: number; totalClicks: number };
  return { total: row.total, totalClicks: row.totalClicks };
}
