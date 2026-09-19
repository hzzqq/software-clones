// 本 spec 覆盖 snippets：前端挂载与后端健康检查，以及代码片段 API 的创建、持久化、语言过滤、删除与负路径冒烟。
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('snippets');
const API = `http://localhost:${APP.serverPort}/api`;

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

interface SnippetData {
  id: number;
  title: string;
  language: string;
  code: string;
  tags: string[];
}

test('snippets 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('片段创建后详情、列表与语言过滤均可查询到', async ({ request }) => {
  const title = `e2e_snip_${Date.now()}`;
  const code = 'const e2e = 1;';
  const create = await request.post(`${API}/snippets`, {
    data: { title, language: 'typescript', code, tags: 'e2e, Smoke' },
  });
  expect(create.status()).toBe(201);
  const created = ((await create.json()) as Envelope<SnippetData>).data;
  expect(created.id).toBeGreaterThan(0);
  expect(created.language).toBe('typescript');
  // 标签被解析为小写去重数组
  expect(created.tags).toContain('e2e');
  expect(created.tags).toContain('smoke');

  const detail = await request.get(`${API}/snippets/${created.id}`);
  expect(detail.status()).toBe(200);
  expect(((await detail.json()) as Envelope<SnippetData>).data.code).toBe(code);

  const filtered = await request.get(`${API}/snippets?language=typescript`);
  expect(filtered.status()).toBe(200);
  const snippets = ((await filtered.json()) as Envelope<SnippetData[]>).data;
  expect(snippets.some((s) => s.id === created.id)).toBe(true);
});

test('不支持的 language 返回 400，删除后详情 404', async ({ request }) => {
  const bad = await request.post(`${API}/snippets`, {
    data: { title: 'e2e 非法语言', language: 'cobol', code: 'x' },
  });
  expect(bad.status()).toBe(400);

  // 不传 language 时默认为 text
  const create = await request.post(`${API}/snippets`, {
    data: { title: `e2e_del_${Date.now()}`, code: 'print(1)' },
  });
  expect(create.status()).toBe(201);
  const created = ((await create.json()) as Envelope<SnippetData>).data;
  expect(created.language).toBe('text');

  const del = await request.delete(`${API}/snippets/${created.id}`);
  expect(del.status()).toBe(200);
  expect(((await del.json()) as Envelope<{ id: number }>).data.id).toBe(created.id);

  const gone = await request.get(`${API}/snippets/${created.id}`);
  expect(gone.status()).toBe(404);
});
