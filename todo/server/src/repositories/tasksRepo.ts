import db from '../db';
import type {
  Project,
  ProjectInput,
  Task,
  TaskInput,
  TaskWithSubs,
  TodayItem,
} from '../types';

interface ProjectRow {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

interface TaskRow {
  id: number;
  project_id: number;
  parent_id: number | null;
  title: string;
  description: string;
  priority: number;
  due_date: string | null;
  is_completed: number;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.due_date,
    isCompleted: row.is_completed === 1,
    completedAt: row.completed_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function bool(value: number): boolean {
  return value === 1;
}

// ----------------------------- Projects -----------------------------

export function listProjects(): Project[] {
  const rows = db
    .prepare(`SELECT * FROM projects ORDER BY sort_order ASC, created_at ASC, id ASC`)
    .all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: number): Project | null {
  const row = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}

export function createProject(input: ProjectInput): Project {
  const now = new Date().toISOString();
  const name = (input.name ?? '新清单').toString().trim() || '新清单';
  const color = input.color ?? 'default';
  const maxRow = db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM projects`).get() as {
    m: number;
  };
  const sortOrder = input.sortOrder ?? maxRow.m + 1;
  const info = db
    .prepare(`INSERT INTO projects (name, color, sort_order, created_at) VALUES (?, ?, ?, ?)`)
    .run(name, color, sortOrder, now);
  return getProject(Number(info.lastInsertRowid))!;
}

export function updateProject(id: number, input: ProjectInput): Project | null {
  const existing = getProject(id);
  if (!existing) {
    return null;
  }
  const name = input.name ?? existing.name;
  const color = input.color ?? existing.color;
  const sortOrder = input.sortOrder ?? existing.sortOrder;
  db.prepare(`UPDATE projects SET name = ?, color = ?, sort_order = ? WHERE id = ?`).run(
    name,
    color,
    sortOrder,
    id,
  );
  return getProject(id);
}

export function deleteProject(id: number): boolean {
  const info = db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
  return info.changes > 0;
}

// ----------------------------- Tasks -----------------------------

/** 查询某项目下的顶层任务（可按完成态过滤），并附带一级子任务。 */
export function listTasks(projectId: number, opts: { completed?: boolean } = {}): TaskWithSubs[] {
  const clauses: string[] = ['project_id = ?'];
  const params: unknown[] = [projectId];
  if (typeof opts.completed === 'boolean') {
    clauses.push('is_completed = ?');
    params.push(opts.completed ? 1 : 0);
  }
  const where = clauses.join(' AND ');
  const rows = db
    .prepare(`SELECT * FROM tasks WHERE ${where} ORDER BY sort_order ASC, created_at ASC, id ASC`)
    .all(...params) as TaskRow[];
  return rows.map((row) => {
    const task = rowToTask(row);
    const subRows = db
      .prepare(
        `SELECT * FROM tasks WHERE parent_id = ? ORDER BY sort_order ASC, created_at ASC, id ASC`,
      )
      .all(task.id) as TaskRow[];
    return { ...task, subTasks: subRows.map(rowToTask) };
  });
}

export function getTask(id: number): Task | null {
  const row = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

/** 校验 parentId 合法：存在且属于同一项目且不为自身。 */
function resolveParentId(parentId: number | null | undefined, projectId: number, selfId?: number): number | null {
  if (parentId === undefined || parentId === null) {
    return null;
  }
  if (selfId !== undefined && parentId === selfId) {
    return null;
  }
  const parent = getTask(parentId);
  if (!parent || parent.projectId !== projectId) {
    return null;
  }
  return parentId;
}

export function createTask(input: TaskInput): Task {
  const now = new Date().toISOString();
  const projectId = input.projectId;
  if (projectId === undefined) {
    throw new Error('projectId 必填');
  }
  if (!getProject(projectId)) {
    throw new Error('项目不存在');
  }
  const title = (input.title ?? '').toString().trim();
  if (!title) {
    throw new Error('title 不能为空');
  }
  const priority = Math.min(4, Math.max(1, Math.floor(Number(input.priority ?? 1)) || 1));
  const parentId = resolveParentId(input.parentId, projectId);
  const maxRow = db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM tasks WHERE project_id = ?`).get(projectId) as {
    m: number;
  };
  const sortOrder = input.sortOrder ?? maxRow.m + 1;
  const info = db
    .prepare(
      `INSERT INTO tasks (project_id, parent_id, title, description, priority, due_date, is_completed, completed_at, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
    )
    .run(
      projectId,
      parentId,
      title,
      input.description ?? '',
      priority,
      input.dueDate ?? null,
      sortOrder,
      now,
      now,
    );
  return getTask(Number(info.lastInsertRowid))!;
}

export function updateTask(id: number, input: TaskInput): Task | null {
  const existing = getTask(id);
  if (!existing) {
    return null;
  }
  const projectId = input.projectId ?? existing.projectId;
  const title = input.title ?? existing.title;
  const description = input.description ?? existing.description;
  const priority = input.priority !== undefined ? Math.min(4, Math.max(1, Math.floor(Number(input.priority)) || 1)) : existing.priority;
  const parentId = input.parentId !== undefined ? resolveParentId(input.parentId, projectId, id) : existing.parentId;
  const dueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;
  const isCompleted = input.isCompleted !== undefined ? input.isCompleted : existing.isCompleted;
  const completedAt = isCompleted ? new Date().toISOString() : null;
  const sortOrder = input.sortOrder ?? existing.sortOrder;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE tasks SET project_id = ?, parent_id = ?, title = ?, description = ?, priority = ?, due_date = ?, is_completed = ?, completed_at = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    projectId,
    parentId,
    title,
    description,
    priority,
    dueDate,
    isCompleted ? 1 : 0,
    completedAt,
    sortOrder,
    now,
    id,
  );
  return getTask(id);
}

export function deleteTask(id: number): boolean {
  const info = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  return info.changes > 0;
}

/**
 * 今日视图聚合：未完成、且（有截止日期为今天或早于今天，或优先级 P1/P2）的任务，
 * 按 截止日期(有>无) → 优先级(高>低) → 创建时间 排序。
 */
export function getTodayView(): TodayItem[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `SELECT t.id, t.project_id, p.name AS project_name, p.color AS project_color, t.title, t.priority, t.due_date
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.is_completed = 0
         AND t.parent_id IS NULL
         AND (
           t.due_date IS NOT NULL AND date(t.due_date) <= date(?)
           OR t.priority <= 2
         )
       ORDER BY
         CASE WHEN t.due_date IS NOT NULL THEN 0 ELSE 1 END ASC,
         t.priority ASC,
         t.created_at ASC,
         t.id ASC`,
    )
    .all(todayIso) as Array<{
    id: number;
    project_id: number;
    project_name: string;
    project_color: string;
    title: string;
    priority: number;
    due_date: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    projectColor: row.project_color,
    title: row.title,
    priority: row.priority,
    dueDate: row.due_date,
  }));
}
