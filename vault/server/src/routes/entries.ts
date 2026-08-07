import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { entryRepo, normalizeCategory } from '../repositories/entryRepo';
import type { EntryFilter, EntryInput } from '../types';

export const entriesRouter: Router = Router();

function parseInput(body: unknown): EntryInput | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) return null;
  return {
    title,
    username: typeof b.username === 'string' ? b.username.slice(0, 200) : '',
    password: typeof b.password === 'string' ? b.password : '',
    url: typeof b.url === 'string' ? b.url.slice(0, 500) : '',
    notes: typeof b.notes === 'string' ? b.notes.slice(0, 2000) : '',
    category: normalizeCategory(b.category),
  };
}

entriesRouter.get(
  '/entries',
  asyncHandler((req: Request, res: Response): void => {
    const filter: EntryFilter = {
      q: typeof req.query.q === 'string' ? req.query.q.trim() : '',
      category: typeof req.query.category === 'string' ? req.query.category.trim() : '',
    };
    res.json({ code: 0, message: 'ok', data: entryRepo.list(filter) });
  })
);

entriesRouter.get(
  '/entries/categories',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: entryRepo.categories() });
  })
);

entriesRouter.get(
  '/entries/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const entry = entryRepo.getById(id);
    if (!entry) {
      res.status(404).json({ code: 40400, message: '密码条目不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: entry });
  })
);

entriesRouter.post(
  '/entries',
  asyncHandler((req: Request, res: Response): void => {
    const input = parseInput(req.body);
    if (!input) {
      res.status(400).json({ code: 40001, message: '字段校验失败：title 必填', data: null });
      return;
    }
    const created = entryRepo.create(input);
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

entriesRouter.patch(
  '/entries/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Partial<EntryInput> = {};
    if (b.title !== undefined) {
      if (typeof b.title !== 'string' || !b.title.trim()) {
        res.status(400).json({ code: 40001, message: '字段校验失败：title 不能为空', data: null });
        return;
      }
      patch.title = b.title.trim();
    }
    if (b.username !== undefined) patch.username = String(b.username).slice(0, 200);
    if (b.password !== undefined) patch.password = String(b.password);
    if (b.url !== undefined) patch.url = String(b.url).slice(0, 500);
    if (b.notes !== undefined) patch.notes = String(b.notes).slice(0, 2000);
    if (b.category !== undefined) patch.category = normalizeCategory(b.category);

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ code: 40001, message: '字段校验失败：没有可更新的字段', data: null });
      return;
    }
    const updated = entryRepo.update(id, patch);
    if (!updated) {
      res.status(404).json({ code: 40400, message: '密码条目不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: updated });
  })
);

entriesRouter.delete(
  '/entries/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!entryRepo.getById(id)) {
      res.status(404).json({ code: 40400, message: '密码条目不存在', data: null });
      return;
    }
    entryRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);
