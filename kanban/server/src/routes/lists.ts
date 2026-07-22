import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { listRepo } from '../repositories/listRepo';

export const listsRouter: Router = Router();

listsRouter.post(
  '/lists',
  asyncHandler((req: Request, res: Response): void => {
    const { boardId, title, position } = req.body ?? {};
    if (typeof boardId !== 'number' || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：boardId(number) 与 title 必填', data: null });
      return;
    }
    const created = listRepo.create({
      boardId,
      title: title.trim(),
      position: typeof position === 'number' ? position : 0,
    });
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

listsRouter.patch(
  '/lists/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const { title, position } = req.body ?? {};
    const patch: { title?: string; position?: number } = {};
    if (typeof title === 'string') patch.title = title.trim();
    if (typeof position === 'number') patch.position = position;
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ code: 40001, message: '字段校验失败：至少提供 title 或 position', data: null });
      return;
    }
    const updated = listRepo.update(id, patch);
    if (!updated) {
      res.status(404).json({ code: 40400, message: '列表不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: updated });
  })
);

listsRouter.delete(
  '/lists/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!listRepo.getById(id)) {
      res.status(404).json({ code: 40400, message: '列表不存在', data: null });
      return;
    }
    listRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);
