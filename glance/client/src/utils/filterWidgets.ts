import type { Widget, WidgetType } from '../types';

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

/** WidgetType → 中文标签映射。 */
const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  rss: 'RSS 订阅',
  weather: '天气',
  bookmarks: '书签',
  status: '状态监控',
  clock: '时钟',
  notes: '便签',
};

/**
 * 组件类型 → 中文标签。
 * 已知类型返回对应中文标签，未知类型原样返回（passthrough）。
 */
export function widgetTypeLabel(type: WidgetType): string {
  return WIDGET_TYPE_LABELS[type] ?? type;
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

/**
 * 按 widget.type 将组件分组，组内保持原顺序。
 * - 空输入返回 {}（空对象）。
 * - 只读取入参，不会修改入参数组或其元素（输出为新数组，仅引用原对象）。
 */
export function groupWidgetsByType(widgets: Widget[]): Record<WidgetType, Widget[]> {
  const groups: Partial<Record<WidgetType, Widget[]>> = {};
  for (const w of widgets) {
    (groups[w.type] ??= []).push(w);
  }
  return groups as Record<WidgetType, Widget[]>;
}
