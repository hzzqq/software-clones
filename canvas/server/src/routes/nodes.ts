import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { getCanvas } from '../repositories/canvasRepo';
import {
  getNode,
  createNode,
  updateNode,
  deleteNode,
  deleteNodes,
} from '../repositories/nodeRepo';
import { touchCanvas } from '../repositories/canvasRepo';
import type { NodeKind } from '../types';

export const nodesRouter: Router = Router();

const VALID_KINDS: NodeKind[] = ['note', 'group', 'image'];

// POST /api/canvases/:canvasId/nodes
nodesRouter.post(
  '/canvases/:canvasId/nodes',
  asyncHandler((req: Request, res: Response): void => {
    const canvasId = Number(req.params.canvasId);
    if (!getCanvas(canvasId)) {
      throw new HttpError(404, 40400, '画布不存在');
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!VALID_KINDS.includes(body.kind as NodeKind)) {
      throw new HttpError(400, 40001, 'kind 必须是 note/group/image');
    }
    const x = Number(body.x);
    const y = Number(body.y);
    const w = Number(body.w);
    const h = Number(body.h);
    if (![x, y, w, h].every((n) => Number.isFinite(n)) || w <= 0 || h <= 0) {
      throw new HttpError(400, 40001, 'x/y/w/h 非法');
    }
    const content = typeof body.content === 'string' ? body.content : '';
    const color = typeof body.color === 'string' ? body.color : null;
    const node = createNode({
      canvasId,
      kind: body.kind as NodeKind,
      x,
      y,
      w,
      h,
      content,
      color,
    });
    touchCanvas(canvasId);
    res.status(201).json({ code: 0, message: 'ok', data: node });
  }),
);

// PATCH /api/nodes/:id
nodesRouter.patch(
  '/nodes/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const input: {
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      content?: string;
      color?: string | null;
    } = {};
    for (const f of ['x', 'y', 'w', 'h']) {
      if (body[f] !== undefined) {
        const n = Number(body[f]);
        if (!Number.isFinite(n)) {
          throw new HttpError(400, 40001, `${f} 非法`);
        }
        input[f as 'x'] = n;
      }
    }
    if (body.content !== undefined) {
      input.content = typeof body.content === 'string' ? body.content : '';
    }
    if (body.color !== undefined) {
      input.color = body.color === null ? null : typeof body.color === 'string' ? body.color : undefined;
    }
    const node = updateNode(id, input);
    if (!node) {
      throw new HttpError(404, 40400, '节点不存在');
    }
    touchCanvas(node.canvasId);
    res.json({ code: 0, message: 'ok', data: node });
  }),
);

// DELETE /api/nodes/:id
nodesRouter.delete(
  '/nodes/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const node = getNode(id);
    if (!node) {
      throw new HttpError(404, 40400, '节点不存在');
    }
    deleteNode(id);
    touchCanvas(node.canvasId);
    res.json({ code: 0, message: 'ok', data: { id } });
  }),
);

// DELETE /api/nodes —— 批量删除（框选）
nodesRouter.delete(
  '/nodes',
  asyncHandler((req: Request, res: Response): void => {
    const ids = Array.isArray((req.body ?? {}).ids)
      ? ((req.body as { ids: unknown }).ids as unknown[])
          .filter((n): n is number => Number.isInteger(n) && (n as number) > 0)
      : [];
    const deleted = deleteNodes(ids);
    res.json({ code: 0, message: 'ok', data: { deleted } });
  }),
);
