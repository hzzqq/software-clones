import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { widgetRepo, WidgetPatch } from '../repositories/widgetRepo';

export const widgetsRouter: Router = Router();

widgetsRouter.get(
  '/widgets',
  asyncHandler((_req: Request, res: Response): void => {
    res.json({ code: 0, message: 'ok', data: widgetRepo.list() });
  })
);

widgetsRouter.post(
  '/widgets',
  asyncHandler((req: Request, res: Response): void => {
    const { type, title, layoutJson, configJson, enabled } = req.body ?? {};
    if (typeof type !== 'string' || !type.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：type 必填', data: null });
      return;
    }
    if (typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：title 必填', data: null });
      return;
    }
    const created = widgetRepo.create({
      type: type.trim(),
      title: title.trim(),
      layoutJson: typeof layoutJson === 'string' ? layoutJson : undefined,
      configJson: typeof configJson === 'string' ? configJson : undefined,
      enabled: typeof enabled === 'number' ? enabled : undefined,
    });
    res.status(201).json({ code: 0, message: 'ok', data: created });
  })
);

widgetsRouter.patch(
  '/widgets/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    const { type, title, layoutJson, configJson, enabled } = req.body ?? {};
    const patch: WidgetPatch = {};
    if (typeof type === 'string') patch.type = type.trim();
    if (typeof title === 'string') patch.title = title.trim();
    if (typeof layoutJson === 'string') patch.layoutJson = layoutJson;
    if (typeof configJson === 'string') patch.configJson = configJson;
    if (typeof enabled === 'number') patch.enabled = enabled;
    const updated = widgetRepo.update(id, patch);
    if (!updated) {
      res.status(404).json({ code: 40400, message: '组件不存在', data: null });
      return;
    }
    res.json({ code: 0, message: 'ok', data: updated });
  })
);

widgetsRouter.delete(
  '/widgets/:id',
  asyncHandler((req: Request, res: Response): void => {
    const id: number = Number(req.params.id);
    if (!widgetRepo.getById(id)) {
      res.status(404).json({ code: 40400, message: '组件不存在', data: null });
      return;
    }
    widgetRepo.remove(id);
    res.json({ code: 0, message: 'ok', data: null });
  })
);
