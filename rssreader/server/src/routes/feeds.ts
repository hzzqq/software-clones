import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { fetchAndParseFeed } from '../lib/feedFetch';
import type { ParsedFeed } from '../lib/xml';
import {
  createFeed,
  deleteFeed,
  findFeedByUrl,
  getFeedById,
  listFeeds,
  updateFeedLastFetched,
} from '../repositories/feedRepo';
import { upsertItems } from '../repositories/itemRepo';

/**
 * 订阅源管理 API（/api/feeds）。
 *  - GET    /api/feeds            全部订阅源（含未读数）
 *  - POST   /api/feeds            添加订阅（抓取并解析 RSS/Atom，首次拉取文章）
 *  - DELETE /api/feeds/:id        删除订阅（级联删除文章）
 *  - POST   /api/feeds/:id/refresh 手动刷新（抓取 + 增量入库，返回新增数）
 */
export const feedsRouter: Router = Router();

function normalizeFeedUrl(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new HttpError(400, 40001, 'url 不能为空');
  }
  const trimmed = raw.trim();
  let candidate: string;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    // 已带协议：只接受 http/https，其余（ftp、javascript 等）一律拒绝。
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new HttpError(400, 40001, '仅支持 http/https 协议');
    }
    candidate = trimmed;
  } else {
    candidate = `https://${trimmed}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new HttpError(400, 40001, 'url 不是合法的网址');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(400, 40001, '仅支持 http/https 协议');
  }
  return parsed.toString();
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 40001, 'id 不合法');
  }
  return id;
}

feedsRouter.get(
  '/feeds',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: { feeds: listFeeds() } });
  })
);

feedsRouter.post(
  '/feeds',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { url, category } = req.body ?? {};
    const feedUrl = normalizeFeedUrl(url);
    if (findFeedByUrl(feedUrl)) {
      throw new HttpError(409, 40900, '该订阅源已存在');
    }
    const categoryText =
      typeof category === 'string' && category.trim() ? category.trim() : '默认';

    let parsed: ParsedFeed;
    try {
      parsed = await fetchAndParseFeed(feedUrl);
    } catch (err) {
      throw new HttpError(
        400,
        40002,
        `订阅源抓取失败：${err instanceof Error ? err.message : '未知错误'}`
      );
    }

    const now = new Date().toISOString();
    const feed = createFeed({
      title: parsed.title || feedUrl,
      url: feedUrl,
      category: categoryText,
      lastFetchedAt: now,
    });
    if (!feed) {
      // 并发下重复添加的兜底。
      throw new HttpError(409, 40900, '该订阅源已存在');
    }
    const { added } = upsertItems(feed.id, parsed.items);
    // 重新取带统计的 feed（未读数 / 文章数），与列表页展示一致。
    const feedWithStats = listFeeds().find((f) => f.id === feed.id) ?? feed;
    res.status(201).json({ code: 0, message: 'ok', data: { feed: feedWithStats, added } });
  })
);

feedsRouter.delete(
  '/feeds/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = parseId(req.params.id);
    if (!deleteFeed(id)) {
      throw new HttpError(404, 40400, '订阅源不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id } });
  })
);

feedsRouter.post(
  '/feeds/:id/refresh',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params.id);
    const feed = getFeedById(id);
    if (!feed) {
      throw new HttpError(404, 40400, '订阅源不存在');
    }
    let parsed: ParsedFeed;
    try {
      parsed = await fetchAndParseFeed(feed.url);
    } catch (err) {
      throw new HttpError(
        400,
        40002,
        `订阅源抓取失败：${err instanceof Error ? err.message : '未知错误'}`
      );
    }
    const now = new Date().toISOString();
    updateFeedLastFetched(id, now);
    const { added } = upsertItems(id, parsed.items);
    const refreshed = listFeeds().find((f) => f.id === id) ?? null;
    res.json({ code: 0, message: 'ok', data: { feed: refreshed, added } });
  })
);
