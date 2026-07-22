import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import * as repo from '../repositories/designRepo';

/**
 * 设计 CRUD 路由。data 为合成后的 PNG（base64 dataURL），
 * 用于持久化与二次加载（加载时作为单层位图还原）。
 */
export const designsRouter: Router = Router();

designsRouter.get(
  '/designs',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: repo.listDesigns() });
  })
);

designsRouter.get(
  '/designs/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const design = repo.getDesign(id);
    if (!design) throw new HttpError(404, 40400, '设计不存在');
    res.json({ code: 0, message: 'ok', data: design });
  })
);

designsRouter.post(
  '/designs',
  asyncHandler((req: Request, res: Response): void => {
    const { name, thumbnail, data } = req.body ?? {};
    if (!data) throw new HttpError(400, 40000, 'data 不能为空');
    const design = repo.createDesign({ name, thumbnail, data });
    res.status(201).json({ code: 0, message: 'ok', data: design });
  })
);

designsRouter.patch(
  '/designs/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const { name, thumbnail, data } = req.body ?? {};
    const design = repo.updateDesign(id, { name, thumbnail, data });
    if (!design) throw new HttpError(404, 40400, '设计不存在');
    res.json({ code: 0, message: 'ok', data: design });
  })
);

designsRouter.delete(
  '/designs/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const ok = repo.deleteDesign(id);
    if (!ok) throw new HttpError(404, 40400, '设计不存在');
    res.json({ code: 0, message: 'ok', data: { deleted: true } });
  })
);

export default designsRouter;
