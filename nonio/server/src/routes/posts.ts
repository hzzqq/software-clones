import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { listPosts, getPost, createPost, updatePost, deletePost, likePost } from '../repositories/postRepo';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const channelId = req.query.channelId ? Number(req.query.channelId) : undefined;
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  res.json({ code: 0, message: 'ok', data: listPosts({ channelId, tag, q }) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { channelId, title, body, authorName, tags } = req.body ?? {};
  if (!channelId) throw new HttpError(400, 40000, '请选择频道');
  if (!title || !title.trim()) throw new HttpError(400, 40000, '标题不能为空');
  const post = createPost({ channelId: Number(channelId), title, body, authorName, tags });
  res.status(201).json({ code: 0, message: 'ok', data: post });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const post = getPost(Number(req.params.id));
  if (!post) throw new HttpError(404, 40400, '帖子不存在');
  res.json({ code: 0, message: 'ok', data: post });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const post = updatePost(Number(req.params.id), req.body ?? {});
  if (!post) throw new HttpError(404, 40400, '帖子不存在');
  res.json({ code: 0, message: 'ok', data: post });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const ok = deletePost(Number(req.params.id));
  if (!ok) throw new HttpError(404, 40400, '帖子不存在');
  res.json({ code: 0, message: 'ok', data: { deleted: true } });
}));

router.post('/:id/like', asyncHandler(async (req, res) => {
  const post = likePost(Number(req.params.id));
  if (!post) throw new HttpError(404, 40400, '帖子不存在');
  res.json({ code: 0, message: 'ok', data: post });
}));

export default router;
