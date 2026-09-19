import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { Server } from 'node:http';
import { after, before, describe, expect, test } from 'vitest';

const dbFile = path.join(os.tmpdir(), `canvas-server-test-${process.pid}-${Date.now()}.db`);
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

describe('canvas: canvases / nodes / edges / uploads', () => {
  test('health returns ok', async () => {
    const res = await fetch(baseUrl + '/api/health');
    expect(res.status).toBe(200);
  });

  test('creates canvas, node, edge and loads full data', async () => {
    const canvas = await api('POST', '/canvases', { name: 'Mind Map' });
    expect(canvas.status).toBe(201);
    const canvasId = canvas.body.data.id;

    const a = await api('POST', `/canvases/${canvasId}/nodes`, {
      kind: 'note',
      x: 0,
      y: 0,
      w: 200,
      h: 100,
      content: 'Idea A',
    });
    const b = await api('POST', `/canvases/${canvasId}/nodes`, {
      kind: 'note',
      x: 300,
      y: 0,
      w: 200,
      h: 100,
      content: 'Idea B',
    });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);

    const edge = await api('POST', `/canvases/${canvasId}/edges`, {
      fromId: a.body.data.id,
      toId: b.body.data.id,
      fromSide: 'right',
      toSide: 'left',
    });
    expect(edge.status).toBe(201);

    const full = await api('GET', `/canvases/${canvasId}`);
    expect(full.body.data.nodes.length).toBe(2);
    expect(full.body.data.edges.length).toBe(1);
  });

  test('rejects invalid node kind', async () => {
    const canvas = await api('POST', '/canvases', { name: 'X' });
    const bad = await api('POST', `/canvases/${canvas.body.data.id}/nodes`, {
      kind: 'weird',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    });
    expect(bad.status).toBe(400);
  });

  test('uploads image and serves it back', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await fetch(baseUrl + '/api/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': 'pic.png' },
      body: png,
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.data.url).toMatch(/^\/api\/uploads\//);
    const getRes = await fetch(baseUrl + json.data.url);
    expect(getRes.status).toBe(200);
  });
});
