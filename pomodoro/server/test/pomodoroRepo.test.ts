import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 使用隔离的临时数据库，避免污染真实数据文件。
const dbFile = path.join(os.tmpdir(), `pomodoro-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;
process.env.CORS_ORIGIN = '*';

let repo: typeof import('../src/repositories/pomodoroRepo');

beforeAll(async () => {
  repo = await import('../src/repositories/pomodoroRepo');
});

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(dbFile + suffix, { force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('pomodoro repository', () => {
  test('任务 CRUD + 累计番茄与完成态', () => {
    const t = repo.createTask({ title: '写报告', estimatedPomodoros: 3 });
    expect(t.estimatedPomodoros).toBe(3);
    expect(t.completedPomodoros).toBe(0);
    expect(t.isDone).toBe(false);

    // 记录 3 个完成的专注会话
    repo.createSession({ taskId: t.id, kind: 'focus', durationSec: 1500, completed: true });
    repo.createSession({ taskId: t.id, kind: 'focus', durationSec: 1500, completed: true });
    repo.createSession({ taskId: t.id, kind: 'focus', durationSec: 1500, completed: true });

    const updated = repo.getTask(t.id)!;
    expect(updated.completedPomodoros).toBe(3);
    expect(updated.isDone).toBe(true);
  });

  test('未完成的会话不累加番茄数', () => {
    const t = repo.createTask({ title: '阅读', estimatedPomodoros: 5 });
    repo.createSession({ taskId: t.id, kind: 'focus', durationSec: 1500, completed: false });
    expect(repo.getTask(t.id)!.completedPomodoros).toBe(0);
  });

  test('统计聚合：今日/累计完成番茄数与专注时长', () => {
    const stats = repo.getStats();
    expect(stats.totalCompleted).toBeGreaterThanOrEqual(3);
    expect(stats.totalFocusSec).toBeGreaterThanOrEqual(3 * 1500);
    expect(stats.todayCompleted).toBeGreaterThanOrEqual(3);
    expect(stats.todayFocusSec).toBeGreaterThanOrEqual(3 * 1500);
  });

  test('会话日志仅追加且可列出', () => {
    repo.createSession({ kind: 'short_break', durationSec: 300, completed: true });
    const sessions = repo.listSessions(10);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].kind).toBeDefined();
  });
});
