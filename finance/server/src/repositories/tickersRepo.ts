import db from '../db';
import type { Ticker, TickerInput } from '../types';

interface TickerRow {
  id: number;
  symbol: string;
  name: string;
  type: string;
}

function rowToTicker(row: TickerRow): Ticker {
  return { id: row.id, symbol: row.symbol, name: row.name, type: row.type };
}

/** 列出全部标的（按 symbol 排序）。 */
export function listTickers(): Ticker[] {
  const rows = db
    .prepare('SELECT id, symbol, name, type FROM tickers ORDER BY symbol COLLATE NOCASE ASC')
    .all() as TickerRow[];
  return rows.map(rowToTicker);
}

/** 按 id 查询；不存在返回 null。 */
export function getTicker(id: number): Ticker | null {
  const row = db.prepare('SELECT id, symbol, name, type FROM tickers WHERE id = ?').get(id) as
    | TickerRow
    | undefined;
  return row ? rowToTicker(row) : null;
}

/** 按 symbol 查询；不存在返回 null。 */
export function getTickerBySymbol(symbol: string): Ticker | null {
  const row = db
    .prepare('SELECT id, symbol, name, type FROM tickers WHERE symbol = ?')
    .get(symbol) as TickerRow | undefined;
  return row ? rowToTicker(row) : null;
}

/** 创建标的（symbol 唯一，重复则忽略）。 */
export function createTicker(input: TickerInput): Ticker {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol) {
    throw new Error('symbol 不能为空');
  }
  const name = input.name?.trim() || symbol;
  const type = input.type?.trim() || 'stock';
  db.prepare('INSERT OR IGNORE INTO tickers (symbol, name, type) VALUES (?, ?, ?)').run(
    symbol,
    name,
    type,
  );
  return getTickerBySymbol(symbol)!;
}
