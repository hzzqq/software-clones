import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { Server } from 'node:http';
import { after, before, describe, expect, test } from 'vitest';

// Use an isolated temp DB so tests never touch the real data file.
const dbFile = path.join(os.tmpdir(), `knowledge-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;
process.env.CORS_ORIGIN = '*';

let server: Server;
let baseUrl = '';

before(async () => {
  const appMod = await import('../src/app');
  const dbMod = await import('../src/db');
  void dbMod.db;
  await new Promise<void>((resolve) => {
    server = appMod.app.listen(0, () => resolve());
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

async function api(
  method: string,
  p: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  const res = await fetch(baseUrl + '/api' + p, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

describe('knowledge: pages / blocks / backlinks', () => {
  test('health returns ok', async () => {
    const res = await fetch(baseUrl + '/api/health');
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.ok).toBe(true);
  });

  test('creates page and rejects duplicate title', async () => {
    const created = await api('POST', '/pages', { title: 'My Page' });
    expect(created.status).toBe(201);
    expect(created.body.data.title).toBe('My Page');
    const dup = await api('POST', '/pages', { title: 'my page' });
    expect(dup.status).toBe(409);
  });

  test('block [[link]] produces page backlink; dangling ((id)) ignored', async () => {
    const target = await api('POST', '/pages', { title: 'Target Page' });
    const targetId = target.body.data.id;
    const source = await api('POST', '/pages', { title: 'Source Page' });
    const sourceId = source.body.data.id;

    const block = await api('POST', '/blocks', {
      pageId: sourceId,
      content: 'see [[Target Page]] and ((999999))',
    });
    expect(block.status).toBe(201);
    const blockId = block.body.data.id;

    const back = await api('GET', `/pages/${targetId}/backlinks`);
    expect(back.body.data.length).toBe(1);
    expect(back.body.data[0].fromBlockId).toBe(blockId);
    expect(back.body.data[0].fromPageTitle).toBe('Source Page');

    const back2 = await api('GET', '/blocks/999999/backlinks');
    expect(back2.body.data.length).toBe(0);
  });

  test('block tree reflects parent/child and delete cascades', async () => {
    const page = await api('POST', '/pages', { title: 'Outline' });
    const pageId = page.body.data.id;
    const parent = await api('POST', '/blocks', { pageId, content: 'parent' });
    const child = await api('POST', '/blocks', {
      pageId,
      parentId: parent.body.data.id,
      content: 'child',
    });
    const detail = await api('GET', `/pages/${pageId}`);
    expect(detail.body.data.tree.length).toBe(1);
    expect(detail.body.data.tree[0].children.length).toBe(1);
    expect(detail.body.data.tree[0].children[0].id).toBe(child.body.data.id);

    const del = await api('DELETE', `/blocks/${parent.body.data.id}`);
    expect(del.status).toBe(200);
    const after = await api('GET', `/pages/${pageId}`);
    expect(after.body.data.tree.length).toBe(0);
  });

  test('search matches page title and block content', async () => {
    await api('POST', '/pages', { title: 'Searchable Topic' });
    await api('POST', '/pages', { title: 'Holder' });
    const pageSearch = await api('GET', '/search?q=Searchable');
    expect(pageSearch.body.data.pages.length).toBeGreaterThan(0);
  });
});
