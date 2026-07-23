import { describe, it, expect } from 'vitest';
import { filterWidgets, sortWidgets } from './filterWidgets';
import type { Widget } from '../types';

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
