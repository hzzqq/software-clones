import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  createSession,
  listSessions,
  getStats,
} from '../repositories/pomodoroRepo';
import type { SessionInput, TaskInput } from '../types';

export const pomodoroRouter: Router = Router();

// ----------------------------- Tasks -----------------------------

// GET /api/tasks
pomodoroRouter.get(
  '/tasks',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listTasks() });
  }),
);

// POST /api/tasks
pomodoroRouter.post(
  '/tasks',
  asyncHandler((req: Request, res: Response): void => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const input: TaskInput = {};
    if (raw.title !== undefined) {
      if (typeof raw.title !== 'string' || !raw.title.trim()) {
        throw new HttpError(400, 40001, 'title 不能为空');
      }
      input.title = raw.title.trim();
    }
    if (raw.estimatedPomodoros !== undefined) input.estimatedPomodoros = Number(raw.estimatedPomodoros);
    try {
      const task = createTask(input);
      res.status(201).json({ code: 0, message: 'ok', data: task });
    } catch (err) {
      throw new HttpError(400, 40001, err instanceof Error ? err.message : '创建任务失败');
    }
  }),
);

// GET /api/tasks/:id
pomodoroRouter.get(
  '/tasks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const task = getTask(Number(req.params.id));
    if (!task) {
      throw new HttpError(404, 40400, '任务不存在');
    }
    res.json({ code: 0, message: 'ok', data: task });
  }),
);

// PATCH /api/tasks/:id
pomodoroRouter.patch(
  '/tasks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const input: TaskInput = {};
    if (raw.title !== undefined) input.title = String(raw.title);
    if (raw.estimatedPomodoros !== undefined) input.estimatedPomodoros = Number(raw.estimatedPomodoros);
    if (raw.completedPomodoros !== undefined) input.completedPomodoros = Number(raw.completedPomodoros);
    if (raw.isDone !== undefined) input.isDone = Boolean(raw.isDone);
    const task = updateTask(Number(req.params.id), input);
    if (!task) {
      throw new HttpError(404, 40400, '任务不存在');
    }
    res.json({ code: 0, message: 'ok', data: task });
  }),
);

// DELETE /api/tasks/:id
pomodoroRouter.delete(
  '/tasks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteTask(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '任务不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);

// ----------------------------- Sessions (append-only log) -----------------------------

// POST /api/sessions
pomodoroRouter.post(
  '/sessions',
  asyncHandler((req: Request, res: Response): void => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const input: SessionInput = {
      kind: raw.kind as SessionInput['kind'],
      durationSec: Number(raw.durationSec),
    };
    if (raw.taskId !== undefined) input.taskId = raw.taskId === null ? null : Number(raw.taskId);
    if (raw.startedAt !== undefined) input.startedAt = String(raw.startedAt);
    if (raw.endedAt !== undefined) input.endedAt = raw.endedAt === null ? null : String(raw.endedAt);
    if (raw.completed !== undefined) input.completed = Boolean(raw.completed);
    if (!['focus', 'short_break', 'long_break'].includes(input.kind)) {
      throw new HttpError(400, 40001, 'kind 取值不合法');
    }
    try {
      const session = createSession(input);
      res.status(201).json({ code: 0, message: 'ok', data: session });
    } catch (err) {
      throw new HttpError(400, 40001, err instanceof Error ? err.message : '创建会话失败');
    }
  }),
);

// GET /api/sessions?limit=
pomodoroRouter.get(
  '/sessions',
  asyncHandler((req: Request, res: Response): void => {
    const limitRaw = req.query.limit;
    const limit = limitRaw !== undefined ? Number(limitRaw) : 100;
    res.json({ code: 0, message: 'ok', data: listSessions(limit) });
  }),
);

// GET /api/stats — 今日/累计统计
pomodoroRouter.get(
  '/stats',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: getStats() });
  }),
);
