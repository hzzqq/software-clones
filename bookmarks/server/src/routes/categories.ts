import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listCategories,
  createCategory,
  renameCategory,
  deleteCategory,
} from '../repositories/categoryRepo';

export const categoriesRouter: Router = Router();

/** 解析分类名称：必须为非空字符串。 */
function parseName(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new HttpError(400, 40001, 'name 不能为空');
  }
  return raw.trim();
}

// GET /api/categories — 全部分类（含书签数）
categoriesRouter.get(
  '/categories',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listCategories() });
  }),
);

// POST /api/categories — 创建分类
categoriesRouter.post(
  '/categories',
  asyncHandler((req: Request, res: Response): void => {
    const name = parseName(req.body?.name);
    const category = createCategory(name);
    if (!category) {
      throw new HttpError(409, 40900, '分类名称已存在');
    }
    res.status(201).json({ code: 0, message: 'ok', data: category });
  }),
);

// PATCH /api/categories/:id — 重命名分类
categoriesRouter.patch(
  '/categories/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const name = parseName(req.body?.name);
    const category = renameCategory(id, name);
    if (!category) {
      const existing = listCategories().find((c) => c.id === id);
      throw new HttpError(existing ? 409 : 404, existing ? 40900 : 40400, existing ? '分类名称已存在' : '分类不存在');
    }
    res.json({ code: 0, message: 'ok', data: category });
  }),
);

// DELETE /api/categories/:id — 删除分类（书签保留，变为未分类）
categoriesRouter.delete(
  '/categories/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteCategory(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '分类不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);
