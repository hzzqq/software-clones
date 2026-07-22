import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { fetchRss } from '../services/rssProxy';
import { fetchWeather } from '../services/weatherProxy';
import { checkStatus } from '../services/statusProxy';

export const proxyRouter: Router = Router();

// RSS / Atom feed proxy (avoids browser CORS).
proxyRouter.get(
  '/proxy/rss',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const url: string = String(req.query.url ?? '');
    if (!url) {
      res.status(400).json({ code: 40001, message: '缺少 url 参数', data: null });
      return;
    }
    try {
      const feed = await fetchRss(url);
      res.json({ code: 0, message: 'ok', data: feed });
    } catch (e) {
      res.status(502).json({
        code: 50200,
        message: `RSS 代理失败：${(e as Error).message}`,
        data: null,
      });
    }
  })
);

// Current-weather proxy via Open-Meteo (no API key needed).
proxyRouter.get(
  '/proxy/weather',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const lat: number = Number(req.query.lat);
    const lon: number = Number(req.query.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      res.status(400).json({ code: 40001, message: '缺少合法的 lat / lon 参数', data: null });
      return;
    }
    try {
      const weather = await fetchWeather(lat, lon);
      res.json({ code: 0, message: 'ok', data: weather });
    } catch (e) {
      res.status(502).json({
        code: 50200,
        message: `天气代理失败：${(e as Error).message}`,
        data: null,
      });
    }
  })
);

// HTTP status probe proxy.
proxyRouter.get(
  '/proxy/status',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const url: string = String(req.query.url ?? '');
    if (!url) {
      res.status(400).json({ code: 40001, message: '缺少 url 参数', data: null });
      return;
    }
    const result = await checkStatus(url);
    res.json({ code: 0, message: 'ok', data: result });
  })
);
