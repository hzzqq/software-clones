import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { listTags } from '../repositories/snippetRepo';

export const tagsRouter: Router = Router();

// GET /api/tags — 全部标签（含使用次数）
tagsRouter.get(
  '/tags',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listTags() });
  }),
);
