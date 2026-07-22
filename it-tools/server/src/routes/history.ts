import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { historyRepo, History } from '../repositories/historyRepo';

/** Router exposing `/api/history`. */
export const historyRouter: Router = Router();

historyRouter.get(
  '/history',
  asyncHandler((req: Request, res: Response): void => {
    const limit: number = Math.max(1, Number(req.query.limit ?? 50));
    const data: History[] = historyRepo.list(limit);
    res.json({ code: 0, message: 'ok', data });
  })
);

historyRouter.post(
  '/history',
  asyncHandler((req: Request, res: Response, next: NextFunction): void => {
    const { toolKey, summary } = req.body ?? {};
    if (typeof toolKey !== 'string' || typeof summary !== 'string') {
      res.status(400).json({ code: 40001, message: '字段校验失败：toolKey/summary 均为必填字符串', data: null });
      return;
    }
    const created: History = historyRepo.create({ toolKey, summary });
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

historyRouter.delete(
  '/history/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ code: 40000, message: '无效的 ID', data: null });
      return;
    }
    historyRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);
