import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { upsertCell, getTableIdOfRow } from '../repositories/rowRepo';
import { getField } from '../repositories/fieldRepo';

export const cellsRouter: Router = Router();

// PUT /api/cells — 写入（或更新）单元格 { rowId, fieldId, value }
cellsRouter.put(
  '/cells',
  asyncHandler((req: Request, res: Response): void => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rowId = Number(body.rowId);
    const fieldId = Number(body.fieldId);
    if (!Number.isInteger(rowId) || !Number.isInteger(fieldId)) {
      throw new HttpError(400, 40001, 'rowId / fieldId 必须是数字');
    }
    if (getTableIdOfRow(rowId) === null) {
      throw new HttpError(404, 40400, '行不存在');
    }
    if (!getField(fieldId)) {
      throw new HttpError(404, 40400, '字段不存在');
    }
    // value 统一为字符串或 null（空值时存 null）。
    const raw = body.value;
    const value: string | null = raw === undefined || raw === null ? null : String(raw);
    upsertCell(rowId, fieldId, value);
    res.json({ code: 0, message: 'ok', data: { rowId, fieldId, value } });
  }),
);
