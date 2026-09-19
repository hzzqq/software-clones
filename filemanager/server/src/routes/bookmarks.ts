import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { createBookmark, listBookmarks, deleteBookmark } from '../repositories/bookmarkRepo';

/**
 * 书签（常用目录快捷入口）CRUD 路由。
 */
export const bookmarksRouter: Router = Router();

// 创建
bookmarksRouter.post(
  '/bookmarks',
  asyncHandler((req: Request, res: Response): void => {
    const pathStr: string = typeof req.body?.path === 'string' ? req.body.path : '';
    const name: string = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!pathStr || !name) {
      res.status(400).json({ code: 40001, message: '书签的路径与名称均不能为空', data: null });
      return;
    }
    res.status(201).json({
      code: 0,
      message: 'ok',
      data: createBookmark({ path: pathStr, name }),
    });
  })
);

// 列表
bookmarksRouter.get(
  '/bookmarks',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listBookmarks() });
  })
);

// 删除
bookmarksRouter.delete(
  '/bookmarks/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ code: 40001, message: 'ID 不合法', data: null });
      return;
    }
    if (!deleteBookmark(id)) {
      res.status(404).json({ code: 40400, message: '书签不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: { ok: true } });
  })
);
