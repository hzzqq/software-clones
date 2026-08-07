import { Router, Request, Response } from 'express';
import { getRoom } from '../repositories/roomRepo';
import { addClient, removeClient } from '../lib/hub';

/**
 * SSE 实时消息流路由。
 *
 * 原生 Node http：挂起响应，通过 `res.write` 推送 `data:` 帧；
 * 新消息由 messages 路由经 hub.broadcast 写入。心跳注释每 25s 发一次，
 * 防止代理/浏览器判定连接超时。客户端断开时由 close 事件清理。
 */
export const streamRouter: Router = Router();

const HEARTBEAT_MS = 25000;

streamRouter.get('/:id/stream', (req: Request, res: Response): void => {
  const roomId = Number(req.params.id);
  if (!Number.isInteger(roomId) || roomId <= 0 || !getRoom(roomId)) {
    res.status(404).json({ code: 40400, message: '房间不存在', data: null });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  addClient(roomId, res);
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* 连接可能已断开，close 事件会清理 */
    }
  }, HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(roomId, res);
  });
});
