// 本 spec 覆盖 keep：前端挂载与后端健康检查，以及便签 API 的创建（含标签与清单）、持久化、删除与负路径冒烟。
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('keep');
const API = `http://localhost:${APP.serverPort}/api`;

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

interface NoteItemData {
  text: string;
  done: boolean;
}

interface NoteData {
  id: number;
  title: string;
  body: string;
  color: string;
  labels: string[];
  items: NoteItemData[];
}

test('keep 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('便签创建（含标签与清单）后详情与活动列表均可查询到', async ({ request }) => {
  const title = `e2e_note_${Date.now()}`;
  const create = await request.post(`${API}/notes`, {
    data: {
      title,
      body: 'e2e 便签正文',
      color: 'teal',
      labels: 'e2e, Smoke',
      items: [
        { text: '清单项一', done: false },
        { text: '清单项二', done: true },
      ],
    },
  });
  expect(create.status()).toBe(201);
  const created = ((await create.json()) as Envelope<NoteData>).data;
  expect(created.id).toBeGreaterThan(0);
  expect(created.title).toBe(title);
  expect(created.color).toBe('teal');
  // 标签解析为小写数组
  expect(created.labels).toContain('e2e');
  expect(created.labels).toContain('smoke');
  // 清单项按传入顺序保留
  expect(created.items).toHaveLength(2);
  expect(created.items[0].text).toBe('清单项一');
  expect(created.items[1].done).toBe(true);

  const detail = await request.get(`${API}/notes/${created.id}`);
  expect(detail.status()).toBe(200);
  expect(((await detail.json()) as Envelope<NoteData>).data.body).toBe('e2e 便签正文');

  const list = await request.get(`${API}/notes?view=active`);
  expect(list.status()).toBe(200);
  const notes = ((await list.json()) as Envelope<NoteData[]>).data;
  expect(notes.some((n) => n.id === created.id)).toBe(true);
});

test('非法 color 与非法 view 返回 400，删除后详情 404', async ({ request }) => {
  const badColor = await request.post(`${API}/notes`, {
    data: { title: 'e2e 坏颜色', color: 'magenta' },
  });
  expect(badColor.status()).toBe(400);

  const badView = await request.get(`${API}/notes?view=bogus`);
  expect(badView.status()).toBe(400);

  const create = await request.post(`${API}/notes`, {
    data: { title: `e2e_del_${Date.now()}` },
  });
  expect(create.status()).toBe(201);
  const id = ((await create.json()) as Envelope<NoteData>).data.id;

  const del = await request.delete(`${API}/notes/${id}`);
  expect(del.status()).toBe(200);
  expect(((await del.json()) as Envelope<{ id: number }>).data.id).toBe(id);

  const gone = await request.get(`${API}/notes/${id}`);
  expect(gone.status()).toBe(404);
});
