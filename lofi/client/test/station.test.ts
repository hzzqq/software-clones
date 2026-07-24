import { describe, it, expect } from 'vitest';
import { Station } from '../src/types';
import {
  filterStationsByCategory,
  filterStations,
  sortStations,
  groupStationsByCategory,
  categoryLabel,
  filterStationsByLikes,
  summarizeStations,
  formatCount,
} from '../src/utils/station';

function makeStation(partial: Partial<Station> & Pick<Station, 'id' | 'name' | 'category'>): Station {
  return {
    streamUrl: 'https://example.com/stream',
    description: '',
    likes: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  } as Station;
}

describe('filterStationsByCategory', () => {
  const stations: Station[] = [
    makeStation({ id: 1, name: 'A', category: 'lofi' }),
    makeStation({ id: 2, name: 'B', category: 'LoFi' }), // 同一分类、大小写不同
    makeStation({ id: 3, name: 'C', category: 'ambient' }),
    makeStation({ id: 4, name: 'D', category: 'classical' }),
  ];

  it('精确匹配分类（大小写不敏感）', () => {
    const result = filterStationsByCategory(stations, 'LOFI');
    expect(result.map((s) => s.id).sort()).toEqual([1, 2]);
  });

  it('无匹配分类时返回空数组', () => {
    const result = filterStationsByCategory(stations, 'jazz');
    expect(result).toEqual([]);
  });

  it('空白分类返回全部且不修改入参', () => {
    const snapshot = JSON.parse(JSON.stringify(stations));
    const result = filterStationsByCategory(stations, '   ');
    expect(result).toHaveLength(stations.length);
    expect(result.map((s) => s.id).sort()).toEqual([1, 2, 3, 4]);
    expect(stations).toEqual(snapshot); // 入参未被修改
  });

  it('不修改入参数组', () => {
    const before = [...stations];
    filterStationsByCategory(stations, 'ambient');
    expect(stations).toEqual(before);
  });
});

describe('formatCount', () => {
  it('小于 1000 原样返回', () => {
    expect(formatCount(42)).toBe('42');
  });

  it('1000..999999 显示 k（去 .0，保留 1 位有效小数）', () => {
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(1000)).toBe('1k');
  });

  it('≥ 1000000 显示 M（保留 1 位小数）', () => {
    expect(formatCount(2500000)).toBe('2.5M');
  });

  it('负数保留负号', () => {
    expect(formatCount(-5)).toBe('-5');
  });

  it('NaN 返回 0', () => {
    expect(formatCount(NaN)).toBe('0');
  });

  it('不修改入参', () => {
    const input = 1500;
    formatCount(input);
    expect(input).toBe(1500);
  });
});

describe('其他 station 工具函数回归', () => {
  it('filterStations 空白查询返回全部', () => {
    const list = [makeStation({ id: 1, name: 'x', category: 'lofi' })];
    expect(filterStations('', list)).toEqual(list);
  });

  it('sortStations 按名称排序', () => {
    const list = [
      makeStation({ id: 1, name: 'b', category: 'lofi' }),
      makeStation({ id: 2, name: 'a', category: 'lofi' }),
    ];
    expect(sortStations(list, 'name').map((s) => s.name)).toEqual(['a', 'b']);
  });

  it('groupStationsByCategory 分组', () => {
    const list = [
      makeStation({ id: 1, name: 'a', category: 'lofi' }),
      makeStation({ id: 2, name: 'b', category: 'lofi' }),
      makeStation({ id: 3, name: 'c', category: 'ambient' }),
    ];
    const grouped = groupStationsByCategory(list);
    expect(grouped['lofi']).toHaveLength(2);
    expect(grouped['ambient']).toHaveLength(1);
  });

  it('categoryLabel 已知映射', () => {
    expect(categoryLabel('lofi')).toBe('Lo-fi');
    expect(categoryLabel('unknown')).toBe('unknown');
  });

  it('filterStationsByLikes 过滤点赞', () => {
    const list = [
      makeStation({ id: 1, name: 'a', category: 'lofi', likes: 3 }),
      makeStation({ id: 2, name: 'b', category: 'lofi', likes: 12 }),
    ];
    expect(filterStationsByLikes(list, 10).map((s) => s.id)).toEqual([2]);
  });

  it('summarizeStations 汇总', () => {
    const list = [
      makeStation({ id: 1, name: 'a', category: 'lofi', likes: 3 }),
      makeStation({ id: 2, name: 'b', category: 'ambient', likes: 12 }),
    ];
    expect(summarizeStations(list)).toEqual({ total: 2, categories: 2, totalLikes: 15 });
  });
});
