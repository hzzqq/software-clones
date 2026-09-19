import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { before, after, describe, it, expect } from 'vitest';

const dbFile = path.join(os.tmpdir(), `fm-server-test-${process.pid}-${Date.now()}.db`);
const fmRoot = path.join(os.tmpdir(), `fm-server-test-root-${process.pid}-${Date.now()}`);
process.env.DB_PATH = dbFile;
process.env.FM_ROOT = fmRoot;
process.env.CORS_ORIGIN = '*';

let app: import('express').Express;
let server: Server;
let base = '';

before(async () => {
  // 确保虚拟根目录存在并写入示例文件（与生产 index.ts 行为一致）。
  const fsMod = await import('../src/lib/fsPath');
  fsMod.seedFmRootIfEmpty();
  const appMod = await import('../src/app');
  app = appMod.app;
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (addr && typeof addr === 'object') {
    base = `http://127.0.0.1:${addr.port}`;
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
  try {
    fs.rmSync(fmRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('filemanager browse & preview', () => {
  it('health returns ok', async () => {
    const res = await fetch(base + '/api/health');
    expect(res.status).toBe(200);
  });

  it('browses the virtual root and lists the seeded README.txt + samples dir', async () => {
    const res = await fetch(base + '/api/browse?path=/');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe(0);
    const names = json.data.entries.map((e: { name: string }) => e.name);
    expect(names).toContain('README.txt');
    expect(names).toContain('samples');
    const samples = json.data.entries.find((e: { name: string }) => e.name === 'samples');
    expect(samples.isDir).toBe(true);
  });

  it('enters the samples directory', async () => {
    const res = await fetch(base + '/api/browse?path=/samples');
    expect(res.status).toBe(200);
    const json = await res.json();
    const names = json.data.entries.map((e: { name: string }) => e.name);
    expect(names).toContain('hello.txt');
  });

  it('previews a text file and returns its content', async () => {
    const res = await fetch(base + '/api/preview?path=/samples/hello.txt');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Hello from the file manager');
  });

  it('rejects path traversal attempts (.. escaping the root)', async () => {
    const attempts = ['/../../../../etc/passwd', '/../', '../../Windows/win.ini', '/samples/../../README.txt'];
    for (const p of attempts) {
      const res = await fetch(base + '/api/browse?path=' + encodeURIComponent(p));
      // 越界一律拒绝（400 非法路径）。
      expect(res.status).toBe(400);
    }
  });

  it('cannot preview a file outside the virtual root', async () => {
    const res = await fetch(base + '/api/preview?path=' + encodeURIComponent('/../README.txt'));
    expect(res.status).toBe(400);
  });
});

describe('filemanager shares & bookmarks', () => {
  it('creates a share for a file and downloads via short code', async () => {
    const create = await fetch(base + '/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/samples/hello.txt' }),
    });
    expect(create.status).toBe(201);
    const share = (await create.json()).data;
    expect(share.code).toBeTruthy();

    const dl = await fetch(base + `/api/s/${share.code}`);
    expect(dl.status).toBe(200);
    const text = await dl.text();
    expect(text).toContain('Hello from the file manager');
  });

  it('lists and deletes shares', async () => {
    const list = await fetch(base + '/api/shares');
    expect(list.status).toBe(200);
    const json = await list.json();
    expect(Array.isArray(json.data)).toBe(true);

    if (json.data.length > 0) {
      const id = json.data[0].id;
      const del = await fetch(base + `/api/shares/${id}`, { method: 'DELETE' });
      expect(del.status).toBe(200);
    }
  });

  it('creates and lists a bookmark', async () => {
    const create = await fetch(base + '/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/samples', name: '示例' }),
    });
    expect(create.status).toBe(201);
    const bookmark = (await create.json()).data;
    expect(bookmark.name).toBe('示例');

    const list = await fetch(base + '/api/bookmarks');
    const json = await list.json();
    expect(json.data.some((b: { id: number }) => b.id === bookmark.id)).toBe(true);
  });
});
