import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { getCanvas } from '../repositories/canvasRepo';
import { getNode } from '../repositories/nodeRepo';
import { createEdge, updateEdge, deleteEdge } from '../repositories/edgeRepo';
import type { EdgeSide } from '../types';

export const edgesRouter: Router = Router();

const VALID_SIDES: EdgeSide[] = ['top', 'right', 'bottom', 'left'];

// POST /api/canvases/:canvasId/edges
edgesRouter.post(
  '/canvases/:canvasId/edges',
  asyncHandler((req: Request, res: Response): void => {
    const canvasId = Number(req.params.canvasId);
    if (!getCanvas(canvasId)) {
      throw new HttpError(404, 40400, '画布不存在');
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const fromId = Number(body.fromId);
    const toId = Number(body.toId);
    if (!Number.isInteger(fromId) || !Number.isInteger(toId) || fromId === toId) {
      throw new HttpError(400, 40001, 'fromId/toId 非法');
    }
    const from = getNode(fromId);
    const to = getNode(toId);
    if (!from || !to || from.canvasId !== canvasId || to.canvasId !== canvasId) {
      throw new HttpError(400, 40001, '连线端点不合法');
    }
    const fromSide: EdgeSide = VALID_SIDES.includes(body.fromSide as EdgeSide)
      ? (body.fromSide as EdgeSide)
      : 'right';
    const toSide: EdgeSide = VALID_SIDES.includes(body.toSide as EdgeSide)
      ? (body.toSide as EdgeSide)
      : 'left';
    const edge = createEdge({ canvasId, fromId, toId, fromSide, toSide });
    res.status(201).json({ code: 0, message: 'ok', data: edge });
  }),
);

// PATCH /api/edges/:id
edgesRouter.patch(
  '/edges/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const input: { fromSide?: EdgeSide; toSide?: EdgeSide } = {};
    if (body.fromSide !== undefined) {
      if (!VALID_SIDES.includes(body.fromSide as EdgeSide)) {
        throw new HttpError(400, 40001, 'fromSide 非法');
      }
      input.fromSide = body.fromSide as EdgeSide;
    }
    if (body.toSide !== undefined) {
      if (!VALID_SIDES.includes(body.toSide as EdgeSide)) {
        throw new HttpError(400, 40001, 'toSide 非法');
      }
      input.toSide = body.toSide as EdgeSide;
    }
    const edge = updateEdge(id, input);
    if (!edge) {
      throw new HttpError(404, 40400, '连线不存在');
    }
    res.json({ code: 0, message: 'ok', data: edge });
  }),
);

// DELETE /api/edges/:id
edgesRouter.delete(
  '/edges/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteEdge(Number(req.params.id));
    if (!ok) {
      throw new HttpError(404, 40400, '连线不存在');
    }
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);
