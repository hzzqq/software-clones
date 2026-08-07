import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { activityRepo } from '../repositories/activityRepo';
import { cardRepo } from '../repositories/cardRepo';

export const activityRouter: Router = Router();

/** 评论正文上限，避免单条评论撑爆时间线与响应体。 */
const MAX_COMMENT_LENGTH = 2000;

activityRouter.get(
  '/cards/:id/activity',
  asyncHandler((req: Request, res: Response): void => {
    const cardId: number = Number(req.params.id);
    if (!cardRepo.getById(cardId)) {
      res.status(404).json({ code: 40400, message: '卡片不存在', data: null });
      return;
    }
    const rawLimit: number = Number(req.query.limit);
    const limit: number = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 200;
    res.json({ code: 0, message: 'ok', data: activityRepo.listByCard(cardId, limit) });
  })
);

activityRouter.post(
  '/cards/:id/comments',
  asyncHandler((req: Request, res: Response): void => {
    const cardId: number = Number(req.params.id);
    const { text, author } = req.body ?? {};
    if (typeof text !== 'string' || !text.trim()) {
      res
        .status(400)
        .json({ code: 40001, message: '字段校验失败：text 必填且不能为空', data: null });
      return;
    }
    const body: string = text.trim();
    if (body.length > MAX_COMMENT_LENGTH) {
      res.status(400).json({
        code: 40001,
        message: `字段校验失败：评论长度不能超过 ${MAX_COMMENT_LENGTH} 字`,
        data: null,
      });
      return;
    }
    if (!cardRepo.getById(cardId)) {
      res.status(404).json({ code: 40400, message: '卡片不存在', data: null });
      return;
    }
    const created = activityRepo.create({
      cardId,
      kind: 'comment',
      detail: body,
      author: typeof author === 'string' ? author.trim() : '',
    });
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

activityRouter.delete(
  '/activity/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const existing = activityRepo.getById(id);
    if (!existing) {
      res.status(404).json({ code: 40400, message: '活动记录不存在', data: null });
      return;
    }
    // 系统事件是审计线索，不允许删除；只有用户自己写的评论可以撤回。
    if (existing.kind !== 'comment') {
      res
        .status(400)
        .json({ code: 40001, message: '仅评论可以删除，系统活动记录不可删除', data: null });
      return;
    }
    activityRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);
