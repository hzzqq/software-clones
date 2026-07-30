import { test, request as requestModule, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('memos');
const API = `http://localhost:${APP.serverPort}/api`;

test('memos 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await requestModule.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

/**
 * 真正的端到端：注册 → 建笔记 → 服务端持久化 → 前端登录后 UI 可见。
 *
 * 注意：这里的 `request` 是 Playwright 的 APIRequestContext **fixture 本身**，
 * 直接用即可；它没有 newContext()（那是 `request` 模块上的方法）——踩过这个坑。
 */
test('memos 注册/登录/建笔记 端到端', async ({ page, request }) => {
  const email = `e2e_${Date.now()}@test.com`;
  const password = 'secret1';

  // 1) 注册，拿到会话令牌
  const reg = await request.post(`${API}/auth/register`, {
    data: { email, displayName: 'E2E', password },
  });
  expect(reg.status()).toBe(201);
  const { token } = (await reg.json()).data as { token: string };
  expect(token).toBeTruthy();

  // 2) 带令牌建笔记
  const create = await request.post(`${API}/notes`, {
    data: { content: 'e2e note #hello', visibility: 'private' },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(create.status()).toBe(201);
  const note = (await create.json()).data as { id: number; tags?: string[] };

  // 3) 服务端确实持久化到 SQLite（同一用户可见）
  const list = await request.get(`${API}/notes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const notes = (await list.json()).data as { id: number }[];
  expect(notes.some((n) => n.id === note.id)).toBe(true);

  // 4) 无令牌必须被拒（鉴权真的生效，而非摆设）
  const anon = await request.get(`${API}/notes`);
  expect(anon.status()).toBe(401);

  // 5) 前端登录后能看到该笔记（UI → API → SQLite 全链路）
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  // 笔记在卡片标题和正文各渲染一次，用 first() 避开 strict mode 冲突
  await expect(page.getByText('e2e note #hello').first()).toBeVisible();
  // 标签解析结果也应出现在 UI 上
  await expect(page.getByText('hello').first()).toBeVisible();
});
