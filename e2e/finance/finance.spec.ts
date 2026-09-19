/**
 * finance E2E 冒烟：应用挂载 + 后端健康；标的（ticker）与自选清单
 * （watchlist）及其条目的本地 CRUD 端到端。行情（/api/quotes、/api/refresh）
 * 可能依赖外部数据代理，不在本套件覆盖。
 */
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('finance');
const API = `http://localhost:${APP.serverPort}/api`;

/** 信封内的标的。 */
interface TickerDto {
  id: number;
  symbol: string;
  name: string;
  type: string;
}

/** 信封内的自选清单。 */
interface WatchlistDto {
  id: number;
  name: string;
  createdAt: string;
}

/** 清单详情：清单 + 条目（join tickers）。 */
interface WatchlistDetailDto extends WatchlistDto {
  items: TickerDto[];
}

test('finance 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('finance 标的创建与查询', async ({ request }) => {
  const symbol = `E2E${Date.now()}`;

  // 1) 创建标的 → 201；symbol 由服务端 trim + 大写化
  const create = await request.post(`${API}/tickers`, {
    data: { symbol, name: 'E2E 标的', type: 'stock' },
  });
  expect(create.status()).toBe(201);
  const ticker = (await create.json()).data as TickerDto;
  expect(ticker.id).toBeGreaterThan(0);
  expect(ticker.symbol).toBe(symbol);
  expect(ticker.name).toBe('E2E 标的');
  expect(ticker.type).toBe('stock');

  // 2) 列表 + 单查确认持久化
  const list = await request.get(`${API}/tickers`);
  expect(list.status()).toBe(200);
  expect(
    ((await list.json()).data as TickerDto[]).some((t) => t.id === ticker.id)
  ).toBe(true);
  const one = await request.get(`${API}/tickers/${symbol}`);
  expect(one.status()).toBe(200);
  expect(((await one.json()).data as TickerDto).id).toBe(ticker.id);

  // 3) 负路径：空 symbol → 400；不存在的 symbol → 404
  const invalid = await request.post(`${API}/tickers`, { data: { symbol: '   ' } });
  expect(invalid.status()).toBe(400);
  const missing = await request.get(`${API}/tickers/NOPE_E2E_404`);
  expect(missing.status()).toBe(404);
});

test('finance 自选清单与条目 CRUD', async ({ request }) => {
  const name = `e2e_watchlist_${Date.now()}`;

  // 0) 准备一个标的 + 一个清单
  const tickerRes = await request.post(`${API}/tickers`, {
    data: { symbol: `E2E${Date.now()}` },
  });
  expect(tickerRes.status()).toBe(201);
  const ticker = (await tickerRes.json()).data as TickerDto;

  const create = await request.post(`${API}/watchlists`, { data: { name } });
  expect(create.status()).toBe(201);
  const wl = (await create.json()).data as WatchlistDto;
  expect(wl.id).toBeGreaterThan(0);
  expect(wl.name).toBe(name);

  // 1) 添加标的 → 201，回显 watchlistId / tickerId
  const add = await request.post(`${API}/watchlists/${wl.id}/items`, {
    data: { tickerId: ticker.id },
  });
  expect(add.status()).toBe(201);
  expect((await add.json()).data as { watchlistId: number; tickerId: number }).toMatchObject({
    watchlistId: wl.id,
    tickerId: ticker.id,
  });

  // 2) 清单详情确认条目已持久化
  const detail = await request.get(`${API}/watchlists/${wl.id}`);
  expect(detail.status()).toBe(200);
  const d = (await detail.json()).data as WatchlistDetailDto;
  expect(d.name).toBe(name);
  expect(d.items.some((t) => t.id === ticker.id)).toBe(true);

  // 3) 负路径：清单不存在 → 404；tickerId 无效 → 400
  const badWl = await request.post(`${API}/watchlists/99999999/items`, {
    data: { tickerId: ticker.id },
  });
  expect(badWl.status()).toBe(404);
  const badTicker = await request.post(`${API}/watchlists/${wl.id}/items`, {
    data: { tickerId: 999999999 },
  });
  expect(badTicker.status()).toBe(400);

  // 4) 移除标的 → 200 { removed: true }；重复移除 → 404
  const remove = await request.delete(`${API}/watchlists/${wl.id}/items/${ticker.id}`);
  expect(remove.status()).toBe(200);
  expect(((await remove.json()).data as { removed: boolean }).removed).toBe(true);
  const removeAgain = await request.delete(`${API}/watchlists/${wl.id}/items/${ticker.id}`);
  expect(removeAgain.status()).toBe(404);

  // 5) 删除清单 → 200 { id }，随后详情 404
  const del = await request.delete(`${API}/watchlists/${wl.id}`);
  expect(del.status()).toBe(200);
  expect(((await del.json()).data as { id: number }).id).toBe(wl.id);
  const gone = await request.get(`${API}/watchlists/${wl.id}`);
  expect(gone.status()).toBe(404);
});
