import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { listRepo } from '../repositories/listRepo';
import { cardRepo } from '../repositories/cardRepo';
import { activityRepo } from '../repositories/activityRepo';
import type { Card, List } from '../repositories/boardRepo';

export const listsRouter: Router = Router();

/** 支持的列批量操作。 */
const BATCH_ACTIONS = [
  'clear-completed',
  'complete-all',
  'reopen-all',
  'move-all',
  'move-completed',
] as const;

type BatchAction = (typeof BATCH_ACTIONS)[number];

function isBatchAction(value: unknown): value is BatchAction {
  return typeof value === 'string' && (BATCH_ACTIONS as readonly string[]).includes(value);
}

listsRouter.post(
  '/lists',
  asyncHandler((req: Request, res: Response): void => {
    const { boardId, title, position, wipLimit } = req.body ?? {};
    if (typeof boardId !== 'number' || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：boardId(number) 与 title 必填', data: null });
      return;
    }
    const created = listRepo.create({
      boardId,
      title: title.trim(),
      position: typeof position === 'number' ? position : 0,
      wipLimit: typeof wipLimit === 'number' && wipLimit > 0 ? Math.floor(wipLimit) : 0,
    });
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

listsRouter.patch(
  '/lists/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const { title, position, wipLimit } = req.body ?? {};
    const patch: { title?: string; position?: number; wipLimit?: number } = {};
    if (typeof title === 'string') patch.title = title.trim();
    if (typeof position === 'number') patch.position = position;
    // wipLimit：0 表示不限制，负数按 0 处理。
    if (typeof wipLimit === 'number') patch.wipLimit = wipLimit > 0 ? Math.floor(wipLimit) : 0;
    if (Object.keys(patch).length === 0) {
      res
        .status(400)
        .json({ code: 40001, message: '字段校验失败：至少提供 title、position 或 wipLimit', data: null });
      return;
    }
    const updated = listRepo.update(id, patch);
    if (!updated) {
      res.status(404).json({ code: 40400, message: '列表不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: updated });
  })
);

listsRouter.delete(
  '/lists/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!listRepo.getById(id)) {
      res.status(404).json({ code: 40400, message: '列表不存在', data: null });
      return;
    }
    listRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);

/**
 * 列的批量操作。统一入口而非五个端点：这些操作共享「取列 → 选卡 → 事务执行 → 记活动」
 * 的骨架，拆开会产生五份近乎相同的校验代码。
 *
 * body: { action: BatchAction, targetListId?: number }
 * 返回 { action, affected, cardIds }，affected 为实际影响的卡片数（可能为 0）。
 */
listsRouter.post(
  '/lists/:id/batch',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const { action, targetListId } = req.body ?? {};
    if (!isBatchAction(action)) {
      res.status(400).json({
        code: 40001,
        message: `字段校验失败：action 必须是 ${BATCH_ACTIONS.join(' / ')} 之一`,
        data: null,
      });
      return;
    }
    const list = listRepo.getById(id);
    if (!list) {
      res.status(404).json({ code: 40400, message: '列表不存在', data: null });
      return;
    }

    const needsTarget: boolean = action === 'move-all' || action === 'move-completed';
    let target: List | undefined = undefined;
    if (needsTarget) {
      if (typeof targetListId !== 'number') {
        res
          .status(400)
          .json({ code: 40001, message: '字段校验失败：targetListId(number) 必填', data: null });
        return;
      }
      if (targetListId === id) {
        res
          .status(400)
          .json({ code: 40001, message: '字段校验失败：目标列不能与源列相同', data: null });
        return;
      }
      target = listRepo.getById(targetListId);
      if (!target) {
        res.status(404).json({ code: 40400, message: '目标列表不存在', data: null });
        return;
      }
    }

    const cards: Card[] = cardRepo.listByList(id);
    const completed: Card[] = cards.filter((c) => c.completed === 1);
    const incomplete: Card[] = cards.filter((c) => c.completed !== 1);

    let picked: Card[] = [];
    let affected = 0;

    switch (action) {
      case 'clear-completed': {
        picked = completed;
        affected = cardRepo.bulkRemove(picked.map((c) => c.id));
        break;
      }
      case 'complete-all': {
        picked = incomplete;
        affected = cardRepo.bulkSetCompleted(picked.map((c) => c.id), 1);
        for (const c of picked) {
          activityRepo.log(c.id, 'batch', `批量操作：在「${list.title}」中标记为已完成`);
        }
        break;
      }
      case 'reopen-all': {
        picked = completed;
        affected = cardRepo.bulkSetCompleted(picked.map((c) => c.id), 0);
        for (const c of picked) {
          activityRepo.log(c.id, 'batch', `批量操作：在「${list.title}」中重新打开`);
        }
        break;
      }
      case 'move-all':
      case 'move-completed': {
        picked = action === 'move-all' ? cards : completed;
        const start: number = cardRepo.countByList(target!.id);
        affected = cardRepo.bulkMove(picked.map((c) => c.id), target!.id, start);
        for (const c of picked) {
          activityRepo.log(
            c.id,
            'batch',
            `批量操作：从「${list.title}」移动到「${target!.title}」`
          );
        }
        break;
      }
    }

    res.json({
      code: 0,
      message: 'ok',
      data: { action, affected, cardIds: picked.map((c) => c.id) },
    });
  })
);
