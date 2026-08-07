import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { cardRepo, CardPatch } from '../repositories/cardRepo';
import { listRepo } from '../repositories/listRepo';
import { tagRepo } from '../repositories/tagRepo';
import { activityRepo } from '../repositories/activityRepo';
import type { Card } from '../repositories/boardRepo';

export const cardsRouter: Router = Router();

/** 取列表标题用于活动详情；列表已删除时回退为 `#id`，避免时间线出现空引用。 */
function listTitle(listId: number): string {
  return listRepo.getById(listId)?.title ?? `#${listId}`;
}

/** 截止日的人类可读形式；null / 空串统一展示为「无」。 */
function dueText(due: string | null): string {
  return due === null || due === '' ? '无' : due.slice(0, 10);
}

/**
 * 对比补丁前后的卡片，为每个有意义的变化写一条活动记录。
 *
 * 刻意**不记录** position 变化：拖拽重排会对整列卡片批量 PATCH position，
 * 若一并记录会瞬间淹没时间线，让真正重要的「移动了列 / 改了截止日」不可见。
 */
function logCardChanges(before: Card, after: Card): void {
  if (before.listId !== after.listId) {
    activityRepo.log(
      after.id,
      'moved',
      `从「${listTitle(before.listId)}」移动到「${listTitle(after.listId)}」`
    );
  }
  if (before.title !== after.title) {
    activityRepo.log(after.id, 'renamed', `标题由「${before.title}」改为「${after.title}」`);
  }
  if (before.dueDate !== after.dueDate) {
    activityRepo.log(
      after.id,
      'due',
      `截止日由 ${dueText(before.dueDate)} 改为 ${dueText(after.dueDate)}`
    );
  }
  if (before.priority !== after.priority) {
    activityRepo.log(after.id, 'priority', `优先级由 P${before.priority} 改为 P${after.priority}`);
  }
  if (before.assignee !== after.assignee) {
    const from: string = before.assignee || '未指派';
    const to: string = after.assignee || '未指派';
    activityRepo.log(after.id, 'assignee', `指派人由 ${from} 改为 ${to}`);
  }
  if (before.completed !== after.completed) {
    activityRepo.log(after.id, 'completed', after.completed === 1 ? '标记为已完成' : '重新打开');
  }
}

cardsRouter.get(
  '/lists/:id/cards',
  asyncHandler((req: Request, res: Response): void => {
    const listId: number = Number(req.params.id);
    res.json({ code: 0, message: 'ok', data: cardRepo.listByList(listId) });
  })
);

cardsRouter.post(
  '/cards',
  asyncHandler((req: Request, res: Response): void => {
    const { listId, title, position, description, dueDate, priority, completed, assignee } =
      req.body ?? {};
    if (typeof listId !== 'number' || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：listId(number) 与 title 必填', data: null });
      return;
    }
    const created = cardRepo.create({
      listId,
      title: title.trim(),
      position: typeof position === 'number' ? position : 0,
      description: typeof description === 'string' ? description : '',
      dueDate: dueDate === null || typeof dueDate === 'string' ? dueDate ?? null : null,
      priority: typeof priority === 'number' ? priority : 0,
      completed: typeof completed === 'number' ? completed : 0,
      assignee: typeof assignee === 'string' ? assignee.trim() : '',
    });
    activityRepo.log(created.id, 'created', `在「${listTitle(created.listId)}」中创建`);
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

cardsRouter.get(
  '/cards/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const card = cardRepo.getById(id);
    if (!card) {
      res.status(404).json({ code: 40400, message: '卡片不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: card });
  })
);

cardsRouter.patch(
  '/cards/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const { title, description, dueDate, priority, completed, position, listId, assignee } =
      req.body ?? {};
    const patch: CardPatch = {};
    if (typeof title === 'string') {
      if (!title.trim()) {
        res.status(400).json({ code: 40001, message: '字段校验失败：title 不能为空', data: null });
        return;
      }
      patch.title = title.trim();
    }
    if (typeof description === 'string') patch.description = description;
    if (dueDate === null || typeof dueDate === 'string') patch.dueDate = dueDate;
    if (typeof priority === 'number') patch.priority = priority;
    if (typeof completed === 'number') patch.completed = completed;
    if (typeof assignee === 'string') patch.assignee = assignee.trim();
    if (typeof position === 'number') patch.position = position;
    if (typeof listId === 'number') patch.listId = listId;
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ code: 40001, message: '字段校验失败：无有效更新字段', data: null });
      return;
    }
    const before = cardRepo.getById(id);
    if (!before) {
      res.status(404).json({ code: 40400, message: '卡片不存在', data: null });
      return;
    }
    const updated = cardRepo.update(id, patch);
    if (!updated) {
      res.status(404).json({ code: 40400, message: '卡片不存在', data: null });
      return;
    }
    logCardChanges(before, updated);
    res.json({ code: 0, message: 'ok', data: updated });
  })
);

cardsRouter.delete(
  '/cards/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!cardRepo.getById(id)) {
      res.status(404).json({ code: 40400, message: '卡片不存在', data: null });
      return;
    }
    cardRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);

cardsRouter.post(
  '/cards/:id/tags',
  asyncHandler((req: Request, res: Response): void => {
    const cardId: number = Number(req.params.id);
    const { tagId } = req.body ?? {};
    if (typeof tagId !== 'number' || !cardRepo.getById(cardId)) {
      res.status(400).json({ code: 40001, message: '字段校验失败：cardId/tagId 非法', data: null });
      return;
    }
    tagRepo.addCardTag(cardId, tagId);
    res.status(201).json({ code: 0, message: 'ok', data: null });
  })
);

cardsRouter.delete(
  '/cards/:id/tags/:tagId',
  asyncHandler((req: Request, res: Response): void => {
    const cardId: number = Number(req.params.id);
    const tagId: number = Number(req.params.tagId);
    tagRepo.removeCardTag(cardId, tagId);
    res.json({ code: 0, message: 'ok', data: null });
  })
);
