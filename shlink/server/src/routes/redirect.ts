import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { getLinkByCode, incrementClicks } from '../repositories/linkRepo';

/**
 * 短链跳转（非 /api 前缀）：GET /r/:code → 302 到原始长链，并原子计数。
 * 放在根路径（不经 /api），方便用户直接粘贴短链访问。
 */
export const redirectRouter: Router = Router();

redirectRouter.get(
  '/r/:code',
  asyncHandler((req: Request, res: Response): void => {
    const code = (req.params.code ?? '').trim();
    const link = getLinkByCode(code);
    if (!link) {
      throw new HttpError(404, 40400, '短链接不存在或已被删除');
    }
    incrementClicks(link.id);
    res.redirect(302, link.url);
  }),
);
