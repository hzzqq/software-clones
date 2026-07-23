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

/** 按类型精确筛选；type 为空串或 'all' 时返回原列表。不修改入参。 */
export function filterWidgetsByType(widgets: Widget[], type: string): Widget[] {
  const t = type.trim().toLowerCase();
  if (!t || t === 'all') return widgets;
  return widgets.filter((w) => w.type.toLowerCase() === t);
}

/** 组件统计概览。 */
export interface WidgetsSummary {
  total: number;
  typeCount: number;
  byType: Record<string, number>;
}

/** 汇总组件：总数、类型数、各类型数量（不修改入参）。 */
export function summarizeWidgets(widgets: Widget[]): WidgetsSummary {
  const byType: Record<string, number> = {};
  for (const w of widgets) byType[w.type] = (byType[w.type] ?? 0) + 1;
  return { total: widgets.length, typeCount: Object.keys(byType).length, byType };
}
