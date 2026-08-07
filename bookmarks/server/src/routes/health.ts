import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';

/** Health-check route: returns `{ ok: true }` for liveness probes. */
export const healthRouter: Router = Router();

healthRouter.get(
  '/health',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: { ok: true } });
  }),
);
