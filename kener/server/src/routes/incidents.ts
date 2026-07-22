import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import * as repo from '../repositories/incidentRepo';

export const incidentsRouter = Router();

incidentsRouter.get(
  '/incidents',
  asyncHandler(async (_req, res) => {
    res.json({ code: 0, message: 'ok', data: repo.listIncidents() });
  }),
);

incidentsRouter.post(
  '/incidents',
  asyncHandler(async (req, res) => {
    const { serviceId, title, description, status } = (req.body ?? {}) as {
      serviceId?: number | null;
      title?: string;
      description?: string;
      status?: string;
    };
    if (!title) throw new HttpError(400, 40001, 'title 为必填');
    const incident = repo.createIncident({ serviceId: serviceId ?? null, title, description, status });
    res.json({ code: 0, message: 'ok', data: incident });
  }),
);

incidentsRouter.get(
  '/incidents/:id',
  asyncHandler(async (req, res) => {
    const incident = repo.getIncident(Number(req.params.id));
    if (!incident) throw new HttpError(404, 40400, '事件不存在');
    res.json({ code: 0, message: 'ok', data: incident });
  }),
);

incidentsRouter.patch(
  '/incidents/:id',
  asyncHandler(async (req, res) => {
    const incident = repo.updateIncident(Number(req.params.id), req.body ?? {});
    if (!incident) throw new HttpError(404, 40400, '事件不存在');
    res.json({ code: 0, message: 'ok', data: incident });
  }),
);

incidentsRouter.delete(
  '/incidents/:id',
  asyncHandler(async (req, res) => {
    repo.deleteIncident(Number(req.params.id));
    res.json({ code: 0, message: 'ok', data: null });
  }),
);
