import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { register, login, logout, userFromToken } from '../services/authService';
import { HttpError } from '../lib/httpError';

export const authRouter: Router = Router();

authRouter.post(
  '/auth/register',
  asyncHandler((req: Request, res: Response): void => {
    const { email, displayName, password } = req.body ?? {};
    const result = register({ email, displayName, password });
    res.status(201).json({ code: 0, message: 'ok', data: result });
  }),
);

authRouter.post(
  '/auth/login',
  asyncHandler((req: Request, res: Response): void => {
    const { email, password } = req.body ?? {};
    const result = login({ email, password });
    res.json({ code: 0, message: 'ok', data: result });
  }),
);

authRouter.post(
  '/auth/logout',
  requireAuth,
  asyncHandler((req: Request, res: Response): void => {
    const header = req.headers['authorization'] ?? '';
    const token = /^Bearer\s+(.+)$/i.exec(header)?.[1] ?? '';
    logout(token);
    res.json({ code: 0, message: 'ok', data: null });
  }),
);

authRouter.get(
  '/auth/me',
  requireAuth,
  asyncHandler((_req: Request, res: Response): void => {
    const header = _req.headers['authorization'] ?? '';
    const token = /^Bearer\s+(.+)$/i.exec(header)?.[1] ?? '';
    const user = userFromToken(token);
    if (!user) throw new HttpError(401, 40100, '未授权');
    res.json({ code: 0, message: 'ok', data: user });
  }),
);
