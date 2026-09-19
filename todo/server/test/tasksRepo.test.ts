import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 使用隔离的临时数据库，避免污染真实数据文件。
const dbFile = path.join(os.tmpdir(), `todo-server-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbFile;
process.env.CORS_ORIGIN = '*';

let repo: typeof import('../src/repositories/tasksRepo');

beforeAll(async () => {
  repo = await import('../src/repositories/tasksRepo');
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

describe('todo repository', () => {
  test('项目 CRUD', () => {
    const p = repo.createProject({ name: '工作' });
    expect(p.name).toBe('工作');
    const list = repo.listProjects();
    expect(list.length).toBe(1);
    const updated = repo.updateProject(p.id, { name: '工作清单' });
    expect(updated!.name).toBe('工作清单');
  });

  test('任务 CRUD + 优先级裁剪', () => {
    const p = repo.createProject({ name: 'P' });
    const t = repo.createTask({ projectId: p.id, title: '写代码', priority: 1 });
    expect(t.priority).toBe(1);
    expect(t.isCompleted).toBe(false);
    const done = repo.updateTask(t.id, { isCompleted: true });
    expect(done!.isCompleted).toBe(true);
    expect(done!.completedAt).not.toBeNull();
    expect(repo.deleteTask(t.id)).toBe(true);
    expect(repo.getTask(t.id)).toBeNull();
  });

  test('子任务自引用（一级）', () => {
    const p = repo.createProject({ name: 'P2' });
    const parent = repo.createTask({ projectId: p.id, title: '父任务' });
    const child = repo.createTask({ projectId: p.id, parentId: parent.id, title: '子任务' });
    expect(child.parentId).toBe(parent.id);
    // 跨项目 parent 非法 → 置空
    const other = repo.createProject({ name: 'P3' });
    const bad = repo.createTask({ projectId: other.id, parentId: parent.id, title: 'x' });
    expect(bad.parentId).toBeNull();
  });

  test('今日视图聚合：未完成任务按截止/优先级出现', () => {
    const p = repo.createProject({ name: '今日' });
    repo.createTask({ projectId: p.id, title: '已完成', isCompleted: true });
    const high = repo.createTask({ projectId: p.id, title: '高优先', priority: 1 });
    const today = new Date().toISOString().slice(0, 10);
    const due = repo.createTask({ projectId: p.id, title: '今天到期', dueDate: today, priority: 4 });
    const items = repo.getTodayView();
    const ids = items.map((i) => i.id);
    expect(ids).toContain(high.id);
    expect(ids).toContain(due.id);
    expect(ids).not.toContain(repo.listTasks(p.id).find((t) => t.title === '已完成')!.id);
  });
});
