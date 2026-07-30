import { Request, Response, NextFunction } from 'express';
import { getSession } from '../repositories/sessionRepo';
import { getUserById } from '../repositories/userRepo';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * 鉴权中间件：解析 `Authorization: Bearer <token>`，校验会话后将用户写入
 * `req.user`。缺失或失效返回 401（标准信封）。
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'] ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    res.status(401).json({ code: 401, message: '未授权，请先登录' });
    return;
  }
  const userId = getSession(match[1]);
  if (userId === null) {
    res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
    return;
  }
  const u = getUserById(userId);
  if (!u) {
    res.status(401).json({ code: 401, message: '未授权，请先登录' });
    return;
  }
  req.user = { id: u.id, email: u.email, displayName: u.displayName };
  next();
}
