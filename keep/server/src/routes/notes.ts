import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  listLabels,
  listColors,
} from '../repositories/notesRepo';
import { parseTags, limitTags } from '../lib/tags';
import type { NoteInput, NoteItemInput } from '../types';

export const notesRouter: Router = Router();

const VALID_VIEWS = new Set(['active', 'archived', 'trash']);
const VALID_COLORS = new Set([
  'default',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'brown',
  'gray',
]);

/** 解析便签输入；partial 为 true 时字段可缺省（用于 PATCH）。 */
function parseNoteInput(body: unknown, partial: boolean): NoteInput {
  const raw = (body ?? {}) as Record<string, unknown>;
  const input: NoteInput = {};

  if (raw.title !== undefined) {
    if (typeof raw.title !== 'string') {
      throw new HttpError(400, 40001, 'title 必须是字符串');
    }
    input.title = raw.title;
  } else if (!partial) {
    input.title = '';
  }

  if (raw.body !== undefined) {
    if (typeof raw.body !== 'string') {
      throw new HttpError(400, 40001, 'body 必须是字符串');
    }
    input.body = raw.body;
  } else if (!partial) {
    input.body = '';
  }

  if (raw.color !== undefined) {
    if (typeof raw.color !== 'string' || !VALID_COLORS.has(raw.color)) {
      throw new HttpError(400, 40001, 'color 取值不合法');
    }
    input.color = raw.color;
  } else if (!partial) {
    input.color = 'default';
  }

  if (raw.isPinned !== undefined) {
    if (typeof raw.isPinned !== 'boolean') {
      throw new HttpError(400, 40001, 'isPinned 必须是布尔值');
    }
    input.isPinned = raw.isPinned;
  }
  if (raw.isArchived !== undefined) {
    if (typeof raw.isArchived !== 'boolean') {
      throw new HttpError(400, 40001, 'isArchived 必须是布尔值');
    }
    input.isArchived = raw.isArchived;
  }
  if (raw.isTrash !== undefined) {
    if (typeof raw.isTrash !== 'boolean') {
      throw new HttpError(400, 40001, 'isTrash 必须是布尔值');
    }
    input.isTrash = raw.isTrash;
  }

  if (raw.labels !== undefined) {
    if (!Array.isArray(raw.labels) || raw.labels.some((t) => typeof t !== 'string')) {
      throw new HttpError(400, 40001, 'labels 必须是字符串数组');
    }
    input.labels = limitTags(parseTags(raw.labels as unknown[]));
  } else if (!partial) {
    input.labels = [];
  }

  if (raw.items !== undefined) {
    if (!Array.isArray(raw.items)) {
      throw new HttpError(400, 40001, 'items 必须是数组');
    }
    const items: NoteItemInput[] = [];
    raw.items.forEach((it, idx) => {
      const item = it as Record<string, unknown>;
      if (!item || typeof item.text !== 'string') {
        throw new HttpError(400, 40001, `items[${idx}].text 必须是字符串`);
      }
      items.push({
        id: typeof item.id === 'number' ? item.id : undefined,
        text: item.text,
        done: typeof item.done === 'boolean' ? item.done : false,
        sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : idx,
      });
    });
    input.items = items;
  }

  return input;
}

// GET /api/notes?view=&label=&color=&q=
notesRouter.get(
  '/notes',
  asyncHandler((req: Request, res: Response): void => {
    const q = req.query;
    const viewRaw = typeof q.view === 'string' && q.view ? q.view : 'active';
    if (!VALID_VIEWS.has(viewRaw)) {
      throw new HttpError(400, 40001, 'view 取值不合法');
    }
    const label = typeof q.label === 'string' && q.label ? q.label.toLowerCase() : undefined;
    const color = typeof q.color === 'string' && q.color ? q.color : undefined;
    const search = typeof q.q === 'string' ? q.q.trim() : '';
    const data = listNotes({
      view: viewRaw as 'active' | 'archived' | 'trash',
      label,
      color,
      q: search || undefined,
    });
    res.json({ code: 0, message: 'ok', data });
  }),
);

// GET /api/notes/:id
notesRouter.get(
  '/notes/:id',
  asyncHandler((req: Request, res: Response): void => {
    const note = getNote(Number(req.params.id));
    if (!note) {
      throw new HttpError(404, 40400, '便签不存在');
    }
    res.json({ code: 0, message: 'ok', data: note });
  }),
);

// POST /api/notes
notesRouter.post(
  '/notes',
  asyncHandler((req: Request, res: Response): void => {
    const input = parseNoteInput(req.body, false);
    const note = createNote(input);
    res.status(201).json({ code: 0, message: 'ok', data: note });
  }),
);

// PATCH /api/notes/:id
notesRouter.patch(
  '/notes/:id',
  asyncHandler((req: Request, res: Response): void => {
    const input = parseNoteInput(req.body, true);
    const note = updateNote(Number(req.params.id), input);
    if (!note) {
      throw new HttpError(404, 40400, '便签不存在');
    }
    res.json({ code: 0, message: 'ok', data: note });
  }),
);

// DELETE /api/notes/:id
notesRouter.delete(
  '/notes/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteNote(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '便签不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);

// GET /api/labels — 全部标签（含使用次数）
notesRouter.get(
  '/labels',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listLabels() });
  }),
);

// GET /api/colors — 已使用的颜色列表
notesRouter.get(
  '/colors',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listColors() });
  }),
);
