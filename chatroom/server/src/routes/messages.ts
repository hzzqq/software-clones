import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { MAX_MESSAGES_PER_ROOM } from '../config';
import { getRoom } from '../repositories/roomRepo';
import { createMessage, listMessages, trimRoomMessages } from '../repositories/messageRepo';
import { broadcast } from '../lib/hub';

/**
 * 房间消息路由：历史 + 发送（发送成功后经 SSE hub 广播）。
 */
export const messagesRouter: Router = Router();

messagesRouter.get(
  '/:id/messages',
  asyncHandler((req: Request, res: Response): void => {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0 || !getRoom(roomId)) {
      res.status(404).json({ code: 40400, message: '房间不存在', data: null });
      return;
    }
    const limitRaw = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 50;
    res.json({ code: 0, message: 'ok', data: listMessages(roomId, limit) });
  })
);

messagesRouter.post(
  '/:id/messages',
  asyncHandler((req: Request, res: Response): void => {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0 || !getRoom(roomId)) {
      res.status(404).json({ code: 40400, message: '房间不存在', data: null });
      return;
    }
    const body = (req.body ?? {}) as { nickname?: unknown; content?: unknown };
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!nickname || nickname.length > 24) {
      res.status(400).json({ code: 40001, message: '昵称不能为空且不超过 24 个字符', data: null });
      return;
    }
    if (!content || content.length > 2000) {
      res.status(400).json({ code: 40001, message: '消息内容不能为空且不超过 2000 个字符', data: null });
      return;
    }

    const message = createMessage(roomId, nickname, content);
    // 裁剪历史：每个房间最多保留最近 N 条（可配置）。
    trimRoomMessages(roomId, MAX_MESSAGES_PER_ROOM);
    // SSE 广播给房间内在线客户端。
    broadcast(roomId, { type: 'message', message });

    res.status(201).json({ code: 0, message: 'ok', data: message });
  })
);
