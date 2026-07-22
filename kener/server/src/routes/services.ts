import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import { statusFromCode } from '../lib/status';
import * as repo from '../repositories/serviceRepo';
import { probeAndRecord } from '../services/probe';

export const servicesRouter = Router();

servicesRouter.get(
  '/services',
  asyncHandler(async (_req, res) => {
    const services = repo.listServices();
    const withStatus = services.map((s) => {
      const last = repo.lastCheck(s.id);
      return {
        ...s,
        lastStatus: last ? statusFromCode(last.statusCode) : 'down',
        lastCheckedAt: last?.checkedAt ?? null,
        latencyMs: last?.latencyMs ?? null,
      };
    });
    res.json({ code: 0, message: 'ok', data: withStatus });
  }),
);

servicesRouter.post(
  '/services',
  asyncHandler(async (req, res) => {
    const { name, url, description } = (req.body ?? {}) as {
      name?: string;
      url?: string;
      description?: string;
    };
    if (!name || !url) throw new HttpError(400, 40001, 'name 与 url 为必填');
    const svc = repo.createService({ name, url, description });
    res.json({ code: 0, message: 'ok', data: svc });
  }),
);

servicesRouter.get(
  '/services/:id',
  asyncHandler(async (req, res) => {
    const svc = repo.getService(Number(req.params.id));
    if (!svc) throw new HttpError(404, 40400, '服务不存在');
    const last = repo.lastCheck(svc.id);
    res.json({
      code: 0,
      message: 'ok',
      data: {
        ...svc,
        lastStatus: last ? statusFromCode(last.statusCode) : 'down',
        lastCheckedAt: last?.checkedAt ?? null,
        latencyMs: last?.latencyMs ?? null,
      },
    });
  }),
);

servicesRouter.patch(
  '/services/:id',
  asyncHandler(async (req, res) => {
    const svc = repo.updateService(Number(req.params.id), req.body ?? {});
    if (!svc) throw new HttpError(404, 40400, '服务不存在');
    res.json({ code: 0, message: 'ok', data: svc });
  }),
);

servicesRouter.delete(
  '/services/:id',
  asyncHandler(async (req, res) => {
    repo.deleteService(Number(req.params.id));
    res.json({ code: 0, message: 'ok', data: null });
  }),
);

servicesRouter.post(
  '/services/:id/probe',
  asyncHandler(async (req, res) => {
    const svc = repo.getService(Number(req.params.id));
    if (!svc) throw new HttpError(404, 40400, '服务不存在');
    const result = await probeAndRecord(svc.id, svc.url);
    res.json({
      code: 0,
      message: 'ok',
      data: { ...result, status: statusFromCode(result.statusCode) },
    });
  }),
);

servicesRouter.get(
  '/services/:id/checks',
  asyncHandler(async (req, res) => {
    const svc = repo.getService(Number(req.params.id));
    if (!svc) throw new HttpError(404, 40400, '服务不存在');
    const days = Number(req.query.days ?? 90);
    const checks = repo.recentChecks(svc.id, days);
    res.json({ code: 0, message: 'ok', data: checks });
  }),
);
