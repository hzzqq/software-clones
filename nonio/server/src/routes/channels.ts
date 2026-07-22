import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { listChannels, getChannel, createChannel, updateChannel, deleteChannel } from '../repositories/channelRepo';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json({ code: 0, message: 'ok', data: listChannels() });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, description } = req.body ?? {};
  if (!name || !name.trim()) throw new HttpError(400, 40000, '频道名称不能为空');
  const channel = createChannel({ name, description });
  res.status(201).json({ code: 0, message: 'ok', data: channel });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const channel = getChannel(Number(req.params.id));
  if (!channel) throw new HttpError(404, 40400, '频道不存在');
  res.json({ code: 0, message: 'ok', data: channel });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const channel = updateChannel(Number(req.params.id), req.body ?? {});
  if (!channel) throw new HttpError(404, 40400, '频道不存在');
  res.json({ code: 0, message: 'ok', data: channel });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const ok = deleteChannel(Number(req.params.id));
  if (!ok) throw new HttpError(404, 40400, '频道不存在');
  res.json({ code: 0, message: 'ok', data: { deleted: true } });
}));

export default router;
