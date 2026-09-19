import db from '../db';
import { parseRefs } from '../lib/linkParser';
import { findOrCreatePage } from './pageRepo';
import type { Backlink } from '../types';

/**
 * 依据块内容重新计算其全部外链，覆盖写入 block_links：
 *  - `[[页面]]` → to_page_id（页面不存在则自动创建，复刻双链行为）
 *  - `((块id))` → to_block_id（块不存在则忽略，避免悬挂引用）
 */
export function refreshBlockLinks(blockId: number, content: string): void {
  db.prepare('DELETE FROM block_links WHERE from_block_id = ?').run(blockId);

  const { pageTitles, blockIds } = parseRefs(content);
  const insert = db.prepare(
    'INSERT INTO block_links (from_block_id, to_page_id, to_block_id) VALUES (?, ?, ?)',
  );

  for (const title of pageTitles) {
    const page = findOrCreatePage(title);
    insert.run(blockId, page.id, null);
  }
  for (const bid of blockIds) {
    const exists = db.prepare('SELECT 1 FROM blocks WHERE id = ?').get(bid);
    if (exists) {
      insert.run(blockId, null, bid);
    }
  }
}

/** 页面反链：谁（哪个块）引用了本页面。 */
export function getBacklinksForPage(pageId: number): Backlink[] {
  return db
    .prepare(
      `SELECT bl.from_block_id AS fromBlockId,
              b.content AS fromBlockContent,
              b.page_id AS fromPageId,
              p.title AS fromPageTitle
       FROM block_links bl
       JOIN blocks b ON b.id = bl.from_block_id
       JOIN pages p ON p.id = b.page_id
       WHERE bl.to_page_id = ?
       ORDER BY b.updated_at DESC, b.id DESC`,
    )
    .all(pageId) as Backlink[];
}

/** 块反链：谁（哪个块）引用了本块。 */
export function getBacklinksForBlock(blockId: number): Backlink[] {
  return db
    .prepare(
      `SELECT bl.from_block_id AS fromBlockId,
              b.content AS fromBlockContent,
              b.page_id AS fromPageId,
              p.title AS fromPageTitle
       FROM block_links bl
       JOIN blocks b ON b.id = bl.from_block_id
       JOIN pages p ON p.id = b.page_id
       WHERE bl.to_block_id = ?
       ORDER BY b.updated_at DESC, b.id DESC`,
    )
    .all(blockId) as Backlink[];
}
