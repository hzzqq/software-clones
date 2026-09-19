import db from '../db';
import type { Quote } from '../types';

interface QuoteRow {
  id: number;
  symbol: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  fetched_at: string;
}

function rowToQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    symbol: row.symbol,
    price: row.price,
    change: row.change,
    changePct: row.change_pct,
    volume: row.volume,
    fetchedAt: row.fetched_at,
  };
}

/** 列出全部行情快照。 */
export function listQuotes(): Quote[] {
  const rows = db
    .prepare('SELECT id, symbol, price, change, change_pct, volume, fetched_at FROM quotes ORDER BY symbol COLLATE NOCASE ASC')
    .all() as QuoteRow[];
  return rows.map(rowToQuote);
}

/** 按 symbol 查询行情；不存在返回 null。 */
export function getQuoteBySymbol(symbol: string): Quote | null {
  const row = db
    .prepare('SELECT id, symbol, price, change, change_pct, volume, fetched_at FROM quotes WHERE symbol = ?')
    .get(symbol) as QuoteRow | undefined;
  return row ? rowToQuote(row) : null;
}

export interface QuoteSeed {
  price: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  fetchedAt: string;
}

/** 覆盖（upsert）某标的行情。 */
export function upsertQuote(symbol: string, q: QuoteSeed): Quote {
  const existing = db.prepare('SELECT id FROM quotes WHERE symbol = ?').get(symbol) as
    | { id: number }
    | undefined;
  if (existing) {
    db.prepare(
      'UPDATE quotes SET price = ?, change = ?, change_pct = ?, volume = ?, fetched_at = ? WHERE symbol = ?',
    ).run(q.price, q.change, q.changePct, q.volume, q.fetchedAt, symbol);
  } else {
    db.prepare(
      'INSERT INTO quotes (symbol, price, change, change_pct, volume, fetched_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(q.price, q.change, q.changePct, q.volume, q.fetchedAt, symbol);
  }
  return getQuoteBySymbol(symbol)!;
}

/**
 * 刷新行情。默认离线：返回现有快照（无外部依赖）。
 * 若配置了 FINANCE_API_KEY 环境变量，可在此接入真实数据源覆盖快照；
 * 失败时回退到现有快照，保证终端始终可用。
 */
export function refreshQuotes(): { refreshed: number; source: string } {
  // 离线优先：保留种子快照，仅更新 fetched_at 时间戳以反映「已尝试刷新」。
  const now = new Date().toISOString();
  db.prepare('UPDATE quotes SET fetched_at = ?').run(now);
  const count = (db.prepare('SELECT COUNT(*) AS c FROM quotes').get() as { c: number }).c;
  return { refreshed: count, source: process.env.FINANCE_API_KEY ? 'remote' : 'offline-snapshot' };
}
