import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { habitRepo, normalizeFrequency, normalizeTargetCount } from '../repositories/habitRepo';
import { isValidDateKey } from '../utils/date';
import type { HabitInput } from '../types';

export const habitsRouter: Router = Router();

habitsRouter.get(
  '/habits',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: habitRepo.list() });
  })
);

habitsRouter.get(
  '/habits/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const habit = habitRepo.getById(id);
    if (!habit) {
      res.status(404).json({ code: 40400, message: '习惯不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: habit });
  })
);

habitsRouter.post(
  '/habits',
  asyncHandler((req: Request, res: Response): void => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    if (!name) {
      res.status(400).json({ code: 40001, message: '字段校验失败：name 必填', data: null });
      return;
    }
    const input: HabitInput = {
      name: name.slice(0, 100),
      icon: typeof b.icon === 'string' && b.icon.trim() ? b.icon.trim().slice(0, 16) : '✅',
      frequencyType: normalizeFrequency(b.frequencyType),
      targetCount: normalizeTargetCount(b.targetCount),
    };
    const created = habitRepo.create(input);
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

habitsRouter.patch(
  '/habits/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Partial<HabitInput> = {};
    if (b.name !== undefined) {
      if (typeof b.name !== 'string' || !b.name.trim()) {
        res.status(400).json({ code: 40001, message: '字段校验失败：name 不能为空', data: null });
        return;
      }
      patch.name = b.name.trim().slice(0, 100);
    }
    if (b.icon !== undefined) {
      patch.icon = typeof b.icon === 'string' && b.icon.trim() ? b.icon.trim().slice(0, 16) : '✅';
    }
    if (b.frequencyType !== undefined) patch.frequencyType = normalizeFrequency(b.frequencyType);
    if (b.targetCount !== undefined) patch.targetCount = normalizeTargetCount(b.targetCount);

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ code: 40001, message: '字段校验失败：没有可更新的字段', data: null });
      return;
    }
    const updated = habitRepo.update(id, patch);
    if (!updated) {
      res.status(404).json({ code: 40400, message: '习惯不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: updated });
  })
);

habitsRouter.delete(
  '/habits/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!habitRepo.getById(id)) {
      res.status(404).json({ code: 40400, message: '习惯不存在', data: null });
      return;
    }
    habitRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);

habitsRouter.post(
  '/habits/:id/checkins',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const date = typeof (req.body ?? {}).date === 'string' ? (req.body as { date: string }).date : '';
    if (!isValidDateKey(date)) {
      res.status(400).json({ code: 40001, message: '字段校验失败：date 需为合法日期（YYYY-MM-DD）', data: null });
      return;
    }
    const habit = habitRepo.getById(id);
    if (!habit) {
      res.status(404).json({ code: 40400, message: '习惯不存在', data: null });
      return;
    }
    const checkin = habitRepo.addCheckin(id, date);
    if (!checkin) {
      res.status(409).json({ code: 40900, message: '当天已打卡，请勿重复打卡', data: null });
      return;
    }
    res.status(201).json({ code: 0, message: 'ok', data: checkin });
  })
);

habitsRouter.delete(
  '/habits/:id/checkins/:date',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const date = String(req.params.date ?? '');
    if (!isValidDateKey(date)) {
      res.status(400).json({ code: 40001, message: '字段校验失败：date 需为合法日期（YYYY-MM-DD）', data: null });
      return;
    }
    const habit = habitRepo.getById(id);
    if (!habit) {
      res.status(404).json({ code: 40400, message: '习惯不存在', data: null });
      return;
    }
    const removed = habitRepo.removeCheckin(id, date);
    res.json({ code: 0, message: removed ? 'ok' : '该日期无打卡记录', data: null });
  })
);
