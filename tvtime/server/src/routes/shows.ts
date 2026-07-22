import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { listShows, getShow, createShow, updateShow, deleteShow } from '../repositories/showRepo';
import { listEpisodes } from '../repositories/episodeRepo';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json({ code: 0, message: 'ok', data: listShows() });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { title, totalEpisodes, note } = req.body ?? {};
  if (!title || !title.trim()) throw new HttpError(400, 40000, '剧集名称不能为空');
  const show = createShow({ title, totalEpisodes: Number(totalEpisodes) || 1, note });
  res.status(201).json({ code: 0, message: 'ok', data: show });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const show = getShow(Number(req.params.id));
  if (!show) throw new HttpError(404, 40400, '剧集不存在');
  res.json({ code: 0, message: 'ok', data: show });
}));

router.get('/:id/episodes', asyncHandler(async (req, res) => {
  res.json({ code: 0, message: 'ok', data: listEpisodes(Number(req.params.id)) });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const show = updateShow(Number(req.params.id), req.body ?? {});
  if (!show) throw new HttpError(404, 40400, '剧集不存在');
  res.json({ code: 0, message: 'ok', data: show });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const ok = deleteShow(Number(req.params.id));
  if (!ok) throw new HttpError(404, 40400, '剧集不存在');
  res.json({ code: 0, message: 'ok', data: { deleted: true } });
}));

export default router;
