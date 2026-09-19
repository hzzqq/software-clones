import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { listTickers, getTickerBySymbol, createTicker } from '../repositories/tickersRepo';
import type { TickerInput } from '../types';

export const tickersRouter: Router = Router();

// GET /api/tickers — 全部标的
tickersRouter.get(
  '/tickers',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listTickers() });
  }),
);

// GET /api/tickers/:symbol — 单个标的
tickersRouter.get(
  '/tickers/:symbol',
  asyncHandler((req: Request, res: Response): void => {
    const ticker = getTickerBySymbol(req.params.symbol.toUpperCase());
    if (!ticker) {
      throw new HttpError(404, 40400, '标的不存在');
    }
    res.json({ code: 0, message: 'ok', data: ticker });
  }),
);

// POST /api/tickers — 新增标的
tickersRouter.post(
  '/tickers',
  asyncHandler((req: Request, res: Response): void => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    if (typeof raw.symbol !== 'string' || !raw.symbol.trim()) {
      throw new HttpError(400, 40001, 'symbol 必须是非空字符串');
    }
    const input: TickerInput = {
      symbol: raw.symbol,
      name: typeof raw.name === 'string' ? raw.name : undefined,
      type: typeof raw.type === 'string' ? raw.type : undefined,
    };
    const ticker = createTicker(input);
    res.status(201).json({ code: 0, message: 'ok', data: ticker });
  }),
);
