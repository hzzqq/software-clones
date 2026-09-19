// 本 spec 覆盖 vault（密码保险库）的挂载健康检查、条目 CRUD 全链路、
// 密码 AES-256-GCM 加密落库后经 API 解密还原明文的往返，以及 q 搜索/分类筛选与负路径。
// 说明：服务端实际为「API 收明文、服务端加密存储」（EntryInput.password 明文传入），
// 不存在客户端密钥派生，因此 API 层可合法完成创建/读取往返，无需伪造密文。
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('vault');
const API = `http://localhost:${APP.serverPort}/api`;

test('vault 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('vault 创建/读取/删除条目与密码解密往返 端到端', async ({ request }) => {
  const title = `e2e_vault_${Date.now()}`;
  const password = `p@ss_e2e_${Date.now()}`;

  // 1) 创建条目：密码以明文提交，服务端加密落库
  const create = await request.post(`${API}/entries`, {
    data: {
      title,
      username: 'e2e_user',
      password,
      url: 'https://example.com/login',
      notes: 'e2e smoke note',
      category: 'e2e分类',
    },
  });
  expect(create.status()).toBe(201);
  const entry = (await create.json()).data as {
    id: number;
    title: string;
    username: string;
    password: string;
    category: string;
  };
  expect(entry.id).toBeGreaterThan(0);
  expect(entry.title).toBe(title);
  expect(entry.username).toBe('e2e_user');
  expect(entry.category).toBe('e2e分类');
  // 读取侧已解密还原为明文（加密/解密往返成立）
  expect(entry.password).toBe(password);

  // 2) 详情读取同样还原明文
  const detail = await request.get(`${API}/entries/${entry.id}`);
  expect(detail.status()).toBe(200);
  expect(((await detail.json()).data as { password: string }).password).toBe(password);

  // 3) 列表包含该条目
  const list = await request.get(`${API}/entries`);
  expect(list.status()).toBe(200);
  const entries = (await list.json()).data as { id: number }[];
  expect(entries.some((e) => e.id === entry.id)).toBe(true);

  // 4) 负路径：缺 title 400、不存在 id 404
  const bad = await request.post(`${API}/entries`, { data: { username: 'x' } });
  expect(bad.status()).toBe(400);
  expect(((await bad.json()) as { code: number }).code).toBe(40001);
  const missing = await request.get(`${API}/entries/99999999`);
  expect(missing.status()).toBe(404);
  expect(((await missing.json()) as { code: number }).code).toBe(40400);

  // 5) 删除后确认消失
  const del = await request.delete(`${API}/entries/${entry.id}`);
  expect(del.status()).toBe(200);
  const gone = await request.get(`${API}/entries/${entry.id}`);
  expect(gone.status()).toBe(404);
});

test('vault 更新密码与 q 搜索/分类筛选 端到端', async ({ request }) => {
  const title = `e2e_vault_q_${Date.now()}`;

  // 0) 先建一个条目
  const create = await request.post(`${API}/entries`, {
    data: { title, password: `old_e2e_${Date.now()}`, category: 'e2e分类' },
  });
  expect(create.status()).toBe(201);
  const entry = (await create.json()).data as { id: number; password: string };

  // 1) PATCH 更新密码后读取到新明文
  const newPassword = `new_e2e_${Date.now()}`;
  const patch = await request.patch(`${API}/entries/${entry.id}`, {
    data: { password: newPassword },
  });
  expect(patch.status()).toBe(200);
  expect(((await patch.json()).data as { password: string }).password).toBe(newPassword);

  // 2) q 按标题模糊搜索能命中
  const search = await request.get(`${API}/entries?q=${title}`);
  expect(search.status()).toBe(200);
  const found = (await search.json()).data as { id: number }[];
  expect(found.some((e) => e.id === entry.id)).toBe(true);

  // 3) category 精确筛选能命中
  const byCategory = await request.get(
    `${API}/entries?category=${encodeURIComponent('e2e分类')}`
  );
  expect(byCategory.status()).toBe(200);
  const inCategory = (await byCategory.json()).data as { id: number }[];
  expect(inCategory.some((e) => e.id === entry.id)).toBe(true);

  // 4) 分类接口包含我们创建的分类
  const categories = await request.get(`${API}/entries/categories`);
  expect(categories.status()).toBe(200);
  expect(((await categories.json()).data as string[])).toContain('e2e分类');

  // 5) 负路径：空补丁 400、不存在 id 打补丁 404
  const empty = await request.patch(`${API}/entries/${entry.id}`, { data: {} });
  expect(empty.status()).toBe(400);
  const missing = await request.patch(`${API}/entries/99999999`, {
    data: { password: newPassword },
  });
  expect(missing.status()).toBe(404);

  // 6) 清理
  expect((await request.delete(`${API}/entries/${entry.id}`)).status()).toBe(200);
});
