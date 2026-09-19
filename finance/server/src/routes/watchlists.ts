import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listWatchlists,
  getWatchlist,
  createWatchlist,
  deleteWatchlist,
  listWatchlistItems,
  addItem,
  removeItem,
} from '../repositories/watchlistsRepo';
import { getTicker } from '../repositories/tickersRepo';
import type { WatchlistInput } from '../types';

export const watchlistsRouter: Router = Router();

// GET /api/watchlists — 全部自选清单
watchlistsRouter.get(
  '/watchlists',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listWatchlists() });
  }),
);

// GET /api/watchlists/:id — 清单详情 + 标的
watchlistsRouter.get(
  '/watchlists/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const wl = getWatchlist(id);
    if (!wl) {
      throw new HttpError(404, 40400, '自选清单不存在');
    }
    res.json({
      code: 0,
      message: 'ok',
      data: { ...wl, items: listWatchlistItems(id) },
    });
  }),
);

// POST /api/watchlists — 新建清单
watchlistsRouter.post(
  '/watchlists',
  asyncHandler((req: Request, res: Response): void => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const input: WatchlistInput = {
      name: typeof raw.name === 'string' ? raw.name : 'My Watchlist',
    };
    const wl = createWatchlist(input);
    res.status(201).json({ code: 0, message: 'ok', data: wl });
  }),
);

// DELETE /api/watchlists/:id — 删除清单
watchlistsRouter.delete(
  '/watchlists/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteWatchlist(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '自选清单不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);

// POST /api/watchlists/:id/items — 添加标的
watchlistsRouter.post(
  '/watchlists/:id/items',
  asyncHandler((req: Request, res: Response): void => {
    const wlId = Number(req.params.id);
    if (!getWatchlist(wlId)) {
      throw new HttpError(404, 40400, '自选清单不存在');
    }
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const tickerId = Number(raw.tickerId);
    const ticker = getTicker(tickerId);
    if (!ticker) {
      throw new HttpError(400, 40001, 'tickerId 无效');
    }
    addItem(wlId, tickerId);
    res.status(201).json({ code: 0, message: 'ok', data: { watchlistId: wlId, tickerId } });
  }),
);

// DELETE /api/watchlists/:id/items/:tickerId — 移除标的
watchlistsRouter.delete(
  '/watchlists/:id/items/:tickerId',
  asyncHandler((req: Request, res: Response): void => {
    const ok = removeItem(Number(req.params.id), Number(req.params.tickerId));
    if (!ok) {
      throw new HttpError(404, 40400, '条目不存在');
    }
    res.json({ code: 0, message: 'ok', data: { removed: true } });
  }),
);
