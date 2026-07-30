import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { listTags } from '../repositories/tagRepo';
import { requireAuth } from '../middleware/auth';

export const tagsRouter: Router = Router();

// 整组路由需登录
tagsRouter.use(requireAuth);

tagsRouter.get(
  '/tags',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listTags() });
  }),
);
