import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { Server } from 'node:http';
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

// Use an isolated temp DB so tests never touch the real data file.
const dbFile = path.join(os.tmpdir(), `snippets-server-test-${process.pid}-${Date.now()}.db`);
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
  db.exec('DELETE FROM snippet_tags; DELETE FROM snippets; DELETE FROM tags;');
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

describe('health & languages', () => {
  test('health returns ok', async () => {
    const res = await fetch(baseUrl + '/api/health');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.ok, true);
  });

  test('languages list contains core languages', async () => {
    const res = await api('GET', '/languages');
    assert.equal(res.status, 200);
    const ids = res.body.data.map((l: any) => l.id);
    for (const id of ['javascript', 'typescript', 'python', 'java', 'go', 'bash', 'sql', 'json', 'html', 'css']) {
      assert.ok(ids.includes(id), `缺少语言 ${id}`);
    }
  });
});

describe('snippets CRUD', () => {
  test('creates a snippet with parsed tags', async () => {
    const res = await api('POST', '/snippets', {
      title: 'fetch JSON',
      language: 'javascript',
      code: 'const res = await fetch(url);',
      tags: 'js, frontend, fetch',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.code, 0);
    assert.equal(res.body.data.title, 'fetch JSON');
    assert.equal(res.body.data.language, 'javascript');
    assert.deepEqual(res.body.data.tags, ['js', 'frontend', 'fetch']);
    assert.match(res.body.data.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  test('rejects missing title or code', async () => {
    const noTitle = await api('POST', '/snippets', { language: 'javascript', code: 'x' });
    assert.equal(noTitle.status, 400);
    const noCode = await api('POST', '/snippets', { title: 'x' });
    assert.equal(noCode.status, 400);
  });

  test('rejects unsupported language', async () => {
    const res = await api('POST', '/snippets', {
      title: 'x',
      language: 'cobol',
      code: 'x',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 40001);
  });

  test('gets and lists snippets', async () => {
    const created = await api('POST', '/snippets', { title: 'A', language: 'python', code: 'print(1)' });
    await api('POST', '/snippets', { title: 'B', language: 'go', code: 'fmt.Println(1)' });
    const single = await api('GET', `/snippets/${created.body.data.id}`);
    assert.equal(single.body.data.title, 'A');
    const list = await api('GET', '/snippets');
    assert.equal(list.body.data.length, 2);
    assert.equal(list.body.data[0].title, 'B');
  });

  test('patches a snippet and replaces tags', async () => {
    const created = await api('POST', '/snippets', { title: 'A', language: 'javascript', code: 'a', tags: ['old'] });
    const res = await api('PATCH', `/snippets/${created.body.data.id}`, {
      title: 'A2',
      code: 'const b = 2;',
      tags: 'new, fresh',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'A2');
    assert.equal(res.body.data.code, 'const b = 2;');
    assert.deepEqual(res.body.data.tags, ['new', 'fresh']);
  });

  test('deletes a snippet', async () => {
    const created = await api('POST', '/snippets', { title: 'A', language: 'javascript', code: 'a' });
    const del = await api('DELETE', `/snippets/${created.body.data.id}`);
    assert.equal(del.status, 200);
    const get = await api('GET', `/snippets/${created.body.data.id}`);
    assert.equal(get.status, 404);
  });
});

describe('snippets filters', () => {
  test('按语言筛选', async () => {
    await api('POST', '/snippets', { title: 'Py', language: 'python', code: 'print(1)' });
    await api('POST', '/snippets', { title: 'Go', language: 'go', code: 'fmt.Println()' });
    const res = await api('GET', '/snippets?language=python');
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].title, 'Py');
  });

  test('按标签筛选', async () => {
    await api('POST', '/snippets', { title: 'A', language: 'javascript', code: 'a', tags: 'hooks, react' });
    await api('POST', '/snippets', { title: 'B', language: 'javascript', code: 'b', tags: 'utils' });
    const res = await api('GET', '/snippets?tag=hooks');
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].title, 'A');
  });

  test('关键词搜索命中标题或代码', async () => {
    await api('POST', '/snippets', { title: 'Debounce', language: 'javascript', code: 'setTimeout(x, 300)' });
    await api('POST', '/snippets', { title: 'Other', language: 'javascript', code: 'const throttle = fn => fn;' });
    const byTitle = await api('GET', '/snippets?q=Debounce');
    assert.equal(byTitle.body.data.length, 1);
    const byCode = await api('GET', '/snippets?q=throttle');
    assert.equal(byCode.body.data.length, 1);
  });

  test('标签列表含使用次数', async () => {
    await api('POST', '/snippets', { title: 'A', language: 'javascript', code: 'a', tags: 'shared' });
    await api('POST', '/snippets', { title: 'B', language: 'typescript', code: 'b', tags: 'shared' });
    const res = await api('GET', '/tags');
    const shared = res.body.data.find((t: any) => t.name === 'shared');
    assert.ok(shared);
    assert.equal(shared.count, 2);
  });

  test('删除片段后标签计数回落', async () => {
    const created = await api('POST', '/snippets', { title: 'A', language: 'javascript', code: 'a', tags: 'temp' });
    await api('DELETE', `/snippets/${created.body.data.id}`);
    const res = await api('GET', '/tags');
    const temp = res.body.data.find((t: any) => t.name === 'temp');
    assert.equal(temp, undefined);
  });
});
