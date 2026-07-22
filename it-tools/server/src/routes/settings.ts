import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { settingRepo } from '../repositories/settingRepo';

/** Router exposing `/api/settings`. */
export const settingsRouter: Router = Router();

settingsRouter.get(
  '/settings',
  asyncHandler((_req: Request, res: Response): void => {
    const data: Record<string, string> = settingRepo.getAll();
    res.json({ code: 0, message: 'ok', data });
  })
);

settingsRouter.put(
  '/settings/:key',
  asyncHandler((req: Request, res: Response, next: NextFunction): void => {
    const { value } = req.body ?? {};
    if (typeof value !== 'string') {
      res.status(400).json({ code: 40001, message: '字段校验失败：value 必须为字符串', data: null });
      return;
    }
    settingRepo.set(req.params.key, value);
    res.json({ code: 0, message: 'ok', data: null });
  })
);
