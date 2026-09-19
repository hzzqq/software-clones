// 本 spec 覆盖 bookmarks：前端挂载与后端健康检查，以及书签/分类 API 的创建、持久化、去重、删除与负路径冒烟。
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('bookmarks');
const API = `http://localhost:${APP.serverPort}/api`;

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

interface BookmarkData {
  id: number;
  url: string;
  title: string;
}

interface CategoryData {
  id: number;
  name: string;
}

test('bookmarks 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('书签创建后详情与列表均可查询到（持久化）', async ({ request }) => {
  const url = `https://e2e-bm-${Date.now()}.example`;
  const title = `e2e 书签 ${Date.now()}`;
  const create = await request.post(`${API}/bookmarks`, {
    data: { url, title, description: 'e2e 冒烟' },
  });
  expect(create.status()).toBe(201);
  const created = ((await create.json()) as Envelope<BookmarkData>).data;
  expect(created.id).toBeGreaterThan(0);
  // 服务端会归一化 URL：根路径去掉结尾斜杠
  expect(created.url).toBe(url);
  expect(created.title).toBe(title);

  const detail = await request.get(`${API}/bookmarks/${created.id}`);
  expect(detail.status()).toBe(200);
  expect(((await detail.json()) as Envelope<BookmarkData>).data.title).toBe(title);

  const list = await request.get(`${API}/bookmarks`);
  expect(list.status()).toBe(200);
  const bookmarks = ((await list.json()) as Envelope<BookmarkData[]>).data;
  expect(bookmarks.some((b) => b.id === created.id)).toBe(true);
});

test('书签重复创建返回 409，删除后详情 404', async ({ request }) => {
  const url = `https://e2e-dup-${Date.now()}.example`;
  const create = await request.post(`${API}/bookmarks`, {
    data: { url, title: 'e2e 去重' },
  });
  expect(create.status()).toBe(201);
  const id = ((await create.json()) as Envelope<BookmarkData>).data.id;

  // 归一化后同 URL（仅多一个结尾斜杠）重复创建必须被拒
  const dup = await request.post(`${API}/bookmarks`, {
    data: { url: `${url}/`, title: 'e2e 去重二' },
  });
  expect(dup.status()).toBe(409);

  // 缺必填字段 title → 400
  const missing = await request.post(`${API}/bookmarks`, { data: { url } });
  expect(missing.status()).toBe(400);

  const del = await request.delete(`${API}/bookmarks/${id}`);
  expect(del.status()).toBe(200);
  expect(((await del.json()) as Envelope<{ id: number }>).data.id).toBe(id);

  const gone = await request.get(`${API}/bookmarks/${id}`);
  expect(gone.status()).toBe(404);
});

test('分类创建成功并出现在分类列表', async ({ request }) => {
  const name = `e2e_cat_${Date.now()}`;
  const create = await request.post(`${API}/categories`, { data: { name } });
  expect(create.status()).toBe(201);
  const category = ((await create.json()) as Envelope<CategoryData>).data;
  expect(category.id).toBeGreaterThan(0);
  expect(category.name).toBe(name);

  const list = await request.get(`${API}/categories`);
  expect(list.status()).toBe(200);
  const categories = ((await list.json()) as Envelope<CategoryData[]>).data;
  expect(categories.some((c) => c.id === category.id && c.name === name)).toBe(true);
});
