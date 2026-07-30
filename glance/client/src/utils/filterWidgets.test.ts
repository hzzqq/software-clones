import { describe, it, expect } from 'vitest';
import { filterWidgets, sortWidgets, countWidgetsByType, filterWidgetsByType, filterWidgetsByEnabled, summarizeWidgets, widgetTypeLabel } from './filterWidgets';
import type { Widget, WidgetLayout, WidgetConfig } from '../types';

function mk(id: number, title: string, type: Widget['type']): Widget {
  return {
    id,
    type,
    title,
    layout: { x: 0, y: 0, w: 1, h: 1 },
    config: {},
    enabled: true,
    createdAt: '',
    updatedAt: '',
  };
}

describe('filterWidgets', () => {
  const ws = [mk(1, '天气', 'weather'), mk(2, '我的 RSS', 'rss'), mk(3, '书签栏', 'bookmarks')];
  it('空白返回全部', () => {
    expect(filterWidgets('  ', ws)).toHaveLength(3);
  });
  it('按标题匹配', () => {
    expect(filterWidgets('rss', ws).map((w) => w.id)).toEqual([2]);
  });
  it('按类型匹配（大小写不敏感）', () => {
    expect(filterWidgets('WEATHER', ws).map((w) => w.id)).toEqual([1]);
  });
  it('无命中返回空数组', () => {
    expect(filterWidgets('zzz', ws)).toHaveLength(0);
  });
});

describe('sortWidgets', () => {
  const ws: Widget[] = [
    { id: 1, type: 'weather', title: 'B', layout: { x: 0, y: 0, w: 1, h: 1 }, config: {}, enabled: true, createdAt: '', updatedAt: '2026-01-01' },
    { id: 2, type: 'rss', title: 'A', layout: { x: 0, y: 0, w: 1, h: 1 }, config: {}, enabled: true, createdAt: '', updatedAt: '2026-03-01' },
    { id: 3, type: 'bookmarks', title: 'C', layout: { x: 0, y: 0, w: 1, h: 1 }, config: {}, enabled: true, createdAt: '', updatedAt: '2026-02-01' },
  ];
  it('title：按标题字典序', () => {
    expect(sortWidgets(ws, 'title').map((w) => w.id)).toEqual([2, 1, 3]);
  });
  it('type：按类型字典序', () => {
    expect(sortWidgets(ws, 'type').map((w) => w.id)).toEqual([3, 2, 1]);
  });
  it('updatedAt：最近更新在前', () => {
    expect(sortWidgets(ws, 'updatedAt').map((w) => w.id)).toEqual([2, 3, 1]);
  });
  it('不修改原数组', () => {
    const before = ws.map((w) => w.id);
    sortWidgets(ws, 'title');
    expect(ws.map((w) => w.id)).toEqual(before);
  });
});

describe('countWidgetsByType', () => {
  const ws: Widget[] = [mk(1, 'a', 'clock'), mk(2, 'b', 'weather'), mk(3, 'c', 'clock')];
  it('按类型计数', () => {
    expect(countWidgetsByType(ws)).toEqual({ clock: 2, weather: 1 });
  });
  it('空列表返回空对象', () => {
    expect(countWidgetsByType([])).toEqual({});
  });
  it('不修改入参', () => {
    const before = ws.map((w) => w.id);
    countWidgetsByType(ws);
    expect(ws.map((w) => w.id)).toEqual(before);
  });
});

describe('filterWidgetsByType', () => {
  const ws = [mk(1, '天气', 'weather'), mk(2, '我的 RSS', 'rss'), mk(3, '书签栏', 'bookmarks')];
  it('按类型精确筛选', () => {
    expect(filterWidgetsByType(ws, 'weather').map((w) => w.id)).toEqual([1]);
  });
  it('大小写不敏感', () => {
    expect(filterWidgetsByType(ws, 'RSS').map((w) => w.id)).toEqual([2]);
  });
  it('空串/“all” 返回全部', () => {
    expect(filterWidgetsByType(ws, '')).toHaveLength(3);
    expect(filterWidgetsByType(ws, 'all')).toHaveLength(3);
  });
  it('无命中返回空数组', () => {
    expect(filterWidgetsByType(ws, 'unknown')).toHaveLength(0);
  });
  it('不修改入参', () => {
    const before = ws.map((w) => w.id);
    filterWidgetsByType(ws, 'weather');
    expect(ws.map((w) => w.id)).toEqual(before);
  });
});

describe('summarizeWidgets', () => {
  it('汇总总数与类型数', () => {
    const s = summarizeWidgets([mk(1, 'a', 'clock'), mk(2, 'b', 'weather'), mk(3, 'c', 'clock')]);
    expect(s.total).toBe(3);
    expect(s.typeCount).toBe(2);
    expect(s.byType).toEqual({ clock: 2, weather: 1 });
  });
  it('空列表为零', () => {
    const s = summarizeWidgets([]);
    expect(s.total).toBe(0);
    expect(s.typeCount).toBe(0);
    expect(s.byType).toEqual({});
  });
  it('不修改入参', () => {
    const ws = [mk(1, 'a', 'clock')];
    const before = ws.map((w) => w.id);
    summarizeWidgets(ws);
    expect(ws.map((w) => w.id)).toEqual(before);
  });
});

describe('widgetTypeLabel', () => {
  it('已知类型返回中文标签', () => {
    expect(widgetTypeLabel('clock')).toBe('时钟');
    expect(widgetTypeLabel('weather')).toBe('天气');
    expect(widgetTypeLabel('notes')).toBe('便签');
    expect(widgetTypeLabel('rss')).toBe('RSS 订阅');
  });
  it('未知类型原样透传', () => {
    expect(widgetTypeLabel('unknown-type' as unknown as Widget['type'])).toBe('unknown-type');
  });
});

describe('filterWidgetsByEnabled', () => {
  const widgets: Widget[] = [
    { id: 1, type: 'clock', title: 'A', layout: {} as WidgetLayout, config: {} as WidgetConfig, enabled: true, createdAt: '', updatedAt: '' },
    { id: 2, type: 'rss', title: 'B', layout: {} as WidgetLayout, config: {} as WidgetConfig, enabled: false, createdAt: '', updatedAt: '' },
    { id: 3, type: 'weather', title: 'C', layout: {} as WidgetLayout, config: {} as WidgetConfig, enabled: true, createdAt: '', updatedAt: '' },
  ];
  it('仅保留 enabled=true', () => {
    expect(filterWidgetsByEnabled(widgets, true).map((w) => w.id)).toEqual([1, 3]);
  });
  it('only=false 时原样返回(浅拷贝)', () => {
    const out = filterWidgetsByEnabled(widgets, false);
    expect(out.map((w) => w.id)).toEqual([1, 2, 3]);
    expect(out).not.toBe(widgets);
  });
  it('不修改原数组', () => {
    const before = widgets.map((w) => w.id);
    filterWidgetsByEnabled(widgets, true);
    expect(widgets.map((w) => w.id)).toEqual(before);
  });
  it('空/非数组返回空数组', () => {
    expect(filterWidgetsByEnabled([])).toEqual([]);
    expect(filterWidgetsByEnabled(null as unknown as Widget[])).toEqual([]);
  });
});
