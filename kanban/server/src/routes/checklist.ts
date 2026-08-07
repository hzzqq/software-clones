import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { cardRepo } from '../repositories/cardRepo';
import { checklistRepo, ChecklistItemPatch } from '../repositories/checklistRepo';

export const checklistRouter: Router = Router();

/** 列出某张卡片的检查清单。 */
checklistRouter.get(
  '/cards/:id/checklist',
  asyncHandler((req: Request, res: Response): void => {
    const cardId: number = Number(req.params.id);
    if (!cardRepo.getById(cardId)) {
      res.status(404).json({ code: 40400, message: '卡片不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: checklistRepo.listByCard(cardId) });
  })
);

/** 新增一条子任务。position 缺省时追加到末尾。 */
checklistRouter.post(
  '/cards/:id/checklist',
  asyncHandler((req: Request, res: Response): void => {
    const cardId: number = Number(req.params.id);
    const { text, position, done } = req.body ?? {};
    if (typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：text 必填', data: null });
      return;
    }
    if (!cardRepo.getById(cardId)) {
      res.status(404).json({ code: 40400, message: '卡片不存在', data: null });
      return;
    }
    const created = checklistRepo.create({
      cardId,
      text: text.trim(),
      position: typeof position === 'number' ? position : undefined,
      done: typeof done === 'number' ? done : 0,
    });
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

/** 局部更新子任务（勾选 / 改名 / 排序）。 */
checklistRouter.patch(
  '/checklist/:itemId',
  asyncHandler((req: Request, res: Response): void => {
    const itemId: number = Number(req.params.itemId);
    const { text, done, position } = req.body ?? {};
    const patch: ChecklistItemPatch = {};
    if (typeof text === 'string') {
      if (!text.trim()) {
        res.status(400).json({ code: 40001, message: '字段校验失败：text 不能为空', data: null });
        return;
      }
      patch.text = text.trim();
    }
    if (typeof done === 'number') patch.done = done === 0 ? 0 : 1;
    if (typeof position === 'number') patch.position = position;
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ code: 40001, message: '字段校验失败：无有效更新字段', data: null });
      return;
    }
    const updated = checklistRepo.update(itemId, patch);
    if (!updated) {
      res.status(404).json({ code: 40400, message: '子任务不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: updated });
  })
);

/** 删除子任务。 */
checklistRouter.delete(
  '/checklist/:itemId',
  asyncHandler((req: Request, res: Response): void => {
    const itemId: number = Number(req.params.itemId);
    if (!checklistRepo.getById(itemId)) {
      res.status(404).json({ code: 40400, message: '子任务不存在', data: null });
      return;
    }
    checklistRepo.remove(itemId);
    res.json({ code: 0, message: 'ok', data: null });
  })
);

export default checklistRouter;
