import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { listComments, createComment, deleteComment, likeComment } from '../repositories/commentRepo';

const router = Router();

router.get('/post/:postId', asyncHandler(async (req, res) => {
  res.json({ code: 0, message: 'ok', data: listComments(Number(req.params.postId)) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { postId, parentId, authorName, body } = req.body ?? {};
  if (!postId) throw new HttpError(400, 40000, '缺少 postId');
  if (!body || !body.trim()) throw new HttpError(400, 40000, '评论内容不能为空');
  const comment = createComment({ postId: Number(postId), parentId: parentId ?? null, authorName, body });
  res.status(201).json({ code: 0, message: 'ok', data: comment });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { like } = req.body ?? {};
  if (like) {
    const comment = likeComment(Number(req.params.id));
    if (!comment) throw new HttpError(404, 40400, '评论不存在');
    res.json({ code: 0, message: 'ok', data: comment });
    return;
  }
  throw new HttpError(400, 40000, '不支持的操作');
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const ok = deleteComment(Number(req.params.id));
  if (!ok) throw new HttpError(404, 40400, '评论不存在');
  res.json({ code: 0, message: 'ok', data: { deleted: true } });
}));

export default router;
