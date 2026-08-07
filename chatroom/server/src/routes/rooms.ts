import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { createRoom, listRooms } from '../repositories/roomRepo';

/** 房间路由：列表 + 创建。 */
export const roomsRouter: Router = Router();

roomsRouter.get(
  '/rooms',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listRooms() });
  })
);

roomsRouter.post(
  '/rooms',
  asyncHandler((req: Request, res: Response): void => {
    const name: unknown = (req.body as { name?: unknown } | undefined)?.name;
    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ code: 40001, message: '房间名称不能为空', data: null });
      return;
    }
    const clean = name.trim().slice(0, 50);
    const room = createRoom(clean);
    res.status(201).json({ code: 0, message: 'ok', data: room });
  })
);
