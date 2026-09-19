import db from '../db';
import type { Watchlist, WatchlistInput } from '../types';

interface WatchlistRow {
  id: number;
  name: string;
  created_at: string;
}

function rowToWatchlist(row: WatchlistRow): Watchlist {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

/** 列出全部自选清单（含标的数量）。 */
export function listWatchlists(): Array<Watchlist & { count: number }> {
  const rows = db
    .prepare(
      `SELECT w.id, w.name, w.created_at,
              (SELECT COUNT(*) FROM watchlist_items wi WHERE wi.watchlist_id = w.id) AS count
       FROM watchlists w ORDER BY w.id ASC`,
    )
    .all() as Array<WatchlistRow & { count: number }>;
  return rows.map((r) => ({ ...rowToWatchlist(r), count: Number(r.count) }));
}

/** 按 id 查询。 */
export function getWatchlist(id: number): Watchlist | null {
  const row = db.prepare('SELECT id, name, created_at FROM watchlists WHERE id = ?').get(id) as
    | WatchlistRow
    | undefined;
  return row ? rowToWatchlist(row) : null;
}

/** 创建自选清单。 */
export function createWatchlist(input: WatchlistInput): Watchlist {
  const name = input.name?.trim() || 'My Watchlist';
  const now = new Date().toISOString();
  const info = db.prepare('INSERT INTO watchlists (name, created_at) VALUES (?, ?)').run(name, now);
  return getWatchlist(Number(info.lastInsertRowid))!;
}

/** 删除自选清单（级联删除条目）。 */
export function deleteWatchlist(id: number): boolean {
  const info = db.prepare('DELETE FROM watchlists WHERE id = ?').run(id);
  return info.changes > 0;
}

/** 列出某自选清单内的标的（join tickers）。 */
export function listWatchlistItems(id: number) {
  const rows = db
    .prepare(
      `SELECT t.id, t.symbol, t.name, t.type
       FROM watchlist_items wi JOIN tickers t ON t.id = wi.ticker_id
       WHERE wi.watchlist_id = ? ORDER BY t.symbol COLLATE NOCASE ASC`,
    )
    .all(id) as Array<{ id: number; symbol: string; name: string; type: string }>;
  return rows;
}

/** 向自选清单添加标的（去重）。 */
export function addItem(watchlistId: number, tickerId: number): void {
  db.prepare('INSERT OR IGNORE INTO watchlist_items (watchlist_id, ticker_id) VALUES (?, ?)').run(
    watchlistId,
    tickerId,
  );
}

/** 从自选清单移除标的。 */
export function removeItem(watchlistId: number, tickerId: number): boolean {
  const info = db
    .prepare('DELETE FROM watchlist_items WHERE watchlist_id = ? AND ticker_id = ?')
    .run(watchlistId, tickerId);
  return info.changes > 0;
}
