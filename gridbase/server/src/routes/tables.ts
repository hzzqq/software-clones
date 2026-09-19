import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { listTables, getTable, createTable, updateTable, deleteTable } from '../repositories/tableRepo';
import { listFields, createField } from '../repositories/fieldRepo';
import { getGrid, createRow } from '../repositories/rowRepo';
import { isSupportedFieldType } from '../fieldTypes';
import type { FieldType } from '../fieldTypes';

export const tablesRouter: Router = Router();

/** 解析名称参数；缺失或空白视为非法。 */
function parseName(body: unknown): string {
  const raw = (body ?? {}) as Record<string, unknown>;
  const name = raw.name;
  if (typeof name !== 'string' || !name.trim()) {
    throw new HttpError(400, 40001, 'name 不能为空');
  }
  return name.trim();
}

// GET /api/tables — 全部表
tablesRouter.get(
  '/tables',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listTables() });
  }),
);

// POST /api/tables — 新建表
tablesRouter.post(
  '/tables',
  asyncHandler((req: Request, res: Response): void => {
    const table = createTable(parseName(req.body));
    res.status(201).json({ code: 0, message: 'ok', data: table });
  }),
);

// GET /api/tables/:id — 表详情
tablesRouter.get(
  '/tables/:id',
  asyncHandler((req: Request, res: Response): void => {
    const table = getTable(Number(req.params.id));
    if (!table) {
      throw new HttpError(404, 40400, '表不存在');
    }
    res.json({ code: 0, message: 'ok', data: table });
  }),
);

// PATCH /api/tables/:id — 重命名
tablesRouter.patch(
  '/tables/:id',
  asyncHandler((req: Request, res: Response): void => {
    const table = updateTable(Number(req.params.id), parseName(req.body));
    if (!table) {
      throw new HttpError(404, 40400, '表不存在');
    }
    res.json({ code: 0, message: 'ok', data: table });
  }),
);

// DELETE /api/tables/:id — 删除表
tablesRouter.delete(
  '/tables/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteTable(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '表不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);

// GET /api/tables/:id/fields — 字段列表
tablesRouter.get(
  '/tables/:id/fields',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!getTable(id)) {
      throw new HttpError(404, 40400, '表不存在');
    }
    res.json({ code: 0, message: 'ok', data: listFields(id) });
  }),
);

// POST /api/tables/:id/fields — 新增字段
tablesRouter.post(
  '/tables/:id/fields',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!getTable(id)) {
      throw new HttpError(404, 40400, '表不存在');
    }
    const name = parseName(req.body);
    const type = req.body?.type;
    if (!isSupportedFieldType(type)) {
      throw new HttpError(400, 40001, '字段类型不受支持');
    }
    const options: string[] | null = Array.isArray(req.body?.options)
      ? (req.body.options as unknown[]).map(String)
      : null;
    const field = createField(id, name, type as FieldType, options);
    res.status(201).json({ code: 0, message: 'ok', data: field });
  }),
);

// GET /api/tables/:id/rows — 网格视图（表 + 字段 + 行 + 单元格）
tablesRouter.get(
  '/tables/:id/rows',
  asyncHandler((req: Request, res: Response): void => {
    const grid = getGrid(Number(req.params.id));
    if (!grid) {
      throw new HttpError(404, 40400, '表不存在');
    }
    res.json({ code: 0, message: 'ok', data: grid });
  }),
);

// POST /api/tables/:id/rows — 新增空行
tablesRouter.post(
  '/tables/:id/rows',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!getTable(id)) {
      throw new HttpError(404, 40400, '表不存在');
    }
    const row = createRow(id);
    res.status(201).json({ code: 0, message: 'ok', data: row });
  }),
);
