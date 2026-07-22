import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { listScenes, getScene, createScene, updateScene, deleteScene } from '../repositories/sceneRepo';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json({ code: 0, message: 'ok', data: listScenes() });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, data } = req.body ?? {};
  if (data === undefined) throw new HttpError(400, 40000, '缺少场景数据');
  const scene = createScene({ name, data: typeof data === 'string' ? data : JSON.stringify(data) });
  res.status(201).json({ code: 0, message: 'ok', data: scene });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const scene = getScene(Number(req.params.id));
  if (!scene) throw new HttpError(404, 40400, '场景不存在');
  res.json({ code: 0, message: 'ok', data: scene });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const scene = updateScene(Number(req.params.id), req.body ?? {});
  if (!scene) throw new HttpError(404, 40400, '场景不存在');
  res.json({ code: 0, message: 'ok', data: scene });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const ok = deleteScene(Number(req.params.id));
  if (!ok) throw new HttpError(404, 40400, '场景不存在');
  res.json({ code: 0, message: 'ok', data: { deleted: true } });
}));

export default router;
