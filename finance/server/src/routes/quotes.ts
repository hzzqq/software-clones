import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listQuotes,
  getQuoteBySymbol,
  refreshQuotes,
} from '../repositories/quotesRepo';

export const quotesRouter: Router = Router();

// GET /api/quotes — 全部行情
quotesRouter.get(
  '/quotes',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listQuotes() });
  }),
);

// GET /api/quotes/:symbol — 单个行情
quotesRouter.get(
  '/quotes/:symbol',
  asyncHandler((req: Request, res: Response): void => {
    const quote = getQuoteBySymbol(req.params.symbol.toUpperCase());
    if (!quote) {
      throw new HttpError(404, 40400, '行情不存在');
    }
    res.json({ code: 0, message: 'ok', data: quote });
  }),
);

// POST /api/refresh — 刷新行情（离线优先；配置 key 时尝试远程）
quotesRouter.post(
  '/refresh',
  asyncHandler((_req: Request, res: Response): void => {
    const result = refreshQuotes();
    res.json({ code: 0, message: 'ok', data: result });
  }),
);
