import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { listHistory, clearHistory } from '../repositories/historyRepo';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json({ code: 0, message: 'ok', data: listHistory(50) });
}));

router.delete('/', asyncHandler(async (_req, res) => {
  clearHistory();
  res.json({ code: 0, message: 'ok', data: { cleared: true } });
}));

export default router;
