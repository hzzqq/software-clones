import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getTodayView,
} from '../repositories/tasksRepo';
import type { ProjectInput, TaskInput } from '../types';

export const tasksRouter: Router = Router();

// ----------------------------- Projects -----------------------------

// GET /api/projects
tasksRouter.get(
  '/projects',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listProjects() });
  }),
);

// POST /api/projects
tasksRouter.post(
  '/projects',
  asyncHandler((req: Request, res: Response): void => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const input: ProjectInput = {};
    if (raw.name !== undefined) {
      if (typeof raw.name !== 'string' || !raw.name.trim()) {
        throw new HttpError(400, 40001, 'name 不能为空');
      }
      input.name = raw.name.trim();
    }
    if (raw.color !== undefined) {
      if (typeof raw.color !== 'string') {
        throw new HttpError(400, 40001, 'color 必须是字符串');
      }
      input.color = raw.color;
    }
    const project = createProject(input);
    res.status(201).json({ code: 0, message: 'ok', data: project });
  }),
);

// PATCH /api/projects/:id
tasksRouter.patch(
  '/projects/:id',
  asyncHandler((req: Request, res: Response): void => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const input: ProjectInput = {};
    if (raw.name !== undefined) input.name = String(raw.name);
    if (raw.color !== undefined) input.color = String(raw.color);
    if (raw.sortOrder !== undefined) input.sortOrder = Number(raw.sortOrder);
    const project = updateProject(Number(req.params.id), input);
    if (!project) {
      throw new HttpError(404, 40400, '项目不存在');
    }
    res.json({ code: 0, message: 'ok', data: project });
  }),
);

// DELETE /api/projects/:id
tasksRouter.delete(
  '/projects/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteProject(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '项目不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);

// ----------------------------- Tasks -----------------------------

// GET /api/projects/:projectId/tasks
tasksRouter.get(
  '/projects/:projectId/tasks',
  asyncHandler((req: Request, res: Response): void => {
    const projectId = Number(req.params.projectId);
    if (!getProject(projectId)) {
      throw new HttpError(404, 40400, '项目不存在');
    }
    const completedRaw = req.query.completed;
    let completed: boolean | undefined;
    if (completedRaw === 'true') completed = true;
    else if (completedRaw === 'false') completed = false;
    res.json({ code: 0, message: 'ok', data: listTasks(projectId, { completed }) });
  }),
);

// POST /api/projects/:projectId/tasks
tasksRouter.post(
  '/projects/:projectId/tasks',
  asyncHandler((req: Request, res: Response): void => {
    const projectId = Number(req.params.projectId);
    if (!getProject(projectId)) {
      throw new HttpError(404, 40400, '项目不存在');
    }
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const input: TaskInput = { projectId };
    if (raw.parentId !== undefined) input.parentId = raw.parentId === null ? null : Number(raw.parentId);
    if (raw.title !== undefined) {
      if (typeof raw.title !== 'string' || !raw.title.trim()) {
        throw new HttpError(400, 40001, 'title 不能为空');
      }
      input.title = raw.title.trim();
    }
    if (raw.description !== undefined) input.description = String(raw.description);
    if (raw.priority !== undefined) {
      const p = Number(raw.priority);
      if (!Number.isInteger(p) || p < 1 || p > 4) {
        throw new HttpError(400, 40001, 'priority 必须为 1-4');
      }
      input.priority = p;
    }
    if (raw.dueDate !== undefined) input.dueDate = raw.dueDate === null ? null : String(raw.dueDate);
    if (raw.isCompleted !== undefined) input.isCompleted = Boolean(raw.isCompleted);
    if (raw.sortOrder !== undefined) input.sortOrder = Number(raw.sortOrder);
    try {
      const task = createTask(input);
      res.status(201).json({ code: 0, message: 'ok', data: task });
    } catch (err) {
      throw new HttpError(400, 40001, err instanceof Error ? err.message : '创建任务失败');
    }
  }),
);

// GET /api/tasks/:id
tasksRouter.get(
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
tasksRouter.patch(
  '/tasks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const input: TaskInput = {};
    if (raw.projectId !== undefined) input.projectId = Number(raw.projectId);
    if (raw.parentId !== undefined) input.parentId = raw.parentId === null ? null : Number(raw.parentId);
    if (raw.title !== undefined) {
      if (typeof raw.title !== 'string' || !raw.title.trim()) {
        throw new HttpError(400, 40001, 'title 不能为空');
      }
      input.title = raw.title.trim();
    }
    if (raw.description !== undefined) input.description = String(raw.description);
    if (raw.priority !== undefined) {
      const p = Number(raw.priority);
      if (!Number.isInteger(p) || p < 1 || p > 4) {
        throw new HttpError(400, 40001, 'priority 必须为 1-4');
      }
      input.priority = p;
    }
    if (raw.dueDate !== undefined) input.dueDate = raw.dueDate === null ? null : String(raw.dueDate);
    if (raw.isCompleted !== undefined) input.isCompleted = Boolean(raw.isCompleted);
    if (raw.sortOrder !== undefined) input.sortOrder = Number(raw.sortOrder);
    const task = updateTask(Number(req.params.id), input);
    if (!task) {
      throw new HttpError(404, 40400, '任务不存在');
    }
    res.json({ code: 0, message: 'ok', data: task });
  }),
);

// DELETE /api/tasks/:id
tasksRouter.delete(
  '/tasks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteTask(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '任务不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);

// GET /api/today — 今日视图聚合
tasksRouter.get(
  '/today',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: getTodayView() });
  }),
);
