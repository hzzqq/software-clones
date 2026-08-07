import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listBookmarks,
  getBookmark,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '../repositories/bookmarkRepo';
import type { BookmarkInput } from '../types';

export const bookmarksRouter: Router = Router();

/** 解析书签输入；`partial` 为 true 时 url/title 可缺省（用于 PATCH）。 */
function parseBookmarkInput(body: unknown, partial: boolean): Partial<BookmarkInput> {
  const raw = (body ?? {}) as Record<string, unknown>;
  const input: Partial<BookmarkInput> = {};

  if (raw.url !== undefined) {
    if (typeof raw.url !== 'string' || !raw.url.trim()) {
      throw new HttpError(400, 40001, 'url 不能为空');
    }
    input.url = raw.url.trim();
  } else if (!partial) {
    throw new HttpError(400, 40001, 'url 是必填项');
  }

  if (raw.title !== undefined) {
    if (typeof raw.title !== 'string' || !raw.title.trim()) {
      throw new HttpError(400, 40001, 'title 不能为空');
    }
    input.title = raw.title.trim();
  } else if (!partial) {
    throw new HttpError(400, 40001, 'title 是必填项');
  }

  if (raw.description !== undefined) {
    if (typeof raw.description !== 'string') {
      throw new HttpError(400, 40001, 'description 必须是字符串');
    }
    input.description = raw.description;
  }

  if (raw.categoryId !== undefined) {
    if (raw.categoryId === null || raw.categoryId === '') {
      input.categoryId = null;
    } else {
      const n = Number(raw.categoryId);
      if (!Number.isInteger(n) || n <= 0) {
        throw new HttpError(400, 40001, 'categoryId 必须是正整数或 null');
      }
      input.categoryId = n;
    }
  }

  return input;
}

// GET /api/bookmarks?categoryId=&q=&uncategorized=1
bookmarksRouter.get(
  '/bookmarks',
  asyncHandler((req: Request, res: Response): void => {
    const q = req.query;
    const rawCategory = q.categoryId;
    let categoryId: number | null | undefined;
    if (q.uncategorized === '1') {
      categoryId = null;
    } else if (typeof rawCategory === 'string' && rawCategory !== '') {
      const n = Number(rawCategory);
      if (!Number.isInteger(n) || n <= 0) {
        throw new HttpError(400, 40001, 'categoryId 必须是正整数');
      }
      categoryId = n;
    }
    const search = typeof q.q === 'string' ? q.q.trim() : '';
    res.json({
      code: 0,
      message: 'ok',
      data: listBookmarks({ categoryId, q: search || undefined }),
    });
  }),
);

// POST /api/bookmarks
bookmarksRouter.post(
  '/bookmarks',
  asyncHandler((req: Request, res: Response): void => {
    const input = parseBookmarkInput(req.body, false) as BookmarkInput;
    const result = createBookmark(input);
    if (result.duplicate) {
      throw new HttpError(409, 40901, '该链接已收藏，请勿重复添加');
    }
    res.status(201).json({ code: 0, message: 'ok', data: result.bookmark });
  }),
);

// GET /api/bookmarks/:id
bookmarksRouter.get(
  '/bookmarks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const bookmark = getBookmark(Number(req.params.id));
    if (!bookmark) {
      throw new HttpError(404, 40400, '书签不存在');
    }
    res.json({ code: 0, message: 'ok', data: bookmark });
  }),
);

// PATCH /api/bookmarks/:id
bookmarksRouter.patch(
  '/bookmarks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const input = parseBookmarkInput(req.body, true);
    let bookmark;
    try {
      bookmark = updateBookmark(Number(req.params.id), input);
    } catch (err) {
      if (err instanceof Error && err.message === 'duplicate url') {
        throw new HttpError(409, 40901, '该链接已收藏，请勿重复添加');
      }
      throw err;
    }
    if (!bookmark) {
      throw new HttpError(404, 40400, '书签不存在');
    }
    res.json({ code: 0, message: 'ok', data: bookmark });
  }),
);

// DELETE /api/bookmarks/:id
bookmarksRouter.delete(
  '/bookmarks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteBookmark(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '书签不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);
