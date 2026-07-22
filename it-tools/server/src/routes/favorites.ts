import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { favoriteRepo, Favorite } from '../repositories/favoriteRepo';

/** Router exposing `/api/favorites`. */
export const favoritesRouter: Router = Router();

favoritesRouter.get(
  '/favorites',
  asyncHandler((_req: Request, res: Response): void => {
    const data: Favorite[] = favoriteRepo.list();
    res.json({ code: 0, message: 'ok', data });
  })
);

favoritesRouter.post(
  '/favorites',
  asyncHandler((req: Request, res: Response, next: NextFunction): void => {
    const { toolKey, title, data } = req.body ?? {};
    if (typeof toolKey !== 'string' || typeof title !== 'string' || typeof data !== 'string') {
      res.status(400).json({ code: 40001, message: '字段校验失败：toolKey/title/data 均为必填字符串', data: null });
      return;
    }
    const created: Favorite = favoriteRepo.create({ toolKey, title, data });
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

favoritesRouter.delete(
  '/favorites/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ code: 40000, message: '无效的 ID', data: null });
      return;
    }
    favoriteRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);
