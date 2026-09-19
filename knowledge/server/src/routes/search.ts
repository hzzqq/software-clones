import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { searchPages } from '../repositories/pageRepo';
import { searchBlocks } from '../repositories/blockRepo';

/**
 * 统一搜索入口：同时检索页面标题与块内容。
 * 保留独立路由（而非挂在 pages/blocks 下）以保持 /api/search 语义清晰。
 */
export const searchRouter: Router = Router();

searchRouter.get(
  '/search',
  asyncHandler((req: Request, res: Response): void => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      res.json({ code: 0, message: 'ok', data: { pages: [], blocks: [] } });
      return;
    }
    res.json({
      code: 0,
      message: 'ok',
      data: { pages: searchPages(q), blocks: searchBlocks(q) },
    });
  }),
);
