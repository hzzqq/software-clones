import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listPages,
  getPage,
  getPageByTitle,
  createPage,
  updatePage,
  deletePage,
  searchPages,
} from '../repositories/pageRepo';
import { buildTree } from '../repositories/blockRepo';
import { getBacklinksForPage } from '../repositories/linkRepo';

export const pagesRouter: Router = Router();

/** 校验标题（非空字符串）。 */
function parseTitle(body: unknown): string {
  const raw = (body ?? {}) as Record<string, unknown>;
  if (typeof raw.title !== 'string' || !raw.title.trim()) {
    throw new HttpError(400, 40001, 'title 不能为空');
  }
  return raw.title.trim();
}

// GET /api/pages
pagesRouter.get(
  '/pages',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listPages() });
  }),
);

// POST /api/pages
pagesRouter.post(
  '/pages',
  asyncHandler((req: Request, res: Response): void => {
    const title = parseTitle(req.body);
    if (getPageByTitle(title)) {
      throw new HttpError(409, 40901, '页面标题已存在');
    }
    const page = createPage(title);
    res.status(201).json({ code: 0, message: 'ok', data: page });
  }),
);

// GET /api/pages/:id —— 返回页面 + 大纲树
pagesRouter.get(
  '/pages/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const page = getPage(id);
    if (!page) {
      throw new HttpError(404, 40400, '页面不存在');
    }
    res.json({ code: 0, message: 'ok', data: { page, tree: buildTree(id) } });
  }),
);

// GET /api/pages/:id/backlinks —— 页面反链
pagesRouter.get(
  '/pages/:id/backlinks',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!getPage(id)) {
      throw new HttpError(404, 40400, '页面不存在');
    }
    res.json({ code: 0, message: 'ok', data: getBacklinksForPage(id) });
  }),
);

// PATCH /api/pages/:id
pagesRouter.patch(
  '/pages/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const title = parseTitle(req.body);
    const conflict = getPageByTitle(title);
    if (conflict && conflict.id !== id) {
      throw new HttpError(409, 40901, '页面标题已存在');
    }
    const page = updatePage(id, title);
    if (!page) {
      throw new HttpError(404, 40400, '页面不存在');
    }
    res.json({ code: 0, message: 'ok', data: page });
  }),
);

// DELETE /api/pages/:id
pagesRouter.delete(
  '/pages/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const ok = deletePage(id);
    if (!ok) {
      throw new HttpError(404, 40400, '页面不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id } });
  }),
);

// GET /api/search?q= —— 页面 + 块搜索（页面内部路由，避免与 /pages 冲突）
pagesRouter.get(
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
      data: { pages: searchPages(q), blocks: [] },
    });
  }),
);
