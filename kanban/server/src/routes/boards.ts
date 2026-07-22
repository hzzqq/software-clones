import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { boardRepo } from '../repositories/boardRepo';

export const boardsRouter: Router = Router();

boardsRouter.get(
  '/boards',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: boardRepo.list() });
  })
);

boardsRouter.post(
  '/boards',
  asyncHandler((req: Request, res: Response): void => {
    const { name } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：name 必填', data: null });
      return;
    }
    const created = boardRepo.create(name.trim());
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

boardsRouter.get(
  '/boards/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const detail = boardRepo.getDetail(id);
    if (!detail) {
      res.status(404).json({ code: 40400, message: '看板不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: detail });
  })
);

boardsRouter.patch(
  '/boards/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const { name } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：name 必填', data: null });
      return;
    }
    const updated = boardRepo.update(id, name.trim());
    if (!updated) {
      res.status(404).json({ code: 40400, message: '看板不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: updated });
  })
);

boardsRouter.delete(
  '/boards/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!boardRepo.getById(id)) {
      res.status(404).json({ code: 40400, message: '看板不存在', data: null });
      return;
    }
    boardRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);

boardsRouter.get(
  '/boards/:id/lists',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const detail = boardRepo.getDetail(id);
    if (!detail) {
      res.status(404).json({ code: 40400, message: '看板不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: detail.lists });
  })
);
