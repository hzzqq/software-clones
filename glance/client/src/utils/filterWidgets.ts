import type { Widget } from '../types';

/** Case-insensitive filter across title and type. */
export function filterWidgets(query: string, widgets: Widget[]): Widget[] {
  const q = query.trim().toLowerCase();
  if (!q) return widgets;
  return widgets.filter(
    (w) => w.title.toLowerCase().includes(q) || w.type.toLowerCase().includes(q)
  );
}

export type WidgetSort = 'title' | 'type' | 'updatedAt';

/**
 * 返回按指定字段排序的新数组（不修改入参）。
 * - title：按标题字典序
 * - type：按类型字典序
 * - updatedAt：最近更新在前
 */
export function sortWidgets(widgets: Widget[], by: WidgetSort = 'title'): Widget[] {
  return [...widgets].sort((a, b) => {
    switch (by) {
      case 'type':
        return a.type.localeCompare(b.type, 'zh');
      case 'updatedAt':
        return b.updatedAt.localeCompare(a.updatedAt);
      case 'title':
      default:
        return a.title.localeCompare(b.title, 'zh');
    }
  });
}

/** 统计各类型下的组件数量，不修改入参。 */
export function countWidgetsByType(widgets: Widget[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const w of widgets) {
    map[w.type] = (map[w.type] ?? 0) + 1;
  }
  return map;
}
