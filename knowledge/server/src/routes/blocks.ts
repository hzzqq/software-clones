import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  createBlock,
  getBlock,
  updateBlock,
  deleteBlock,
} from '../repositories/blockRepo';
import { refreshBlockLinks, getBacklinksForBlock } from '../repositories/linkRepo';
import { searchBlocks } from '../repositories/blockRepo';

export const blocksRouter: Router = Router();

/** 解析 parentId（允许 null / 数字 / 缺失）。 */
function parseParentId(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, 40001, 'parentId 非法');
  }
  return n;
}

// POST /api/blocks
blocksRouter.post(
  '/blocks',
  asyncHandler((req: Request, res: Response): void => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const pageId = Number(body.pageId);
    if (!Number.isInteger(pageId) || pageId <= 0) {
      throw new HttpError(400, 40001, 'pageId 非法');
    }
    const content = typeof body.content === 'string' ? body.content : '';
    const parentId = parseParentId(body.parentId);
    const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    const block = createBlock({ pageId, parentId, content, sortOrder });
    refreshBlockLinks(block.id, block.content);
    res.status(201).json({ code: 0, message: 'ok', data: block });
  }),
);

// GET /api/blocks/:id
blocksRouter.get(
  '/blocks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const block = getBlock(Number(req.params.id));
    if (!block) {
      throw new HttpError(404, 40400, '块不存在');
    }
    res.json({ code: 0, message: 'ok', data: block });
  }),
);

// GET /api/blocks/:id/backlinks
blocksRouter.get(
  '/blocks/:id/backlinks',
  asyncHandler((req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: getBacklinksForBlock(Number(req.params.id)) });
  }),
);

// PATCH /api/blocks/:id
blocksRouter.patch(
  '/blocks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const input: {
      content?: string;
      parentId?: number | null;
      sortOrder?: number;
    } = {};

    if (body.content !== undefined) {
      if (typeof body.content !== 'string') {
        throw new HttpError(400, 40001, 'content 必须是字符串');
      }
      input.content = body.content;
    }
    if (body.parentId !== undefined) {
      input.parentId = parseParentId(body.parentId);
    }
    if (body.sortOrder !== undefined) {
      input.sortOrder = Number(body.sortOrder);
    }

    const block = updateBlock(id, input);
    if (!block) {
      throw new HttpError(404, 40400, '块不存在');
    }
    if (input.content !== undefined) {
      refreshBlockLinks(id, block.content);
    }
    res.json({ code: 0, message: 'ok', data: block });
  }),
);

// DELETE /api/blocks/:id
blocksRouter.delete(
  '/blocks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteBlock(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '块不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);

// GET /api/search/blocks?q= —— 块内容搜索
blocksRouter.get(
  '/search/blocks',
  asyncHandler((req: Request, res: Response): void => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    res.json({
      code: 0,
      message: 'ok',
      data: q ? searchBlocks(q) : [],
    });
  }),
);
