import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { listTags } from '../repositories/tagRepo';

export const tagsRouter: Router = Router();

tagsRouter.get(
  '/tags',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listTags() });
  }),
);
