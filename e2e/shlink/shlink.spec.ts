// 本 spec 覆盖 shlink（短链接）的挂载健康检查、短链创建/详情/列表/删除、302 跳转与点击计数。
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('shlink');
const API = `http://localhost:${APP.serverPort}/api`;
const BASE = `http://localhost:${APP.serverPort}`;

test('shlink 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('shlink 创建/详情/列表/删除短链 端到端', async ({ request }) => {
  const url = `https://example.com/e2e_shlink_${Date.now()}`;
  const title = `e2e_link_${Date.now()}`;

  // 1) 创建短链：短码 slug 由服务端生成
  const create = await request.post(`${API}/links`, { data: { url, title } });
  expect(create.status()).toBe(201);
  const link = (await create.json()).data as {
    id: number;
    code: string;
    url: string;
    title: string;
    clicks: number;
  };
  expect(link.id).toBeGreaterThan(0);
  expect(link.code).toBeTruthy();
  expect(link.url).toBe(url);
  expect(link.title).toBe(title);
  expect(link.clicks).toBe(0);

  // 2) 详情读取一致
  const detail = await request.get(`${API}/links/${link.id}`);
  expect(detail.status()).toBe(200);
  expect(((await detail.json()).data as { code: string }).code).toBe(link.code);

  // 3) 列表包含该短链，且带汇总统计
  const list = await request.get(`${API}/links`);
  expect(list.status()).toBe(200);
  const body = (await list.json()).data as {
    links: { id: number }[];
    summary: { total: number; totalClicks: number };
  };
  expect(body.links.some((l) => l.id === link.id)).toBe(true);
  expect(body.summary.total).toBeGreaterThanOrEqual(1);

  // 4) 负路径：非 http/https 协议 400、不存在 id 404
  const badUrl = await request.post(`${API}/links`, {
    data: { url: 'javascript:alert(1)' },
  });
  expect(badUrl.status()).toBe(400);
  expect(((await badUrl.json()) as { code: number }).code).toBe(40001);
  const missing = await request.get(`${API}/links/99999999`);
  expect(missing.status()).toBe(404);

  // 5) 删除后确认消失
  const del = await request.delete(`${API}/links/${link.id}`);
  expect(del.status()).toBe(200);
  expect(((await del.json()).data as { id: number }).id).toBe(link.id);
  const gone = await request.get(`${API}/links/${link.id}`);
  expect(gone.status()).toBe(404);
});

test('shlink 302 跳转与点击计数 端到端', async ({ request }) => {
  const url = `https://example.com/e2e_redirect_${Date.now()}`;

  // 1) 创建短链拿到短码
  const create = await request.post(`${API}/links`, { data: { url } });
  expect(create.status()).toBe(201);
  const link = (await create.json()).data as { id: number; code: string };

  // 2) 访问 /r/:code：不跟随重定向，断言 302 与 Location
  const jump = await request.get(`${BASE}/r/${link.code}`, { maxRedirects: 0 });
  expect(jump.status()).toBe(302);
  expect(jump.headers()['location']).toBe(url);

  // 3) 点击计数已 +1
  const detail = await request.get(`${API}/links/${link.id}`);
  expect(((await detail.json()).data as { clicks: number }).clicks).toBe(1);

  // 4) 负路径：不存在的短码 404（不跟随重定向同样安全）
  const missing = await request.get(`${BASE}/r/e2e_no_such_code`, { maxRedirects: 0 });
  expect(missing.status()).toBe(404);

  // 5) 删除短链后再访问短码 → 404
  expect((await request.delete(`${API}/links/${link.id}`)).status()).toBe(200);
  const gone = await request.get(`${BASE}/r/${link.code}`, { maxRedirects: 0 });
  expect(gone.status()).toBe(404);
});
