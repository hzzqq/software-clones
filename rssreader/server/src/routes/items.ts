import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  getItemById,
  listItems,
  markAllRead,
  markItemRead,
  totalUnread,
} from '../repositories/itemRepo';

/**
 * 文章 API（/api/items）。
 *  - GET    /api/items           文章列表（feedId / unread / q 筛选）
 *  - GET    /api/items/:id       文章详情
 *  - POST   /api/items/:id/read  标为已读
 *  - POST   /api/items/read-all  全部标为已读（可选 feedId 限定单个订阅源）
 */
export const itemsRouter: Router = Router();

function optionalPositiveInt(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, 40001, 'feedId 不合法');
  }
  return n;
}

itemsRouter.get(
  '/items',
  asyncHandler((req: Request, res: Response): void => {
    const feedId = optionalPositiveInt(req.query.feedId);
    const unread = req.query.unread === 'true' || req.query.unread === '1';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const items = listItems({ feedId, unreadOnly: unread, q: q || undefined });
    res.json({
      code: 0,
      message: 'ok',
      data: { items, totalUnread: totalUnread() },
    });
  })
);

itemsRouter.get(
  '/items/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 40001, 'id 不合法');
    }
    const item = getItemById(id);
    if (!item) {
      throw new HttpError(404, 40400, '文章不存在');
    }
    res.json({ code: 0, message: 'ok', data: item });
  })
);

itemsRouter.post(
  '/items/:id/read',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 40001, 'id 不合法');
    }
    const item = markItemRead(id);
    if (!item) {
      throw new HttpError(404, 40400, '文章不存在');
    }
    res.json({ code: 0, message: 'ok', data: item });
  })
);

itemsRouter.post(
  '/items/read-all',
  asyncHandler((req: Request, res: Response): void => {
    const { feedId } = req.body ?? {};
    const id = feedId === undefined ? undefined : optionalPositiveInt(feedId);
    const changes = markAllRead(id);
    res.json({ code: 0, message: 'ok', data: { changes } });
  })
);
