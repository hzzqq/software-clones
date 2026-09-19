// 本 spec 覆盖 todo：前端挂载与后端健康检查，以及项目/任务 API 的创建、持久化、完成更新、删除与负路径冒烟。
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('todo');
const API = `http://localhost:${APP.serverPort}/api`;

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

interface ProjectData {
  id: number;
  name: string;
  color: string;
}

interface TaskData {
  id: number;
  projectId: number;
  title: string;
  priority: number;
  isCompleted: boolean;
}

test('todo 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('项目与任务创建后可查询，PATCH 可标记完成', async ({ request }) => {
  const projectName = `e2e_proj_${Date.now()}`;
  const projRes = await request.post(`${API}/projects`, {
    data: { name: projectName, color: 'blue' },
  });
  expect(projRes.status()).toBe(201);
  const project = ((await projRes.json()) as Envelope<ProjectData>).data;
  expect(project.id).toBeGreaterThan(0);
  expect(project.name).toBe(projectName);

  const taskTitle = `e2e_task_${Date.now()}`;
  const taskRes = await request.post(`${API}/projects/${project.id}/tasks`, {
    data: { title: taskTitle, priority: 3 },
  });
  expect(taskRes.status()).toBe(201);
  const task = ((await taskRes.json()) as Envelope<TaskData>).data;
  expect(task.projectId).toBe(project.id);
  expect(task.isCompleted).toBe(false);

  const listRes = await request.get(`${API}/projects/${project.id}/tasks`);
  expect(listRes.status()).toBe(200);
  const tasks = ((await listRes.json()) as Envelope<TaskData[]>).data;
  expect(tasks.some((t) => t.id === task.id)).toBe(true);

  const patchRes = await request.patch(`${API}/tasks/${task.id}`, {
    data: { isCompleted: true },
  });
  expect(patchRes.status()).toBe(200);
  expect(((await patchRes.json()) as Envelope<TaskData>).data.isCompleted).toBe(true);
});

test('不存在的项目 404、非法优先级 400，删除任务后详情 404', async ({ request }) => {
  const noProj = await request.post(`${API}/projects/99999999/tasks`, {
    data: { title: 'e2e 孤儿任务' },
  });
  expect(noProj.status()).toBe(404);

  const projRes = await request.post(`${API}/projects`, {
    data: { name: `e2e_del_${Date.now()}` },
  });
  expect(projRes.status()).toBe(201);
  const project = ((await projRes.json()) as Envelope<ProjectData>).data;

  const badPriority = await request.post(`${API}/projects/${project.id}/tasks`, {
    data: { title: 'e2e 非法优先级', priority: 9 },
  });
  expect(badPriority.status()).toBe(400);

  const taskRes = await request.post(`${API}/projects/${project.id}/tasks`, {
    data: { title: `e2e_task_del_${Date.now()}` },
  });
  expect(taskRes.status()).toBe(201);
  const task = ((await taskRes.json()) as Envelope<TaskData>).data;

  const del = await request.delete(`${API}/tasks/${task.id}`);
  expect(del.status()).toBe(200);
  expect(((await del.json()) as Envelope<{ id: number }>).data.id).toBe(task.id);

  const gone = await request.get(`${API}/tasks/${task.id}`);
  expect(gone.status()).toBe(404);
});
