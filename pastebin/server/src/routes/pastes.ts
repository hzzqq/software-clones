import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { createPaste, getPasteByCode, deletePaste, listPublicPastes } from '../repositories/pastesRepo';
import type { PasteInput } from '../types';

export const pastesRouter: Router = Router();

// POST /api/pastes — 创建粘贴，返回短码
pastesRouter.post(
  '/pastes',
  asyncHandler((req: Request, res: Response): void => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    if (typeof raw.content !== 'string' || !raw.content) {
      throw new HttpError(400, 40001, 'content 必须是非空字符串');
    }
    const input: PasteInput = {
      content: raw.content,
      title: typeof raw.title === 'string' ? raw.title : undefined,
      language: typeof raw.language === 'string' ? raw.language : undefined,
      visibility: typeof raw.visibility === 'string' ? raw.visibility : undefined,
      expiresInMinutes:
        typeof raw.expiresInMinutes === 'number' ? raw.expiresInMinutes : undefined,
    };
    const paste = createPaste(input);
    res.status(201).json({
      code: 0,
      message: 'ok',
      data: { ...paste, url: `/${paste.code}` },
    });
  }),
);

// GET /api/pastes — 公开粘贴列表
pastesRouter.get(
  '/pastes',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listPublicPastes() });
  }),
);

// GET /api/pastes/:code — 查看（过期 404）
pastesRouter.get(
  '/pastes/:code',
  asyncHandler((req: Request, res: Response): void => {
    const paste = getPasteByCode(req.params.code);
    if (!paste) {
      throw new HttpError(404, 40400, '粘贴不存在或已过期');
    }
    res.json({ code: 0, message: 'ok', data: paste });
  }),
);

// DELETE /api/pastes/:code — 删除
pastesRouter.delete(
  '/pastes/:code',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deletePaste(req.params.code);
    if (!ok) {
      throw new HttpError(404, 40400, '粘贴不存在');
    }
    res.json({ code: 0, message: 'ok', data: { code: req.params.code } });
  }),
);
