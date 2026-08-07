import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeEach, describe, it, expect } from 'vitest';

// 使用隔离的临时 DB 与密钥目录，测试绝不触碰真实数据文件。
const tmpDir = path.join(os.tmpdir(), `vault-server-test-${process.pid}-${Date.now()}`);
const dbFile = path.join(tmpDir, 'app.db');
process.env.DB_PATH = dbFile;
process.env.DATA_DIR = tmpDir;
process.env.SECRET = '';

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
  try {
    fs.rmSync(path.join(tmpDir, 'secret.key'), { force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

beforeEach(() => {
  db.exec('DELETE FROM vault_entry;');
});

async function createEntry(overrides: Record<string, unknown> = {}) {
  const res = await request(app).post('/api/entries').send({
    title: 'GitHub',
    username: 'alice',
    password: 'plain-password-123',
    url: 'https://github.com',
    notes: '工作账号',
    category: '开发',
    ...overrides,
  });
  return res.body.data;
}

describe('vault health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.ok).toBe(true);
  });
});

describe('vault entries CRUD', () => {
  it('creates an entry and returns decrypted password', async () => {
    const res = await request(app).post('/api/entries').send({
      title: 'GitHub',
      username: 'alice',
      password: 'hunter2',
      url: 'https://github.com',
      notes: '主账号',
      category: '开发',
    });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.title).toBe('GitHub');
    expect(res.body.data.password).toBe('hunter2');
    expect(res.body.data.category).toBe('开发');
    expect(res.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('never stores the plaintext password in the database', async () => {
    await createEntry({ password: 'super-secret-abc' });
    const row = db.prepare('SELECT password_enc FROM vault_entry LIMIT 1').get() as {
      password_enc: string;
    };
    expect(row.password_enc).not.toContain('super-secret-abc');
    expect(row.password_enc.split('.')).toHaveLength(3);
  });

  it('rejects creation without a title', async () => {
    const res = await request(app).post('/api/entries').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('lists entries with decrypted passwords', async () => {
    await createEntry();
    const res = await request(app).get('/api/entries');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].password).toBe('plain-password-123');
  });

  it('returns a single entry', async () => {
    const entry = await createEntry();
    const res = await request(app).get(`/api/entries/${entry.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('alice');
  });

  it('returns 404 for a missing entry', async () => {
    const res = await request(app).get('/api/entries/99999');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });

  it('updates fields and re-encrypts the password', async () => {
    const entry = await createEntry();
    const res = await request(app)
      .patch(`/api/entries/${entry.id}`)
      .send({ title: 'GitLab', password: 'new-pass-456', username: 'alice2' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('GitLab');
    expect(res.body.data.password).toBe('new-pass-456');
    expect(res.body.data.username).toBe('alice2');
    expect(res.body.data.url).toBe('https://github.com'); // 未更新字段保持

    const row = db.prepare('SELECT password_enc FROM vault_entry WHERE id = ?').get(entry.id) as {
      password_enc: string;
    };
    expect(row.password_enc).not.toContain('new-pass-456');
  });

  it('rejects PATCH with no updatable fields', async () => {
    const entry = await createEntry();
    const res = await request(app).patch(`/api/entries/${entry.id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('deletes an entry', async () => {
    const entry = await createEntry();
    const del = await request(app).delete(`/api/entries/${entry.id}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/entries/${entry.id}`);
    expect(get.status).toBe(404);
  });
});

describe('vault search and filter', () => {
  it('searches by keyword across title/username/url/notes', async () => {
    await createEntry({ title: 'GitHub', username: 'alice', notes: '开发账号' });
    // Netflix 的 url 显式置为非 github 域名，避免其 url 命中 “github” 关键字搜索。
    await createEntry({ title: 'Netflix', username: 'bob', notes: '家庭共享', url: 'https://netflix.com' });

    const byTitle = await request(app).get('/api/entries?q=GitHub');
    expect(byTitle.body.data.length).toBe(1);
    expect(byTitle.body.data[0].title).toBe('GitHub');

    const byUsername = await request(app).get('/api/entries?q=bob');
    expect(byUsername.body.data.length).toBe(1);
    expect(byUsername.body.data[0].username).toBe('bob');

    const byNotes = await request(app).get('/api/entries?' + new URLSearchParams({ q: '家庭' }).toString());
    expect(byNotes.body.data.length).toBe(1);
  });

  it('filters by category', async () => {
    await createEntry({ title: 'GitHub', category: '开发' });
    await createEntry({ title: '招商银行', category: '金融' });

    const res = await request(app).get('/api/entries?' + new URLSearchParams({ category: '金融' }).toString());
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('招商银行');
  });

  it('combines search and category', async () => {
    await createEntry({ title: 'GitHub', category: '开发' });
    await createEntry({ title: 'GitLab', category: '工作' });

    const res = await request(app).get('/api/entries?' + new URLSearchParams({ q: 'Git', category: '开发' }).toString());
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('GitHub');
  });

  it('returns distinct categories', async () => {
    await createEntry({ title: 'A', category: '开发' });
    await createEntry({ title: 'B', category: '金融' });
    const res = await request(app).get('/api/entries/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.arrayContaining(['开发', '金融']));
  });
});

describe('vault defaults', () => {
  it('defaults category and empty fields', async () => {
    const res = await request(app).post('/api/entries').send({ title: 'OnlyTitle' });
    expect(res.status).toBe(201);
    expect(res.body.data.category).toBe('其他');
    expect(res.body.data.username).toBe('');
    expect(res.body.data.password).toBe('');
    expect(res.body.data.url).toBe('');
    expect(res.body.data.notes).toBe('');
  });
});
