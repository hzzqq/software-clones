import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { listRequests, getRequest, createRequest, updateRequest, deleteRequest } from '../repositories/requestRepo';
import type { HttpMethod } from '../types';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  res.json({ code: 0, message: 'ok', data: listRequests(folder) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, method, url, headers, params, body, folder } = req.body ?? {};
  if (!url || !url.trim()) throw new HttpError(400, 40000, '缺少请求 URL');
  const m = (METHODS as string[]).includes(method) ? (method as HttpMethod) : 'GET';
  const created = createRequest({ name, method: m, url, headers, params, body, folder });
  res.status(201).json({ code: 0, message: 'ok', data: created });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const r = getRequest(Number(req.params.id));
  if (!r) throw new HttpError(404, 40400, '请求不存在');
  res.json({ code: 0, message: 'ok', data: r });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const updated = updateRequest(Number(req.params.id), req.body ?? {});
  if (!updated) throw new HttpError(404, 40400, '请求不存在');
  res.json({ code: 0, message: 'ok', data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const ok = deleteRequest(Number(req.params.id));
  if (!ok) throw new HttpError(404, 40400, '请求不存在');
  res.json({ code: 0, message: 'ok', data: { deleted: true } });
}));

export default router;
