import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { LANGUAGES } from '../languages';

export const languagesRouter: Router = Router();

// GET /api/languages — 支持的语言列表
languagesRouter.get(
  '/languages',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: LANGUAGES });
  }),
);
