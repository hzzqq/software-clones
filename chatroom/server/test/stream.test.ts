import path from 'path';
import os from 'os';
import fs from 'fs';
import http from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import type { AddressInfo } from 'net';

// Isolated temp DB for the SSE end-to-end test.
const dbFile = path.join(os.tmpdir(), `chatroom-stream-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;

const { app } = await import('../src/app');

let server: http.Server;
let baseUrl: string;
/** 保留 SSE 请求引用，测试结束时主动断开，避免 server.close() 挂起。 */
let sseReq: http.ClientRequest | null = null;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  if (sseReq) {
    sseReq.destroy();
    sseReq = null;
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(dbFile + suffix, { force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('SSE stream (real HTTP)', () => {
  it('delivers newly posted messages to a connected client', async () => {
    // 1. 创建房间
    const roomRes = await request(app).post('/api/rooms').send({ name: 'SSE 房间' });
    const roomId: number = roomRes.body.data.id;

    // 2. 用原生 http 打开 SSE 连接
    const received: string[] = [];
    const streamReady = new Promise<void>((resolve) => {
      const req = http.get(`${baseUrl}/api/rooms/${roomId}/stream`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          received.push(chunk);
          // 收到首帧（连接建立）后即可发消息
          resolve();
        });
      });
      sseReq = req;
      req.on('error', () => resolve());
    });

    await streamReady;

    // 3. 发一条消息（走真实 REST 接口）
    await request(app)
      .post(`/api/rooms/${roomId}/messages`)
      .send({ nickname: 'SSE测试员', content: '实时消息来了' });

    // 4. 等待 SSE 推送到达
    await new Promise<void>((resolve) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (received.some((c) => c.includes('实时消息来了'))) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - started > 5000) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });

    const all = received.join('');
    expect(all).toContain('data: ');
    expect(all).toContain('实时消息来了');
    expect(all).toContain('SSE测试员');

    // 5. 断开 SSE 连接，让 afterAll 的 server.close() 正常返回
    if (sseReq) {
      sseReq.destroy();
      sseReq = null;
    }
  });
});
