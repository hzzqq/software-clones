import db from '../db';
import type { Session, SessionInput, Stats, Task, TaskInput } from '../types';

interface TaskRow {
  id: number;
  title: string;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  is_done: number;
  created_at: string;
}

interface SessionRow {
  id: number;
  task_id: number | null;
  kind: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number;
  completed: number;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    estimatedPomodoros: row.estimated_pomodoros,
    completedPomodoros: row.completed_pomodoros,
    isDone: row.is_done === 1,
    createdAt: row.created_at,
  };
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    taskId: row.task_id,
    kind: row.kind as Session['kind'],
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSec: row.duration_sec,
    completed: row.completed === 1,
  };
}

function bool(value: number): boolean {
  return value === 1;
}

// ----------------------------- Tasks -----------------------------

export function listTasks(): Task[] {
  const rows = db
    .prepare(`SELECT * FROM tasks ORDER BY is_done ASC, created_at DESC, id DESC`)
    .all() as TaskRow[];
  return rows.map(rowToTask);
}

export function getTask(id: number): Task | null {
  const row = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export function createTask(input: TaskInput): Task {
  const now = new Date().toISOString();
  const title = (input.title ?? '').toString().trim();
  if (!title) {
    throw new Error('title 不能为空');
  }
  const estimated = Math.max(1, Math.floor(Number(input.estimatedPomodoros ?? 1)) || 1);
  const info = db
    .prepare(
      `INSERT INTO tasks (title, estimated_pomodoros, completed_pomodoros, is_done, created_at)
       VALUES (?, ?, 0, 0, ?)`,
    )
    .run(title, estimated, now);
  return getTask(Number(info.lastInsertRowid))!;
}

export function updateTask(id: number, input: TaskInput): Task | null {
  const existing = getTask(id);
  if (!existing) {
    return null;
  }
  const title = input.title ?? existing.title;
  const estimated =
    input.estimatedPomodoros !== undefined
      ? Math.max(1, Math.floor(Number(input.estimatedPomodoros)) || 1)
      : existing.estimatedPomodoros;
  const completedPomodoros =
    input.completedPomodoros !== undefined
      ? Math.max(0, Math.floor(Number(input.completedPomodoros)))
      : existing.completedPomodoros;
  const isDone = input.isDone !== undefined ? input.isDone : existing.isDone;
  db.prepare(
    `UPDATE tasks SET title = ?, estimated_pomodoros = ?, completed_pomodoros = ?, is_done = ? WHERE id = ?`,
  ).run(title, estimated, completedPomodoros, isDone ? 1 : 0, id);
  return getTask(id);
}

export function deleteTask(id: number): boolean {
  const info = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  return info.changes > 0;
}

// ----------------------------- Sessions (append-only) -----------------------------

/** 追加一条会话日志。 */
export function createSession(input: SessionInput): Session {
  const now = new Date().toISOString();
  const validKinds = new Set(['focus', 'short_break', 'long_break']);
  if (!validKinds.has(input.kind)) {
    throw new Error('kind 取值不合法');
  }
  const duration = Math.max(0, Math.floor(Number(input.durationSec) || 0));
  const startedAt = input.startedAt ?? now;
  const endedAt = input.endedAt ?? null;
  const completed = input.completed ?? false;
  const info = db
    .prepare(
      `INSERT INTO sessions (task_id, kind, started_at, ended_at, duration_sec, completed)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(input.taskId ?? null, input.kind, startedAt, endedAt, duration, completed ? 1 : 0);
  const id = Number(info.lastInsertRowid);

  // 完成的专注会话 → 累加对应任务的已完成番茄数
  if (completed && input.kind === 'focus' && input.taskId) {
    db.prepare(`UPDATE tasks SET completed_pomodoros = completed_pomodoros + 1 WHERE id = ?`).run(
      input.taskId,
    );
    const task = getTask(input.taskId);
    if (task && task.completedPomodoros >= task.estimatedPomodoros && !task.isDone) {
      db.prepare(`UPDATE tasks SET is_done = 1 WHERE id = ?`).run(input.taskId);
    }
  }

  const row = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as SessionRow;
  return rowToSession(row);
}

/** 会话日志列表（按开始时间倒序）。 */
export function listSessions(limit = 100): Session[] {
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit) || 100));
  const rows = db
    .prepare(`SELECT * FROM sessions ORDER BY started_at DESC, id DESC LIMIT ?`)
    .all(safeLimit) as SessionRow[];
  return rows.map(rowToSession);
}

/**
 * 统计聚合：今日（本地时区 0 点起）与累计的完成番茄数、专注时长。
 * 仅统计完成的 focus 会话。
 */
export function getStats(): Stats {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const todayRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(duration_sec), 0) AS sec
       FROM sessions
       WHERE kind = 'focus' AND completed = 1 AND started_at >= ?`,
    )
    .get(todayIso) as { cnt: number; sec: number };

  const totalRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(duration_sec), 0) AS sec
       FROM sessions
       WHERE kind = 'focus' AND completed = 1`,
    )
    .get() as { cnt: number; sec: number };

  return {
    todayCompleted: Number(todayRow.cnt),
    todayFocusSec: Number(todayRow.sec),
    totalCompleted: Number(totalRow.cnt),
    totalFocusSec: Number(totalRow.sec),
  };
}
