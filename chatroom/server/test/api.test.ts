import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeEach, describe, it, expect } from 'vitest';

// Use isolated temp DB so tests never touch the real data file.
// 小值便于测试「每房间最多保留 N 条」的裁剪逻辑。
const dbFile = path.join(os.tmpdir(), `chatroom-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;
process.env.MAX_MESSAGES_PER_ROOM = '5';

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
  db.exec('DELETE FROM messages; DELETE FROM rooms;');
});

async function createRoom(name = '大厅') {
  const res = await request(app).post('/api/rooms').send({ name });
  return res.body.data;
}

describe('rooms', () => {
  it('creates a room', async () => {
    const res = await request(app).post('/api/rooms').send({ name: '前端讨论组' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.name).toBe('前端讨论组');
    expect(res.body.data.messageCount).toBe(0);
  });

  it('rejects empty room names', async () => {
    const res = await request(app).post('/api/rooms').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('lists rooms newest first with message counts', async () => {
    const roomA = await createRoom('A');
    const roomB = await createRoom('B');
    await request(app)
      .post(`/api/rooms/${roomA.id}/messages`)
      .send({ nickname: 'tester', content: 'hi' });
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].id).toBe(roomB.id);
    const a = res.body.data.find((r: { id: number }) => r.id === roomA.id);
    expect(a.messageCount).toBe(1);
  });
});

describe('messages', () => {
  it('starts with empty history', async () => {
    const room = await createRoom();
    const res = await request(app).get(`/api/rooms/${room.id}/messages`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('posts and reads back a message', async () => {
    const room = await createRoom();
    const res = await request(app)
      .post(`/api/rooms/${room.id}/messages`)
      .send({ nickname: '小明', content: '大家好！' });
    expect(res.status).toBe(201);
    expect(res.body.data.nickname).toBe('小明');
    expect(res.body.data.content).toBe('大家好！');
    expect(res.body.data.roomId).toBe(room.id);

    const history = await request(app).get(`/api/rooms/${room.id}/messages`);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].content).toBe('大家好！');
  });

  it('rejects invalid nickname and content', async () => {
    const room = await createRoom();
    const noNick = await request(app)
      .post(`/api/rooms/${room.id}/messages`)
      .send({ nickname: '', content: 'x' });
    expect(noNick.status).toBe(400);
    const noContent = await request(app)
      .post(`/api/rooms/${room.id}/messages`)
      .send({ nickname: 'a', content: '   ' });
    expect(noContent.status).toBe(400);
  });

  it('returns 404 for messages in a missing room', async () => {
    const res = await request(app).get('/api/rooms/99999/messages');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });

  it('trims a room to the configured message cap', async () => {
    const room = await createRoom('裁剪测试');
    for (let i = 1; i <= 7; i += 1) {
      await request(app)
        .post(`/api/rooms/${room.id}/messages`)
        .send({ nickname: 'tester', content: `msg-${i}` });
    }
    const history = await request(app).get(`/api/rooms/${room.id}/messages?limit=100`);
    expect(history.body.data).toHaveLength(5);
    // 保留最近 5 条：msg-3 … msg-7
    expect(history.body.data[0].content).toBe('msg-3');
    expect(history.body.data[4].content).toBe('msg-7');
  });
});

describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });
});
