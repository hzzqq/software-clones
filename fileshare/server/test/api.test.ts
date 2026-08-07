import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeEach, describe, it, expect } from 'vitest';

// Use isolated temp DB + temp upload dir so tests never touch the real data.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fileshare-server-test-'));
const dbFile = path.join(tmpRoot, 'app.db');
const uploadDir = path.join(tmpRoot, 'uploads');
process.env.DB_PATH = dbFile;
process.env.UPLOAD_DIR = uploadDir;
process.env.MAX_FILE_SIZE = String(1024 * 1024); // 1MB for the 413 test

const { app } = await import('../src/app');
const { db } = await import('../src/db');

afterAll(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

beforeEach(() => {
  db.exec('DELETE FROM files;');
});

/** 上传辅助：默认 1KB 文本文件。 */
async function uploadFile(name = '测试报告.txt', content = Buffer.from('x'.repeat(1024))) {
  return request(app)
    .post('/api/files')
    .set('Content-Type', 'application/octet-stream')
    .set('X-File-Name', encodeURIComponent(name))
    .send(content);
}

describe('files upload / list', () => {
  it('uploads a file and returns its metadata', async () => {
    const res = await uploadFile();
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    const data = res.body.data;
    expect(data.id).toBeGreaterThan(0);
    expect(data.code).toMatch(/^[A-Za-z2-9]{6}$/);
    expect(data.originalName).toBe('测试报告.txt');
    expect(data.size).toBe(1024);
    expect(data.downloadCount).toBe(0);
    expect(data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // 磁盘文件确实落盘
    const files = fs.readdirSync(uploadDir);
    expect(files.some((f) => f.includes(data.code))).toBe(true);
  });

  it('rejects empty file uploads', async () => {
    const res = await request(app)
      .post('/api/files')
      .set('Content-Type', 'application/octet-stream')
      .set('X-File-Name', 'empty.bin')
      .send(Buffer.alloc(0));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('rejects oversized files with 413', async () => {
    const res = await request(app)
      .post('/api/files')
      .set('Content-Type', 'application/octet-stream')
      .set('X-File-Name', 'big.bin')
      .send(Buffer.alloc(2 * 1024 * 1024));
    expect(res.status).toBe(413);
    expect(res.body.code).toBe(41300);
  });

  it('lists files newest first', async () => {
    await uploadFile('a.txt', Buffer.from('a'));
    await uploadFile('b.txt', Buffer.from('b'));
    const res = await request(app).get('/api/files');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].originalName).toBe('b.txt');
    expect(res.body.data[1].originalName).toBe('a.txt');
  });
});

describe('files download / meta / delete', () => {
  it('downloads a file with UTF-8 filename and increments count', async () => {
    const uploaded = await uploadFile('中文 文件.png', Buffer.from('png-bytes'));
    const code: string = uploaded.body.data.code;
    const res = await request(app).get(`/api/files/${code}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(decodeURIComponent(res.headers['content-disposition'])).toContain('中文 文件.png');
    // 二进制响应体由 superagent 缓冲为 Buffer（res.text 对 octet-stream 为 undefined），
    // 故从 res.body 读取原始字节进行断言。
    expect(res.body.toString()).toBe('png-bytes');
    // 计数 +1
    const meta = await request(app).get(`/api/files/${code}/meta`);
    expect(meta.body.data.downloadCount).toBe(1);
  });

  it('returns 404 for unknown code download/meta', async () => {
    const download = await request(app).get('/api/files/nope123/download');
    expect(download.status).toBe(404);
    expect(download.body.code).toBe(40400);
    const meta = await request(app).get('/api/files/nope123/meta');
    expect(meta.status).toBe(404);
  });

  it('deletes a file and its disk content', async () => {
    const uploaded = await uploadFile('del.txt', Buffer.from('to-delete'));
    const id: number = uploaded.body.data.id;
    const code: string = uploaded.body.data.code;
    const res = await request(app).delete(`/api/files/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
    // 磁盘文件被清理
    const files = fs.readdirSync(uploadDir);
    expect(files.some((f) => f.includes(code))).toBe(false);
    // 再查 404
    const meta = await request(app).get(`/api/files/${code}/meta`);
    expect(meta.status).toBe(404);
  });

  it('returns 404 when deleting an unknown id', async () => {
    const res = await request(app).delete('/api/files/99999');
    expect(res.status).toBe(404);
  });
});

describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });
});
