import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  setArchived,
  setPinned,
} from '../repositories/noteRepo';
import { parseTags } from '../services/noteService';
import { Visibility } from '../types';
import { requireAuth } from '../middleware/auth';

const VALID_VISIBILITY: Visibility[] = ['public', 'protected', 'private'];

function parseVisibility(raw: unknown): Visibility {
  if (typeof raw === 'string' && (VALID_VISIBILITY as string[]).includes(raw)) {
    return raw as Visibility;
  }
  throw new HttpError(400, 40000, `invalid visibility (expected public|protected|private)`);
}

export const notesRouter: Router = Router();

// 整组路由需登录
notesRouter.use(requireAuth);

// List notes (active by default; pass archived=true to see the archive).
notesRouter.get(
  '/notes',
  asyncHandler((req: Request, res: Response): void => {
    const q = req.query;
    const filter = {
      userId: req.user!.id,
      visibility: q.visibility ? parseVisibility(q.visibility) : undefined,
      tag: typeof q.tag === 'string' ? q.tag : undefined,
      archived: q.archived === undefined ? false : q.archived === 'true',
      pinned: q.pinned === undefined ? undefined : q.pinned === 'true',
      q: typeof q.q === 'string' ? q.q : undefined,
    };
    res.json({ code: 0, message: 'ok', data: listNotes(filter) });
  }),
);

notesRouter.post(
  '/notes',
  asyncHandler((req: Request, res: Response): void => {
    const { content, visibility } = req.body ?? {};
    if (typeof content !== 'string' || !content.trim()) {
      throw new HttpError(400, 40000, 'content is required');
    }
    const vis = visibility === undefined ? 'private' : parseVisibility(visibility);
    const note = createNote(
      { content: content.trim(), visibility: vis, tags: parseTags(content) },
      req.user!.id,
    );
    res.status(201).json({ code: 0, message: 'ok', data: note });
  }),
);

notesRouter.get(
  '/notes/:id',
  asyncHandler((req: Request, res: Response): void => {
    const note = getNote(Number(req.params.id), req.user!.id);
    if (!note) throw new HttpError(404, 40400, 'note not found');
    res.json({ code: 0, message: 'ok', data: note });
  }),
);

notesRouter.patch(
  '/notes/:id',
  asyncHandler((req: Request, res: Response): void => {
    const { content, visibility } = req.body ?? {};
    const patch: { content?: string; visibility?: Visibility; tags?: string[] } = {};
    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        throw new HttpError(400, 40000, 'content must be a non-empty string');
      }
      patch.content = content.trim();
      patch.tags = parseTags(content);
    }
    if (visibility !== undefined) patch.visibility = parseVisibility(visibility);
    const note = updateNote(Number(req.params.id), patch, req.user!.id);
    if (!note) throw new HttpError(404, 40400, 'note not found');
    res.json({ code: 0, message: 'ok', data: note });
  }),
);

notesRouter.delete(
  '/notes/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteNote(Number(req.params.id), req.user!.id);
    if (!ok) throw new HttpError(404, 40400, 'note not found');
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);

notesRouter.post(
  '/notes/:id/archive',
  asyncHandler((req: Request, res: Response): void => {
    const note = setArchived(Number(req.params.id), true, req.user!.id);
    if (!note) throw new HttpError(404, 40400, 'note not found');
    res.json({ code: 0, message: 'ok', data: note });
  }),
);

notesRouter.delete(
  '/notes/:id/archive',
  asyncHandler((req: Request, res: Response): void => {
    const note = setArchived(Number(req.params.id), false, req.user!.id);
    if (!note) throw new HttpError(404, 40400, 'note not found');
    res.json({ code: 0, message: 'ok', data: note });
  }),
);

notesRouter.post(
  '/notes/:id/pin',
  asyncHandler((req: Request, res: Response): void => {
    const note = setPinned(Number(req.params.id), true, req.user!.id);
    if (!note) throw new HttpError(404, 40400, 'note not found');
    res.json({ code: 0, message: 'ok', data: note });
  }),
);

notesRouter.delete(
  '/notes/:id/pin',
  asyncHandler((req: Request, res: Response): void => {
    const note = setPinned(Number(req.params.id), false, req.user!.id);
    if (!note) throw new HttpError(404, 40400, 'note not found');
    res.json({ code: 0, message: 'ok', data: note });
  }),
);
