import path from 'path';
import os from 'os';
import fs from 'fs';
import request from 'supertest';
import { afterAll, beforeEach, describe, it, expect } from 'vitest';

// 使用隔离的临时 DB，测试绝不触碰真实数据文件。
const dbFile = path.join(os.tmpdir(), `habit-server-test-${process.pid}-${Date.now()}.db`);
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
  db.exec('DELETE FROM checkin; DELETE FROM habit;');
});

async function createHabit(overrides: Record<string, unknown> = {}) {
  const res = await request(app).post('/api/habits').send({
    name: '喝水',
    icon: '💧',
    frequencyType: 'daily',
    targetCount: 1,
    ...overrides,
  });
  return res.body.data;
}

describe('habit health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.ok).toBe(true);
  });
});

describe('habits CRUD', () => {
  it('creates a habit with defaults', async () => {
    const res = await request(app).post('/api/habits').send({ name: '早睡' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.name).toBe('早睡');
    expect(res.body.data.icon).toBe('✅');
    expect(res.body.data.frequencyType).toBe('daily');
    expect(res.body.data.targetCount).toBe(1);
    expect(res.body.data.checkins).toEqual([]);
    expect(res.body.data.totalCheckins).toBe(0);
    expect(res.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects creation without a name', async () => {
    const res = await request(app).post('/api/habits').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('normalizes frequency and target count', async () => {
    const res = await request(app)
      .post('/api/habits')
      .send({ name: '跑步', frequencyType: 'weekly', targetCount: 3 });
    expect(res.body.data.frequencyType).toBe('weekly');
    expect(res.body.data.targetCount).toBe(3);

    const bad = await request(app).post('/api/habits').send({ name: 'x', frequencyType: 'monthly', targetCount: 0 });
    expect(bad.body.data.frequencyType).toBe('daily');
    expect(bad.body.data.targetCount).toBe(1);
  });

  it('lists habits sorted newest first', async () => {
    await createHabit({ name: 'A' });
    await createHabit({ name: 'B' });
    const res = await request(app).get('/api/habits');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].name).toBe('B');
  });

  it('returns a single habit', async () => {
    const habit = await createHabit();
    const res = await request(app).get(`/api/habits/${habit.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('喝水');
  });

  it('returns 404 for a missing habit', async () => {
    const res = await request(app).get('/api/habits/99999');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });

  it('updates a habit', async () => {
    const habit = await createHabit();
    const res = await request(app)
      .patch(`/api/habits/${habit.id}`)
      .send({ name: '喝 8 杯水', frequencyType: 'daily', targetCount: 8 });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('喝 8 杯水');
    expect(res.body.data.targetCount).toBe(8);
    expect(res.body.data.icon).toBe('💧'); // 未更新字段保持
  });

  it('rejects PATCH with no updatable fields', async () => {
    const habit = await createHabit();
    const res = await request(app).patch(`/api/habits/${habit.id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  it('deletes a habit and its checkins', async () => {
    const habit = await createHabit();
    await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: '2025-08-01' });
    const del = await request(app).delete(`/api/habits/${habit.id}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/habits/${habit.id}`);
    expect(get.status).toBe(404);
    const orphan = db.prepare('SELECT COUNT(*) AS c FROM checkin WHERE habit_id = ?').get(habit.id) as {
      c: number;
    };
    expect(orphan.c).toBe(0);
  });
});

describe('checkins', () => {
  it('checks in on a date', async () => {
    const habit = await createHabit();
    const res = await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: '2025-08-06' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.habitId).toBe(habit.id);
    expect(res.body.data.date).toBe('2025-08-06');

    const detail = await request(app).get(`/api/habits/${habit.id}`);
    expect(detail.body.data.checkins).toEqual(['2025-08-06']);
    expect(detail.body.data.totalCheckins).toBe(1);
  });

  it('rejects duplicate checkin on the same day (409)', async () => {
    const habit = await createHabit();
    await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: '2025-08-06' });
    const dup = await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: '2025-08-06' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe(40900);
  });

  it('rejects invalid dates', async () => {
    const habit = await createHabit();
    for (const date of ['2025-13-01', '2025-02-30', '08-06', 'abc', '2025/08/06', '']) {
      const res = await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40001);
    }
  });

  it('rejects checkin for a missing habit', async () => {
    const res = await request(app).post('/api/habits/99999/checkins').send({ date: '2025-08-06' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40400);
  });

  it('cancels a checkin', async () => {
    const habit = await createHabit();
    await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: '2025-08-06' });

    const res = await request(app).delete(`/api/habits/${habit.id}/checkins/2025-08-06`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);

    const detail = await request(app).get(`/api/habits/${habit.id}`);
    expect(detail.body.data.checkins).toEqual([]);
  });

  it('cancelling a non-existent checkin is idempotent', async () => {
    const habit = await createHabit();
    const res = await request(app).delete(`/api/habits/${habit.id}/checkins/2025-08-01`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });

  it('sorts checkins ascending and dedupes on habit payload', async () => {
    const habit = await createHabit();
    await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: '2025-08-03' });
    await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: '2025-08-01' });
    await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: '2025-08-02' });
    const detail = await request(app).get(`/api/habits/${habit.id}`);
    expect(detail.body.data.checkins).toEqual(['2025-08-01', '2025-08-02', '2025-08-03']);
    expect(detail.body.data.totalCheckins).toBe(3);
  });

  it('weekly habit aggregates many checkins in one week', async () => {
    const habit = await createHabit({ frequencyType: 'weekly', targetCount: 3 });
    for (const date of ['2025-08-04', '2025-08-05', '2025-08-06']) {
      await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date });
    }
    const detail = await request(app).get(`/api/habits/${habit.id}`);
    expect(detail.body.data.totalCheckins).toBe(3);
    // 这 3 天都在同一 ISO 周（2025-W32），前端据此计算周完成度
    expect(detail.body.data.checkins).toHaveLength(3);
  });
});
