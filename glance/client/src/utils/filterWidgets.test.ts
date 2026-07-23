import { describe, it, expect } from 'vitest';
import { filterWidgets } from './filterWidgets';
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
