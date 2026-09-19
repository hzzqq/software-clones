// 本 spec 覆盖 habit（习惯养成）的挂载健康检查、习惯 CRUD 全链路、打卡/取消打卡与更新负路径。
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('habit');
const API = `http://localhost:${APP.serverPort}/api`;

test('habit 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('habit 创建/查询/删除习惯 端到端', async ({ request }) => {
  const name = `e2e_habit_${Date.now()}`;

  // 1) 创建习惯（不传 icon/frequencyType/targetCount，走服务端默认值）
  const create = await request.post(`${API}/habits`, { data: { name } });
  expect(create.status()).toBe(201);
  const created = (await create.json()).data as {
    id: number;
    name: string;
    icon: string;
    frequencyType: string;
    checkins: string[];
    totalCheckins: number;
  };
  expect(created.id).toBeGreaterThan(0);
  expect(created.name).toBe(name);
  expect(created.checkins).toEqual([]);
  expect(created.totalCheckins).toBe(0);

  // 2) 列表中能找到（SQLite 持久化）
  const list = await request.get(`${API}/habits`);
  expect(list.status()).toBe(200);
  const habits = (await list.json()).data as { id: number }[];
  expect(habits.some((h) => h.id === created.id)).toBe(true);

  // 3) 详情读取一致
  const detail = await request.get(`${API}/habits/${created.id}`);
  expect(detail.status()).toBe(200);
  expect(((await detail.json()).data as { name: string }).name).toBe(name);

  // 4) 负路径：缺 name 400、不存在 id 404
  const bad = await request.post(`${API}/habits`, { data: {} });
  expect(bad.status()).toBe(400);
  expect(((await bad.json()) as { code: number }).code).toBe(40001);
  const missing = await request.get(`${API}/habits/99999999`);
  expect(missing.status()).toBe(404);
  expect(((await missing.json()) as { code: number }).code).toBe(40400);

  // 5) 删除后确认消失
  const del = await request.delete(`${API}/habits/${created.id}`);
  expect(del.status()).toBe(200);
  const gone = await request.get(`${API}/habits/${created.id}`);
  expect(gone.status()).toBe(404);
});

test('habit 打卡/重复打卡 409/取消打卡 端到端', async ({ request }) => {
  const today = new Date().toISOString().slice(0, 10);

  // 0) 先建一个干净的习惯
  const create = await request.post(`${API}/habits`, {
    data: { name: `e2e_checkin_${Date.now()}`, icon: '🏃' },
  });
  expect(create.status()).toBe(201);
  const habit = (await create.json()).data as { id: number };

  // 1) 首次打卡成功，返回打卡记录
  const checkin = await request.post(`${API}/habits/${habit.id}/checkins`, {
    data: { date: today },
  });
  expect(checkin.status()).toBe(201);
  const record = (await checkin.json()).data as { id: number; habitId: number; date: string };
  expect(record.habitId).toBe(habit.id);
  expect(record.date).toBe(today);

  // 2) 同一天重复打卡被拒（409 / code 40900）
  const again = await request.post(`${API}/habits/${habit.id}/checkins`, {
    data: { date: today },
  });
  expect(again.status()).toBe(409);
  expect(((await again.json()) as { code: number }).code).toBe(40900);

  // 3) 打卡已落到习惯详情（checkins 与 totalCheckins 同步）
  const detail = await request.get(`${API}/habits/${habit.id}`);
  const data = (await detail.json()).data as { checkins: string[]; totalCheckins: number };
  expect(data.checkins).toContain(today);
  expect(data.totalCheckins).toBe(1);

  // 4) 负路径：非法日期 400、给不存在的习惯打卡 404
  const badDate = await request.post(`${API}/habits/${habit.id}/checkins`, {
    data: { date: '2025-02-30' },
  });
  expect(badDate.status()).toBe(400);
  const missingHabit = await request.post(`${API}/habits/99999999/checkins`, {
    data: { date: today },
  });
  expect(missingHabit.status()).toBe(404);

  // 5) 取消打卡后详情恢复为空
  const cancel = await request.delete(`${API}/habits/${habit.id}/checkins/${today}`);
  expect(cancel.status()).toBe(200);
  const after = (await (await request.get(`${API}/habits/${habit.id}`)).json()).data as {
    checkins: string[];
    totalCheckins: number;
  };
  expect(after.checkins).toEqual([]);
  expect(after.totalCheckins).toBe(0);

  // 6) 清理习惯
  expect((await request.delete(`${API}/habits/${habit.id}`)).status()).toBe(200);
});

test('habit 更新习惯与空补丁 400 端到端', async ({ request }) => {
  const create = await request.post(`${API}/habits`, {
    data: { name: `e2e_patch_${Date.now()}` },
  });
  expect(create.status()).toBe(201);
  const habit = (await create.json()).data as { id: number };

  // 1) PATCH 全字段生效
  const newName = `e2e_patched_${Date.now()}`;
  const patch = await request.patch(`${API}/habits/${habit.id}`, {
    data: { name: newName, icon: '🔥', frequencyType: 'weekly', targetCount: 5 },
  });
  expect(patch.status()).toBe(200);
  const updated = (await patch.json()).data as {
    name: string;
    icon: string;
    frequencyType: string;
    targetCount: number;
  };
  expect(updated.name).toBe(newName);
  expect(updated.icon).toBe('🔥');
  expect(updated.frequencyType).toBe('weekly');
  expect(updated.targetCount).toBe(5);

  // 2) 空补丁被拒（400 / code 40001）
  const empty = await request.patch(`${API}/habits/${habit.id}`, { data: {} });
  expect(empty.status()).toBe(400);
  expect(((await empty.json()) as { code: number }).code).toBe(40001);

  // 3) 给不存在的习惯打补丁 404
  const missing = await request.patch(`${API}/habits/99999999`, { data: { name: newName } });
  expect(missing.status()).toBe(404);

  // 4) 清理
  expect((await request.delete(`${API}/habits/${habit.id}`)).status()).toBe(200);
});
