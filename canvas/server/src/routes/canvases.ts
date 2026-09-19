import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listCanvases,
  getCanvas,
  createCanvas,
  updateCanvas,
  deleteCanvas,
} from '../repositories/canvasRepo';
import { listNodes } from '../repositories/nodeRepo';
import { listEdges } from '../repositories/edgeRepo';
import type { CanvasFull } from '../types';

export const canvasesRouter: Router = Router();

// GET /api/canvases
canvasesRouter.get(
  '/canvases',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: listCanvases() });
  }),
);

// POST /api/canvases
canvasesRouter.post(
  '/canvases',
  asyncHandler((req: Request, res: Response): void => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled';
    const canvas = createCanvas(name);
    res.status(201).json({ code: 0, message: 'ok', data: canvas });
  }),
);

// GET /api/canvases/:id —— 完整数据（节点 + 连线）
canvasesRouter.get(
  '/canvases/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const canvas = getCanvas(id);
    if (!canvas) {
      throw new HttpError(404, 40400, '画布不存在');
    }
    const full: CanvasFull = {
      ...canvas,
      nodes: listNodes(id),
      edges: listEdges(id),
    };
    res.json({ code: 0, message: 'ok', data: full });
  }),
);

// PATCH /api/canvases/:id
canvasesRouter.patch(
  '/canvases/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new HttpError(400, 40001, 'name 不能为空');
    }
    const canvas = updateCanvas(id, body.name.trim());
    if (!canvas) {
      throw new HttpError(404, 40400, '画布不存在');
    }
    res.json({ code: 0, message: 'ok', data: canvas });
  }),
);

// DELETE /api/canvases/:id
canvasesRouter.delete(
  '/canvases/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteCanvas(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '画布不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);
