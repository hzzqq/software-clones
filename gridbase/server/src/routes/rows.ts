import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { getRow, deleteRow } from '../repositories/rowRepo';

export const rowsRouter: Router = Router();

// DELETE /api/rows/:id — 删除行
rowsRouter.delete(
  '/rows/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!getRow(id)) {
      throw new HttpError(404, 40400, '行不存在');
    }
    deleteRow(id);
    res.json({ code: 0, message: 'ok', data: { id } });
  }),
);
