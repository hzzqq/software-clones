import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
  likeStation,
  featuredStation,
} from '../repositories/stationRepo';

export const stationsRouter: Router = Router();

stationsRouter.get(
  '/stations',
  asyncHandler((req: Request, res: Response): void => {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    res.json({ code: 0, message: 'ok', data: listStations(category) });
  }),
);

stationsRouter.get(
  '/stations/featured',
  asyncHandler((_req: Request, res: Response): void => {
    const station = featuredStation();
    res.json({ code: 0, message: 'ok', data: station });
  }),
);

stationsRouter.post(
  '/stations',
  asyncHandler((req: Request, res: Response): void => {
    const { name, streamUrl, description, category } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      throw new HttpError(400, 40000, 'name is required');
    }
    if (typeof streamUrl !== 'string' || !streamUrl.trim()) {
      throw new HttpError(400, 40000, 'streamUrl is required');
    }
    const station = createStation({
      name: name.trim(),
      streamUrl: streamUrl.trim(),
      description,
      category,
    });
    res.status(201).json({ code: 0, message: 'ok', data: station });
  }),
);

stationsRouter.get(
  '/stations/:id',
  asyncHandler((req: Request, res: Response): void => {
    const station = getStation(Number(req.params.id));
    if (!station) throw new HttpError(404, 40400, 'station not found');
    res.json({ code: 0, message: 'ok', data: station });
  }),
);

stationsRouter.patch(
  '/stations/:id',
  asyncHandler((req: Request, res: Response): void => {
    const { name, streamUrl, description, category } = req.body ?? {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      throw new HttpError(400, 40000, 'name must be a non-empty string');
    }
    if (streamUrl !== undefined && (typeof streamUrl !== 'string' || !streamUrl.trim())) {
      throw new HttpError(400, 40000, 'streamUrl must be a non-empty string');
    }
    const station = updateStation(Number(req.params.id), { name, streamUrl, description, category });
    if (!station) throw new HttpError(404, 40400, 'station not found');
    res.json({ code: 0, message: 'ok', data: station });
  }),
);

stationsRouter.delete(
  '/stations/:id',
  asyncHandler((req: Request, res: Response): void => {
    const ok = deleteStation(Number(req.params.id));
    if (!ok) throw new HttpError(404, 40400, 'station not found');
    res.json({ code: 0, message: 'ok', data: { id: Number(req.params.id) } });
  }),
);

stationsRouter.post(
  '/stations/:id/like',
  asyncHandler((req: Request, res: Response): void => {
    const station = likeStation(Number(req.params.id));
    if (!station) throw new HttpError(404, 40400, 'station not found');
    res.json({ code: 0, message: 'ok', data: station });
  }),
);
