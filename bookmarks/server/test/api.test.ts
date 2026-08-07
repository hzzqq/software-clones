import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { Server } from 'node:http';
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

// Use an isolated temp DB so tests never touch the real data file.
const dbFile = path.join(os.tmpdir(), `bookmarks-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;
process.env.CORS_ORIGIN = '*';

let app: import('express').Express;
let db: import('better-sqlite3').Database;
let server: Server;
let baseUrl = '';

before(async () => {
  const appMod = await import('../src/app');
  const dbMod = await import('../src/db');
  app = appMod.app;
  db = dbMod.db;
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (addr && typeof addr === 'object') {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(dbFile + suffix, { force: true });
    } catch {
      /* ignore */
    }
  }
});

beforeEach(() => {
  db.exec('DELETE FROM bookmarks; DELETE FROM categories;');
});

async function api(method: string, p: string, body?: unknown): Promise<{ status: number; body: any }> {
  const res = await fetch(baseUrl + '/api' + p, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

describe('health', () => {
  test('returns ok', async () => {
    const res = await fetch(baseUrl + '/api/health');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.code, 0);
    assert.equal(json.data.ok, true);
  });
});

describe('categories CRUD', () => {
  test('creates and lists categories', async () => {
    const created = await api('POST', '/categories', { name: '工作' });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.name, '工作');
    assert.equal(created.body.data.bookmarkCount, 0);

    await api('POST', '/categories', { name: '学习' });
    const list = await api('GET', '/categories');
    assert.equal(list.body.data.length, 2);
  });

  test('rejects empty category name', async () => {
    const res = await api('POST', '/categories', { name: '   ' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 40001);
  });

  test('rejects duplicate category name', async () => {
    await api('POST', '/categories', { name: '工作' });
    const dup = await api('POST', '/categories', { name: '工作' });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, 40900);
  });

  test('renames a category', async () => {
    const created = await api('POST', '/categories', { name: '旧名' });
    const res = await api('PATCH', `/categories/${created.body.data.id}`, { name: '新名' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, '新名');
  });

  test('returns 404 for missing category', async () => {
    const res = await api('DELETE', '/categories/99999');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 40400);
  });
});

describe('bookmarks CRUD', () => {
  test('creates a bookmark', async () => {
    const res = await api('POST', '/bookmarks', {
      url: 'https://example.com/docs',
      title: '示例文档',
      description: '一个测试书签',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.code, 0);
    assert.equal(res.body.data.url, 'https://example.com/docs');
    assert.equal(res.body.data.title, '示例文档');
    assert.equal(res.body.data.categoryId, null);
    assert.match(res.body.data.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  test('rejects bookmark without url or title', async () => {
    const noUrl = await api('POST', '/bookmarks', { title: 'x' });
    assert.equal(noUrl.status, 400);
    const noTitle = await api('POST', '/bookmarks', { url: 'https://example.com' });
    assert.equal(noTitle.status, 400);
  });

  test('gets and lists bookmarks', async () => {
    const created = await api('POST', '/bookmarks', { url: 'https://example.com/a', title: 'A' });
    await api('POST', '/bookmarks', { url: 'https://example.com/b', title: 'B' });
    const single = await api('GET', `/bookmarks/${created.body.data.id}`);
    assert.equal(single.body.data.title, 'A');
    const list = await api('GET', '/bookmarks');
    assert.equal(list.body.data.length, 2);
    // 新创建的排前面
    assert.equal(list.body.data[0].title, 'B');
  });

  test('patches a bookmark', async () => {
    const created = await api('POST', '/bookmarks', { url: 'https://example.com/a', title: 'A' });
    const res = await api('PATCH', `/bookmarks/${created.body.data.id}`, {
      title: 'A2',
      description: '改过了',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'A2');
    assert.equal(res.body.data.description, '改过了');
  });

  test('deletes a bookmark', async () => {
    const created = await api('POST', '/bookmarks', { url: 'https://example.com/a', title: 'A' });
    const del = await api('DELETE', `/bookmarks/${created.body.data.id}`);
    assert.equal(del.status, 200);
    const get = await api('GET', `/bookmarks/${created.body.data.id}`);
    assert.equal(get.status, 404);
  });
});

describe('bookmark URL dedupe (www/http/https 归一化)', () => {
  test('www/https/http 变体视为重复', async () => {
    const first = await api('POST', '/bookmarks', {
      url: 'https://www.example.com/docs',
      title: 'First',
    });
    assert.equal(first.status, 201);

    const dup1 = await api('POST', '/bookmarks', {
      url: 'http://example.com/docs/',
      title: 'Dup http',
    });
    assert.equal(dup1.status, 409);
    assert.equal(dup1.body.code, 40901);

    const dup2 = await api('POST', '/bookmarks', {
      url: 'example.com/docs',
      title: 'Dup bare',
    });
    assert.equal(dup2.status, 409);
  });

  test('不同路径允许并存', async () => {
    await api('POST', '/bookmarks', { url: 'https://example.com/a', title: 'A' });
    const b = await api('POST', '/bookmarks', { url: 'https://example.com/b', title: 'B' });
    assert.equal(b.status, 201);
  });

  test('PATCH 改成已存在的 URL 也判重', async () => {
    await api('POST', '/bookmarks', { url: 'https://example.com/a', title: 'A' });
    const created = await api('POST', '/bookmarks', { url: 'https://example.com/b', title: 'B' });
    const res = await api('PATCH', `/bookmarks/${created.body.data.id}`, {
      url: 'https://example.com/a',
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 40901);
  });
});

describe('bookmark filters', () => {
  test('按分类筛选与未分类筛选', async () => {
    const cat = await api('POST', '/categories', { name: '工作' });
    await api('POST', '/bookmarks', { url: 'https://example.com/a', title: 'A', categoryId: cat.body.data.id });
    await api('POST', '/bookmarks', { url: 'https://example.com/b', title: 'B' });

    const inCat = await api('GET', `/bookmarks?categoryId=${cat.body.data.id}`);
    assert.equal(inCat.body.data.length, 1);
    assert.equal(inCat.body.data[0].title, 'A');

    const none = await api('GET', '/bookmarks?uncategorized=1');
    assert.equal(none.body.data.length, 1);
    assert.equal(none.body.data[0].title, 'B');
  });

  test('关键词搜索命中标题/URL/描述', async () => {
    await api('POST', '/bookmarks', { url: 'https://react.dev', title: 'React 官方', description: '前端框架' });
    await api('POST', '/bookmarks', { url: 'https://vuejs.org', title: 'Vue', description: '另一个框架' });

    const byTitle = await api('GET', '/bookmarks?q=React');
    assert.equal(byTitle.body.data.length, 1);

    const byUrl = await api('GET', '/bookmarks?q=vuejs');
    assert.equal(byUrl.body.data.length, 1);

    const byDesc = await api('GET', '/bookmarks?q=前端');
    assert.equal(byDesc.body.data.length, 1);
  });

  test('删除分类后书签变为未分类', async () => {
    const cat = await api('POST', '/categories', { name: '临时' });
    await api('POST', '/bookmarks', { url: 'https://example.com/a', title: 'A', categoryId: cat.body.data.id });
    const del = await api('DELETE', `/categories/${cat.body.data.id}`);
    assert.equal(del.status, 200);
    const list = await api('GET', '/bookmarks');
    assert.equal(list.body.data[0].categoryId, null);
    assert.equal(list.body.data[0].categoryName, null);
  });
});
