import { Router, Request, Response } from 'express';
import yaml from 'js-yaml';
import { asyncHandler } from '../middleware/asyncHandler';
import { widgetRepo } from '../repositories/widgetRepo';

interface YamlWidget {
  id?: number;
  type?: string;
  title?: string;
  enabled?: boolean;
  layout?: unknown;
  config?: unknown;
}

export const configRouter: Router = Router();

// Export all widgets as a Glance-style YAML document.
configRouter.get(
  '/config/export',
  asyncHandler((_req: Request, res: Response): void => {
    const widgets = widgetRepo.list();
    const doc = {
      version: 1,
      widgets: widgets.map((w) => ({
        id: w.id,
        type: w.type,
        title: w.title,
        enabled: w.enabled === 1,
        layout: JSON.parse(w.layoutJson),
        config: JSON.parse(w.configJson),
      })),
    };
    const text: string = yaml.dump(doc, { lineWidth: -1, noRefs: true });
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.send(text);
  })
);

// Import widgets from a YAML document (replaces existing widgets).
configRouter.post(
  '/config/import',
  asyncHandler((req: Request, res: Response): void => {
    const { yaml: yamlText } = req.body ?? {};
    if (typeof yamlText !== 'string' || !yamlText.trim()) {
      res.status(400).json({ code: 40001, message: '字段校验失败：yaml 必填', data: null });
      return;
    }
    let doc: { widgets?: YamlWidget[] };
    try {
      doc = (yaml.load(yamlText) as { widgets?: YamlWidget[] }) ?? {};
    } catch (e) {
      res.status(400).json({ code: 40001, message: `YAML 解析失败：${(e as Error).message}`, data: null });
      return;
    }

    const items: YamlWidget[] = Array.isArray(doc.widgets) ? doc.widgets : [];
    widgetRepo.clear();
    let imported = 0;
    for (const item of items) {
      const type: string = String(item.type ?? '');
      if (!type) continue;
      widgetRepo.create({
        type,
        title: String(item.title ?? type),
        layoutJson: JSON.stringify(item.layout ?? { x: 0, y: 0, w: 4, h: 4 }),
        configJson: JSON.stringify(item.config ?? {}),
        enabled: item.enabled === false ? 0 : 1,
      });
      imported += 1;
    }

    res.status(201).json({ code: 0, message: 'ok', data: { imported } });
  })
);
