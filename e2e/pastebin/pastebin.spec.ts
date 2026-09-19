// 本 spec 覆盖 pastebin：前端挂载与后端健康检查，以及粘贴 API 的创建（短码）、公开列表持久化、删除与负路径冒烟。
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('pastebin');
const API = `http://localhost:${APP.serverPort}/api`;

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

interface PasteData {
  id: number;
  code: string;
  title: string;
  content: string;
  visibility: string;
  url: string;
}

test('pastebin 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('粘贴创建返回短码，详情与公开列表均可查询到', async ({ request }) => {
  const content = `e2e paste content ${Date.now()}`;
  const create = await request.post(`${API}/pastes`, {
    data: { content, title: 'e2e 粘贴', language: 'text', visibility: 'public' },
  });
  expect(create.status()).toBe(201);
  const created = ((await create.json()) as Envelope<PasteData>).data;
  expect(created.code).toBeTruthy();
  expect(created.url).toBe(`/${created.code}`);
  expect(created.visibility).toBe('public');

  const detail = await request.get(`${API}/pastes/${created.code}`);
  expect(detail.status()).toBe(200);
  expect(((await detail.json()) as Envelope<PasteData>).data.content).toBe(content);

  const list = await request.get(`${API}/pastes`);
  expect(list.status()).toBe(200);
  const pastes = ((await list.json()) as Envelope<PasteData[]>).data;
  expect(pastes.some((p) => p.code === created.code)).toBe(true);
});

test('删除粘贴后详情 404，缺 content 返回 400', async ({ request }) => {
  const empty = await request.post(`${API}/pastes`, { data: { title: 'e2e 无内容' } });
  expect(empty.status()).toBe(400);

  const create = await request.post(`${API}/pastes`, {
    data: { content: `e2e 删除用例 ${Date.now()}` },
  });
  expect(create.status()).toBe(201);
  const code = ((await create.json()) as Envelope<PasteData>).data.code;

  const del = await request.delete(`${API}/pastes/${code}`);
  expect(del.status()).toBe(200);
  expect(((await del.json()) as Envelope<{ code: string }>).data.code).toBe(code);

  const gone = await request.get(`${API}/pastes/${code}`);
  expect(gone.status()).toBe(404);
});
