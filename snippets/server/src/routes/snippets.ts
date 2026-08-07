import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
} from '../repositories/snippetRepo';
import { isSupportedLanguage } from '../languages';
import { parseTags, limitTags } from '../lib/tags';
import type { SnippetInput } from '../types';

export const snippetsRouter: Router = Router();

/** 解析片段输入；partial 为 true 时字段可缺省（用于 PATCH）。 */
function parseSnippetInput(body: unknown, partial: boolean): Partial<SnippetInput> {
  const raw = (body ?? {}) as Record<string, unknown>;
  const input: Partial<SnippetInput> = {};

  if (raw.title !== undefined) {
    if (typeof raw.title !== 'string' || !raw.title.trim()) {
      throw new HttpError(400, 40001, 'title 不能为空');
    }
    input.title = raw.title.trim();
  } else if (!partial) {
    throw new HttpError(400, 40001, 'title 是必填项');
  }

  if (raw.language !== undefined) {
    if (typeof raw.language !== 'string' || !isSupportedLanguage(raw.language)) {
      throw new HttpError(400, 40001, 'language 不受支持');
    }
    input.language = raw.language;
  } else if (!partial) {
    input.language = 'text';
  }

  if (raw.code !== undefined) {
    if (typeof raw.code !== 'string') {
      throw new HttpError(400, 40001, 'code 必须是字符串');
    }
    input.code = raw.code;
  } else if (!partial) {
    throw new HttpError(400, 40001, 'code 是必填项');
  }

  if (raw.tags !== undefined) {
    input.tags = limitTags(parseTags(raw.tags));
  } else if (!partial) {
    input.tags = [];
  }

  return input;
}

// GET /api/snippets?language=&tag=&q=
snippetsRouter.get(
  '/snippets',
  asyncHandler((req: Request, res: Response): void => {
    const q = req.query;
    const language = typeof q.language === 'string' && q.language ? q.language : undefined;
    if (language && !isSupportedLanguage(language)) {
      throw new HttpError(400, 40001, 'language 不受支持');
    }
    const tag = typeof q.tag === 'string' && q.tag ? q.tag.toLowerCase() : undefined;
    const search = typeof q.q === 'string' ? q.q.trim() : '';
    res.json({
      code: 0,
      message: 'ok',
      data: listSnippets({ language, tag, q: search || undefined }),
    });
  }),
);

// POST /api/snippets
snippetsRouter.post(
  '/snippets',
  asyncHandler((req: Request, res: Response): void => {
    const input = parseSnippetInput(req.body, false) as SnippetInput;
    const snippet = createSnippet(input);
    res.status(201).json({ code: 0, message: 'ok', data: snippet });
  }),
);

// GET /api/snippets/:id
snippetsRouter.get(
  '/snippets/:id',
  asyncHandler((req: Request, res: Response): void => {
    const snippet = getSnippet(Number(req.params.id));
    if (!snippet) {
      throw new HttpError(404, 40400, '片段不存在');
    }
    res.json({ code: 0, message: 'ok', data: snippet });
  }),
);

// PATCH /api/snippets/:id
snippetsRouter.patch(
  '/snippets/:id',
  asyncHandler((req: Request, res: Response): void => {
    const input = parseSnippetInput(req.body, true);
    const snippet = updateSnippet(Number(req.params.id), input);
    if (!snippet) {
      throw new HttpError(404, 40400, '片段不存在');
    }
    res.json({ code: 0, message: 'ok', data: snippet });
  }),
);

// DELETE /api/snippets/:id
snippetsRouter.delete(
  '/snippets/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteSnippet(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '片段不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);
