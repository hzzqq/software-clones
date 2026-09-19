/**
 * pomodoro 冒烟：应用挂载 + 后端健康；番茄任务 CRUD、专注会话写入并联动
 * 任务完成数与今日/累计统计的真实 API 端到端（会话为只追加日志，无删除路由）。
 */
import { test, request as requestModule, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('pomodoro');
const API = `http://localhost:${APP.serverPort}/api`;

test('pomodoro 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await requestModule.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('pomodoro 任务 CRUD 端到端', async ({ request }) => {
  const title = `e2e_task_${Date.now()}`;

  // 1) 创建任务：默认 estimatedPomodoros=1、未完成
  const create = await request.post(`${API}/tasks`, { data: { title } });
  expect(create.status()).toBe(201);
  const task = (await create.json()).data as {
    id: number;
    title: string;
    estimatedPomodoros: number;
    completedPomodoros: number;
    isDone: boolean;
  };
  expect(task.id).toBeGreaterThan(0);
  expect(task.title).toBe(title);
  expect(task.estimatedPomodoros).toBe(1);
  expect(task.completedPomodoros).toBe(0);
  expect(task.isDone).toBe(false);

  // 2) 列表与详情可见
  const list = await request.get(`${API}/tasks`);
  expect(list.status()).toBe(200);
  const tasks = (await list.json()).data as { id: number }[];
  expect(tasks.some((t) => t.id === task.id)).toBe(true);
  const detail = await request.get(`${API}/tasks/${task.id}`);
  expect(detail.status()).toBe(200);
  expect(((await detail.json()).data as { id: number }).id).toBe(task.id);

  // 3) 标记完成并更新番茄数
  const patch = await request.patch(`${API}/tasks/${task.id}`, {
    data: { isDone: true, completedPomodoros: 2 },
  });
  expect(patch.status()).toBe(200);
  const updated = (await patch.json()).data as { isDone: boolean; completedPomodoros: number };
  expect(updated.isDone).toBe(true);
  expect(updated.completedPomodoros).toBe(2);

  // 4) 空标题被拒（400），不存在的任务 404
  const bad = await request.post(`${API}/tasks`, { data: { title: '   ' } });
  expect(bad.status()).toBe(400);
  const missing = await request.get(`${API}/tasks/99999999`);
  expect(missing.status()).toBe(404);

  // 5) 删除后再查 404
  const del = await request.delete(`${API}/tasks/${task.id}`);
  expect(del.status()).toBe(200);
  const gone = await request.get(`${API}/tasks/${task.id}`);
  expect(gone.status()).toBe(404);
});

test('pomodoro 专注会话与统计联动 端到端', async ({ request }) => {
  // 0) 记录创建前的统计基线
  const statsBefore = await request.get(`${API}/stats`);
  expect(statsBefore.status()).toBe(200);
  const before = (await statsBefore.json()).data as {
    todayCompleted: number;
    todayFocusSec: number;
    totalCompleted: number;
    totalFocusSec: number;
  };

  // 1) 建任务并记录一次完成的专注会话（25 分钟）
  const createTask = await request.post(`${API}/tasks`, {
    data: { title: `e2e_focus_${Date.now()}` },
  });
  expect(createTask.status()).toBe(201);
  const task = (await createTask.json()).data as { id: number };
  const createSession = await request.post(`${API}/sessions`, {
    data: {
      taskId: task.id,
      kind: 'focus',
      durationSec: 1500,
      startedAt: new Date().toISOString(),
      completed: true,
    },
  });
  expect(createSession.status()).toBe(201);
  const session = (await createSession.json()).data as {
    id: number;
    taskId: number | null;
    kind: string;
    completed: boolean;
    durationSec: number;
  };
  expect(session.kind).toBe('focus');
  expect(session.completed).toBe(true);
  expect(session.durationSec).toBe(1500);

  // 2) 会话列表可见
  const sessions = await request.get(`${API}/sessions?limit=100`);
  expect(sessions.status()).toBe(200);
  const list = (await sessions.json()).data as { id: number }[];
  expect(list.some((s) => s.id === session.id)).toBe(true);

  // 3) 完成的专注会话联动任务 completedPomodoros +1
  const taskAfter = await request.get(`${API}/tasks/${task.id}`);
  expect(((await taskAfter.json()).data as { completedPomodoros: number }).completedPomodoros).toBe(
    1
  );

  // 4) 统计联动：累计/今日专注时长 +1500s，完成数 +1
  const statsAfter = await request.get(`${API}/stats`);
  const after = (await statsAfter.json()).data as typeof before;
  expect(after.totalFocusSec).toBe(before.totalFocusSec + 1500);
  expect(after.totalCompleted).toBe(before.totalCompleted + 1);
  expect(after.todayCompleted).toBe(before.todayCompleted + 1);

  // 5) 非法 kind 被拒（400）；清理任务
  const badKind = await request.post(`${API}/sessions`, {
    data: { kind: 'meeting', durationSec: 60 },
  });
  expect(badKind.status()).toBe(400);
  await request.delete(`${API}/tasks/${task.id}`);
});
