import { test } from 'node:test';
import assert from 'node:assert';
import db from '../db';
import { createTicker, getTickerBySymbol } from '../repositories/tickersRepo';
import { listQuotes, upsertQuote } from '../repositories/quotesRepo';

test('tickers: createTicker persists and is queryable', () => {
  const t = createTicker({ symbol: 'TESTABC', name: 'Test Co', type: 'stock' });
  assert.strictEqual(t.symbol, 'TESTABC');
  const got = getTickerBySymbol('TESTABC');
  assert.ok(got);
  assert.strictEqual(got!.id, t.id);
  // 清理测试数据，避免污染
  db.prepare('DELETE FROM tickers WHERE symbol = ?').run('TESTABC');
});

test('quotes: upsertQuote writes a snapshot', () => {
  const q = upsertQuote('TESTQ', {
    price: 123.45,
    change: 1.2,
    changePct: 0.98,
    volume: 1000,
    fetchedAt: new Date().toISOString(),
  });
  assert.strictEqual(q.symbol, 'TESTQ');
  assert.strictEqual(q.price, 123.45);
  const all = listQuotes();
  assert.ok(all.some((x) => x.symbol === 'TESTQ'));
  db.prepare('DELETE FROM quotes WHERE symbol = ?').run('TESTQ');
});
