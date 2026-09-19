import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { getField, updateField, deleteField } from '../repositories/fieldRepo';
import { isSupportedFieldType } from '../fieldTypes';
import type { FieldType } from '../fieldTypes';

export const fieldsRouter: Router = Router();

// PATCH /api/fields/:id — 更新字段（名称 / 类型 / 选项 / 排序）
fieldsRouter.patch(
  '/fields/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!getField(id)) {
      throw new HttpError(404, 40400, '字段不存在');
    }
    const patch: {
      name?: string;
      type?: FieldType;
      options?: string[] | null;
      sortOrder?: number;
    } = {};

    if (req.body?.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
        throw new HttpError(400, 40001, 'name 不能为空');
      }
      patch.name = req.body.name.trim();
    }
    if (req.body?.type !== undefined) {
      if (!isSupportedFieldType(req.body.type)) {
        throw new HttpError(400, 40001, '字段类型不受支持');
      }
      patch.type = req.body.type as FieldType;
    }
    if (req.body?.options !== undefined) {
      patch.options = Array.isArray(req.body.options)
        ? (req.body.options as unknown[]).map(String)
        : null;
    }
    if (req.body?.sortOrder !== undefined) {
      const n = Number(req.body.sortOrder);
      if (!Number.isFinite(n)) {
        throw new HttpError(400, 40001, 'sortOrder 必须是数字');
      }
      patch.sortOrder = n;
    }

    const field = updateField(id, patch);
    res.json({ code: 0, message: 'ok', data: field });
  }),
);

// DELETE /api/fields/:id — 删除字段
fieldsRouter.delete(
  '/fields/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!getField(id)) {
      throw new HttpError(404, 40400, '字段不存在');
    }
    deleteField(id);
    res.json({ code: 0, message: 'ok', data: { id } });
  }),
);
