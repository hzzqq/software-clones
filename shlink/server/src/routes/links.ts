import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  createLink,
  deleteLink,
  getLinkById,
  listLinks,
  summarizeLinks,
} from '../repositories/linkRepo';

/**
 * 短链接 CRUD API（/api/links）。
 *  - GET    /api/links        全部短链 + 汇总统计
 *  - POST   /api/links        长链 → 短码（服务端生成短码，自动防碰撞）
 *  - GET    /api/links/:id    单条短链详情（含点击统计）
 *  - DELETE /api/links/:id    删除短链
 */
export const linksRouter: Router = Router();

/** 规范化 URL：仅允许 http/https，去掉首尾空白。 */
function normalizeUrl(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new HttpError(400, 40001, 'url 必须是字符串');
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new HttpError(400, 40001, 'url 不能为空');
  }
  let candidate: string;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    // 已带协议：只接受 http/https，其余（ftp、javascript 等）一律拒绝。
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new HttpError(400, 40001, '仅支持 http/https 协议');
    }
    candidate = trimmed;
  } else {
    // 用户省略协议时默认补 https://（与主流短链服务一致）。
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

linksRouter.get(
  '/links',
  asyncHandler((_req: Request, res: Response): void => {
    const links = listLinks();
    const summary = summarizeLinks();
    res.json({ code: 0, message: 'ok', data: { links, summary } });
  }),
);

linksRouter.post(
  '/links',
  asyncHandler((req: Request, res: Response): void => {
    const { url, title } = req.body ?? {};
    const normalized = normalizeUrl(url);
    const cleanTitle =
      typeof title === 'string' && title.trim() ? title.trim() : normalized;
    const link = createLink({ url: normalized, title: cleanTitle });
    res.status(201).json({ code: 0, message: 'ok', data: link });
  }),
);

linksRouter.get(
  '/links/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 40001, 'id 不合法');
    }
    const link = getLinkById(id);
    if (!link) {
      throw new HttpError(404, 40400, '短链接不存在');
    }
    res.json({ code: 0, message: 'ok', data: link });
  }),
);

linksRouter.delete(
  '/links/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 40001, 'id 不合法');
    }
    if (!deleteLink(id)) {
      throw new HttpError(404, 40400, '短链接不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id } });
  }),
);
