import { db } from '../db';

/** Persisted widget (layout/config stored as JSON strings). */
export interface Widget {
  id: number;
  type: string;
  title: string;
  layoutJson: string;
  configJson: string;
  enabled: number;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetInput {
  type: string;
  title: string;
  layoutJson?: string;
  configJson?: string;
  enabled?: number;
}

export type WidgetPatch = Partial<{
  type: string;
  title: string;
  layoutJson: string;
  configJson: string;
  enabled: number;
}>;

interface WidgetRow {
  id: number;
  type: string;
  title: string;
  layout_json: string;
  config_json: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

function rowToWidget(row: WidgetRow): Widget {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    layoutJson: row.layout_json,
    configJson: row.config_json,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Data-access layer for widgets. */
export const widgetRepo = {
  list(): Widget[] {
    const rows = db.prepare('SELECT * FROM widget ORDER BY created_at ASC').all() as WidgetRow[];
    return rows.map(rowToWidget);
  },

  create(input: WidgetInput): Widget {
    const now: string = new Date().toISOString();
    const layoutJson: string = input.layoutJson ?? '{"x":0,"y":0,"w":4,"h":4}';
    const configJson: string = input.configJson ?? '{}';
    const enabled: number = input.enabled ?? 1;
    const info = db
      .prepare(
        `INSERT INTO widget (type, title, layout_json, config_json, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(input.type, input.title, layoutJson, configJson, enabled, now, now);
    const row = db.prepare('SELECT * FROM widget WHERE id = ?').get(info.lastInsertRowid) as WidgetRow;
    return rowToWidget(row);
  },

  update(id: number, patch: WidgetPatch): Widget | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;
    const type: string = patch.type ?? existing.type;
    const title: string = patch.title ?? existing.title;
    const layoutJson: string = patch.layoutJson ?? existing.layoutJson;
    const configJson: string = patch.configJson ?? existing.configJson;
    const enabled: number = patch.enabled ?? existing.enabled;
    const updatedAt: string = new Date().toISOString();
    db.prepare(
      `UPDATE widget SET type = ?, title = ?, layout_json = ?, config_json = ?, enabled = ?, updated_at = ? WHERE id = ?`
    ).run(type, title, layoutJson, configJson, enabled, updatedAt, id);
    return this.getById(id);
  },

  remove(id: number): void {
    db.prepare('DELETE FROM widget WHERE id = ?').run(id);
  },

  /** Removes all widgets (used by YAML config import). */
  clear(): void {
    db.prepare('DELETE FROM widget').run();
  },

  getById(id: number): Widget | undefined {
    const row = db.prepare('SELECT * FROM widget WHERE id = ?').get(id) as WidgetRow | undefined;
    return row ? rowToWidget(row) : undefined;
  },
};

export default widgetRepo;
