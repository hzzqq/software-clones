import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { statusFromCode } from '../lib/status';
import * as repo from '../repositories/serviceRepo';

export const statusRouter = Router();

statusRouter.get(
  '/status/summary',
  asyncHandler(async (_req, res) => {
    const services = repo.listServices();
    const items = services.map((s) => {
      const last = repo.lastCheck(s.id);
      return {
        id: s.id,
        name: s.name,
        status: last ? statusFromCode(last.statusCode) : 'down',
        latencyMs: last?.latencyMs ?? null,
      };
    });
    const overall = items.some((i) => i.status === 'down')
      ? 'down'
      : items.some((i) => i.status === 'degraded')
        ? 'degraded'
        : 'up';
    res.json({ code: 0, message: 'ok', data: { overall, services: items } });
  }),
);
