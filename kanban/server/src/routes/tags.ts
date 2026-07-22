import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { tagRepo } from '../repositories/tagRepo';

export const tagsRouter: Router = Router();

tagsRouter.post(
  '/tags',
  asyncHandler((req: Request, res: Response): void => {
    const { boardId, name, color } = req.body ?? {};
    if (typeof boardId !== 'number' || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：boardId(number) 与 name 必填', data: null });
      return;
    }
    const created = tagRepo.create({
      boardId,
      name: name.trim(),
      color: typeof color === 'string' ? color : '#3b82f6',
    });
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

tagsRouter.delete(
  '/tags/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!tagRepo.getById(id)) {
      res.status(404).json({ code: 40400, message: '标签不存在', data: null });
      return;
    }
    tagRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);

tagsRouter.put(
  '/tags/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const existing = tagRepo.getById(id);
    if (!existing) {
      res.status(404).json({ code: 40400, message: '标签不存在', data: null });
      return;
    }
    const { name, color } = req.body ?? {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      res.status(400).json({ code: 40001, message: 'name 必须是非空字符串', data: null });
      return;
    }
    const updated = tagRepo.update(id, {
      name: name !== undefined ? name.trim() : existing.name,
      color: typeof color === 'string' && color.trim() ? color.trim() : existing.color,
    });
    res.json({ code: 0, message: 'ok', data: updated });
  })
);
