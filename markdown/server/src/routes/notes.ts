import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { listNotes, getNote, createNote, updateNote, deleteNote } from '../repositories/noteRepo';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const includeContent = req.query.includeContent === 'true';
  res.json({ code: 0, message: 'ok', data: listNotes({ folder, tag, q, includeContent }) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { title, content, folder, tags } = req.body ?? {};
  if (content === undefined) throw new HttpError(400, 40000, '缺少笔记内容');
  const note = createNote({ title, content, folder, tags });
  res.status(201).json({ code: 0, message: 'ok', data: note });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const note = getNote(Number(req.params.id));
  if (!note) throw new HttpError(404, 40400, '笔记不存在');
  res.json({ code: 0, message: 'ok', data: note });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const note = updateNote(Number(req.params.id), req.body ?? {});
  if (!note) throw new HttpError(404, 40400, '笔记不存在');
  res.json({ code: 0, message: 'ok', data: note });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const ok = deleteNote(Number(req.params.id));
  if (!ok) throw new HttpError(404, 40400, '笔记不存在');
  res.json({ code: 0, message: 'ok', data: { deleted: true } });
}));

export default router;
