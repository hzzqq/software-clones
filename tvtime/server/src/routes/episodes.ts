import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { toggleWatched, setWatched } from '../repositories/episodeRepo';

const router = Router();

router.patch('/:id/toggle', asyncHandler(async (req, res) => {
  const ep = toggleWatched(Number(req.params.id));
  if (!ep) throw new HttpError(404, 40400, '剧集不存在');
  res.json({ code: 0, message: 'ok', data: ep });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { watched } = req.body ?? {};
  const ep = setWatched(Number(req.params.id), !!watched);
  if (!ep) throw new HttpError(404, 40400, '剧集不存在');
  res.json({ code: 0, message: 'ok', data: ep });
}));

export default router;
