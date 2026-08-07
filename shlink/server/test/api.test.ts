import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeEach, describe, it, expect } from 'vitest';

// Use an isolated temp DB so tests never touch the real data file.
const dbFile = path.join(os.tmpdir(), `shlink-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;

const { app } = await import('../src/app');
const { db } = await import('../src/db');

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(dbFile + suffix, { force: true });
    } catch {
      /* ignore */
    }
  }
});

beforeEach(() => {
  db.exec('DELETE FROM links;');
});

async function createLink(url = 'https://example.com/hello', title?: string) {
  const res = await request(app).post('/api/links').send({ url, ...(title ? { title } : {}) });
  return res;
}

describe('links CRUD', () => {
  it('creates a short link with a generated code', async () => {
    const res = await createLink('https://example.com/very/long/path?q=1');
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.code).toMatch(/^[0-9a-zA-Z]{6}$/);
    expect(res.body.data.url).toBe('https://example.com/very/long/path?q=1');
    expect(res.body.data.clicks).toBe(0);
    expect(res.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('defaults the title to the url when omitted', async () => {
    const res = await createLink('https://example.com/a');
    expect(res.body.data.title).toBe('https://example.com/a');
  });

  it('uses the provided title', async () => {
    const res = await createLink('https://example.com/b', '我的文档');
    expect(res.body.data.title).toBe('我的文档');
  });

  it('auto-prepends https:// when scheme is missing', async () => {
    const res = await createLink('example.com/no-scheme');
    expect(res.status).toBe(201);
    expect(res.body.data.url).toBe('https://example.com/no-scheme');
  });

  it('rejects invalid urls', async () => {
    const res = await request(app).post('/api/links').send({ url: 'not a url' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('rejects non-http protocols', async () => {
    const ftp = await request(app).post('/api/links').send({ url: 'ftp://example.com/x' });
    expect(ftp.status).toBe(400);
    const js = await request(app).post('/api/links').send({ url: 'javascript:alert(1)' });
    expect(js.status).toBe(400);
  });

  it('rejects empty url', async () => {
    const res = await request(app).post('/api/links').send({ url: '   ' });
    expect(res.status).toBe(400);
  });

  it('lists all links with summary', async () => {
    await createLink('https://example.com/1');
    await createLink('https://example.com/2');
    const res = await request(app).get('/api/links');
    expect(res.status).toBe(200);
    expect(res.body.data.links).toHaveLength(2);
    expect(res.body.data.summary.total).toBe(2);
    expect(res.body.data.summary.totalClicks).toBe(0);
  });

  it('returns a single link by id', async () => {
    const created = await createLink('https://example.com/detail');
    const res = await request(app).get(`/api/links/${created.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe(created.body.data.code);
  });

  it('returns 404 for a missing link', async () => {
    const res = await request(app).get('/api/links/99999');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });

  it('deletes a link', async () => {
    const created = await createLink('https://example.com/delete-me');
    const del = await request(app).delete(`/api/links/${created.body.data.id}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/links/${created.body.data.id}`);
    expect(get.status).toBe(404);
  });
});

describe('redirect + click counting', () => {
  it('redirects 302 to the original url', async () => {
    const created = await createLink('https://example.com/target');
    const res = await request(app).get(`/r/${created.body.data.code}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com/target');
  });

  it('increments the click counter on each visit', async () => {
    const created = await createLink('https://example.com/count');
    const code = created.body.data.code;
    await request(app).get(`/r/${code}`);
    await request(app).get(`/r/${code}`);
    const detail = await request(app).get(`/api/links/${created.body.data.id}`);
    expect(detail.body.data.clicks).toBe(2);
    const list = await request(app).get('/api/links');
    expect(list.body.data.summary.totalClicks).toBe(2);
  });

  it('returns 404 for an unknown code', async () => {
    const res = await request(app).get('/r/zzzzzz');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });
});
