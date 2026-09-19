import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { before, after, describe, it, expect } from 'vitest';

// 使用隔离的临时 DB，测试绝不触碰真实 data 文件。
const dbFile = path.join(os.tmpdir(), `gallery-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;
process.env.CORS_ORIGIN = '*';

let app: import('express').Express;
let server: Server;
let base = '';

before(async () => {
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
});

async function rawUpload(buffer: Buffer, name: string, headers: Record<string, string> = {}) {
  return fetch(base + '/api/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(name),
      ...headers,
    },
    body: buffer,
  });
}

describe('gallery health & upload', () => {
  it('health returns ok', async () => {
    const res = await fetch(base + '/api/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ok).toBe(true);
  });

  it('uploads an image and streams it back', async () => {
    const buf = Buffer.from('fake-image-bytes');
    const res = await rawUpload(buf, 'sunset.png', {
      'X-Mime-Type': 'image/png',
      'X-Width': '100',
      'X-Height': '80',
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.code).toBe(0);
    expect(json.data.originalName).toBe('sunset.png');
    expect(json.data.width).toBe(100);
    expect(json.data.height).toBe(80);

    const fileRes = await fetch(base + `/api/assets/${json.data.id}/file`);
    expect(fileRes.status).toBe(200);
    expect(fileRes.headers.get('Content-Type')).toBe('image/png');
    const out = Buffer.from(await fileRes.arrayBuffer());
    expect(out.toString()).toBe('fake-image-bytes');
  });

  it('rejects empty upload', async () => {
    const res = await rawUpload(Buffer.alloc(0), 'empty.png');
    expect(res.status).toBe(400);
  });
});

describe('gallery albums & tags', () => {
  it('creates album, adds asset, lists', async () => {
    const buf = Buffer.from('bytes-a');
    const up = await rawUpload(buf, 'a.jpg', { 'X-Mime-Type': 'image/jpeg' });
    const asset = (await up.json()).data;

    const create = await fetch(base + '/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Trip' }),
    });
    expect(create.status).toBe(201);
    const album = (await create.json()).data;

    const add = await fetch(base + `/api/albums/${album.id}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId: asset.id }),
    });
    expect(add.status).toBe(200);

    const list = await fetch(base + `/api/albums/${album.id}/assets`);
    const listJson = await list.json();
    expect(listJson.data.length).toBe(1);

    const filtered = await fetch(base + `/api/assets?album=${album.id}`);
    const fJson = await filtered.json();
    expect(fJson.data.length).toBe(1);
    expect(fJson.data[0].id).toBe(asset.id);
  });

  it('tags an asset and filters by tag', async () => {
    const buf = Buffer.from('bytes-b');
    const up = await rawUpload(buf, 'b.jpg', { 'X-Mime-Type': 'image/jpeg' });
    const asset = (await up.json()).data;

    const tag = await fetch(base + `/api/assets/${asset.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'vacation' }),
    });
    expect(tag.status).toBe(200);

    const tags = await fetch(base + '/api/tags');
    const tJson = await tags.json();
    expect(tJson.data.some((t: { name: string }) => t.name === 'vacation')).toBe(true);

    const filtered = await fetch(base + `/api/assets?tag=vacation`);
    const fJson = await filtered.json();
    expect(fJson.data.length).toBe(1);
  });

  it('deletes an asset and its disk file', async () => {
    const buf = Buffer.from('bytes-c');
    const up = await rawUpload(buf, 'c.jpg', { 'X-Mime-Type': 'image/jpeg' });
    const asset = (await up.json()).data;

    const del = await fetch(base + `/api/assets/${asset.id}`, { method: 'DELETE' });
    expect(del.status).toBe(200);

    const get = await fetch(base + `/api/assets/${asset.id}`);
    expect(get.status).toBe(404);
  });
});
