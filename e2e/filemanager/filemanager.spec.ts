/**
 * filemanager 冒烟：应用挂载 + 后端健康；目录浏览/文本预览（含越界负路径）、
 * 书签 CRUD、分享短链创建/短码下载/删除的真实 API 端到端。
 */
import { test, request as requestModule, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('filemanager');
const API = `http://localhost:${APP.serverPort}/api`;

test('filemanager 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await requestModule.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('filemanager 目录浏览与文本预览 端到端', async ({ request }) => {
  // 1) 浏览根目录：返回 BrowseResult，根路径为 /
  const root = await request.get(`${API}/browse?path=${encodeURIComponent('/')}`);
  expect(root.status()).toBe(200);
  const rootData = (await root.json()).data as { path: string; parent: string; entries: unknown[] };
  expect(rootData.path).toBe('/');
  expect(rootData.parent).toBe('/');
  expect(Array.isArray(rootData.entries)).toBe(true);
  // 启动时种子文件必然存在（index.ts 调用 seedFmRootIfEmpty）
  const names = rootData.entries as { name: string }[];
  expect(names.some((e) => e.name === 'README.txt')).toBe(true);

  // 2) 越界路径被拒绝（400），不存在的路径 404
  const escape = await request.get(`${API}/browse?path=${encodeURIComponent('../../etc')}`);
  expect(escape.status()).toBe(400);
  const missing = await request.get(`${API}/browse?path=${encodeURIComponent('/no_such_dir_e2e')}`);
  expect(missing.status()).toBe(404);

  // 3) 预览种子文本文件，内容原样返回（text/plain）
  const preview = await request.get(
    `${API}/preview?path=${encodeURIComponent('/samples/hello.txt')}`
  );
  expect(preview.status()).toBe(200);
  const text = await preview.text();
  expect(text).toContain('Hello from the file manager sample file.');

  // 4) 预览不存在的文件 404
  const previewMissing = await request.get(
    `${API}/preview?path=${encodeURIComponent('/no_such_file_e2e.txt')}`
  );
  expect(previewMissing.status()).toBe(404);
});

test('filemanager 书签 CRUD 端到端', async ({ request }) => {
  const name = `e2e_bookmark_${Date.now()}`;

  // 1) 创建书签
  const create = await request.post(`${API}/bookmarks`, { data: { path: '/', name } });
  expect(create.status()).toBe(201);
  const bookmark = (await create.json()).data as { id: number; path: string; name: string };
  expect(bookmark.id).toBeGreaterThan(0);
  expect(bookmark.name).toBe(name);
  expect(bookmark.path).toBe('/');

  // 2) 列表可见；缺名称被拒（400）
  const list = await request.get(`${API}/bookmarks`);
  expect(list.status()).toBe(200);
  const bookmarks = (await list.json()).data as { id: number }[];
  expect(bookmarks.some((b) => b.id === bookmark.id)).toBe(true);
  const bad = await request.post(`${API}/bookmarks`, { data: { path: '/' } });
  expect(bad.status()).toBe(400);

  // 3) 删除不存在的书签 404
  const missing = await request.delete(`${API}/bookmarks/99999999`);
  expect(missing.status()).toBe(404);

  // 4) 删除后列表不再包含
  const del = await request.delete(`${API}/bookmarks/${bookmark.id}`);
  expect(del.status()).toBe(200);
  const after = await request.get(`${API}/bookmarks`);
  const remain = (await after.json()).data as { id: number }[];
  expect(remain.some((b) => b.id === bookmark.id)).toBe(false);
});

test('filemanager 分享短链 端到端', async ({ request }) => {
  // 1) 分享种子文件 README.txt
  const create = await request.post(`${API}/shares`, { data: { path: '/README.txt' } });
  expect(create.status()).toBe(201);
  const share = (await create.json()).data as { id: number; code: string; path: string };
  expect(share.id).toBeGreaterThan(0);
  expect(share.code).toBeTruthy();
  expect(share.path).toBe('/README.txt');

  // 2) 列表可见
  const list = await request.get(`${API}/shares`);
  expect(list.status()).toBe(200);
  const shares = (await list.json()).data as { id: number }[];
  expect(shares.some((s) => s.id === share.id)).toBe(true);

  // 3) 通过短码下载到文件内容；未知短码 404
  const download = await request.get(`${API}/s/${share.code}`);
  expect(download.status()).toBe(200);
  expect((await download.text()).length).toBeGreaterThan(0);
  const badCode = await request.get(`${API}/s/e2e_no_such_code`);
  expect(badCode.status()).toBe(404);

  // 4) 分享不存在的路径 404
  const missing = await request.post(`${API}/shares`, {
    data: { path: '/no_such_file_e2e.txt' },
  });
  expect(missing.status()).toBe(404);

  // 5) 删除分享后短码失效
  const del = await request.delete(`${API}/shares/${share.id}`);
  expect(del.status()).toBe(200);
  const gone = await request.get(`${API}/s/${share.code}`);
  expect(gone.status()).toBe(404);
});
