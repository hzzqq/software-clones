import type { Response } from 'express';

/**
 * SSE 广播中枢（内存版，单进程适用）。
 *
 * 每个房间维护一组挂起的 HTTP Response；新消息写入后立即广播给该房间
 * 所有在线客户端。客户端断开（close 事件）时自动移除。
 */
const clients = new Map<number, Set<Response>>();

/** 注册一个 SSE 客户端到指定房间。 */
export function addClient(roomId: number, res: Response): void {
  let set = clients.get(roomId);
  if (!set) {
    set = new Set<Response>();
    clients.set(roomId, set);
  }
  set.add(res);
}

/** 移除一个 SSE 客户端。 */
export function removeClient(roomId: number, res: Response): void {
  const set = clients.get(roomId);
  if (!set) {
    return;
  }
  set.delete(res);
  if (set.size === 0) {
    clients.delete(roomId);
  }
}

/**
 * 向房间所有在线客户端广播一个 SSE 事件。
 *
 * @returns 实际送达的客户端数量（写失败/已断开的会被剔除）
 */
export function broadcast(roomId: number, payload: unknown): number {
  const set = clients.get(roomId);
  if (!set || set.size === 0) {
    return 0;
  }
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  let delivered = 0;
  for (const res of Array.from(set)) {
    try {
      res.write(data);
      delivered += 1;
    } catch {
      // 写失败：视为断开，移除后继续。
      set.delete(res);
    }
  }
  if (set.size === 0) {
    clients.delete(roomId);
  }
  return delivered;
}

/** 某房间当前在线 SSE 客户端数（测试/观测用）。 */
export function clientCount(roomId: number): number {
  return clients.get(roomId)?.size ?? 0;
}

/** 清空全部客户端（测试用）。 */
export function clearClients(): void {
  clients.clear();
}
