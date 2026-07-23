import type { Widget } from '../types';

/** Case-insensitive filter across title and type. */
export function filterWidgets(query: string, widgets: Widget[]): Widget[] {
  const q = query.trim().toLowerCase();
  if (!q) return widgets;
  return widgets.filter(
    (w) => w.title.toLowerCase().includes(q) || w.type.toLowerCase().includes(q)
  );
}
