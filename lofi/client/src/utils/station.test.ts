import { describe, it, expect } from 'vitest';
import { categoryLabel, truncate, filterStations, sortStations, shuffleStations, groupStationsByCategory, filterStationsByLikes, summarizeStations, formatCount, formatClock } from './station';
import { Station } from '../types';

const sample: Station[] = [
  { id: 1, name: 'Lofi Beats', streamUrl: '', description: 'chill study', category: 'lofi', likes: 0, createdAt: '' },
  { id: 2, name: 'Jazz Cafe', streamUrl: '', description: 'smooth tunes', category: 'jazz', likes: 0, createdAt: '' },
  { id: 3, name: 'Ambient Space', streamUrl: '', description: 'deep focus', category: 'ambient', likes: 0, createdAt: '' },
];

describe('categoryLabel', () => {
  it('maps known categories to Chinese labels', () => {
    expect(categoryLabel('lofi')).toBe('Lo-fi');
    expect(categoryLabel('ambient')).toBe('氛围');
    expect(categoryLabel('classical')).toBe('古典');
  });
  it('falls back to the raw value for unknown categories', () => {
    expect(categoryLabel('jazz')).toBe('jazz');
  });
});

describe('truncate', () => {
  it('returns the text unchanged when short', () => {
    expect(truncate('hello', 80)).toBe('hello');
  });
  it('appends an ellipsis when over the limit', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
});

describe('filterStations', () => {
  it('returns all stations when the query is blank', () => {
    expect(filterStations('   ', sample)).toHaveLength(3);
    expect(filterStations('', sample)).toHaveLength(3);
  });
  it('matches by name case-insensitively', () => {
    expect(filterStations('JAZZ', sample).map((s) => s.id)).toEqual([2]);
  });
  it('matches by description', () => {
    expect(filterStations('focus', sample).map((s) => s.id)).toEqual([3]);
  });
  it('returns empty when nothing matches', () => {
    expect(filterStations('rock', sample)).toHaveLength(0);
  });
});

describe('sortStations', () => {
  const stations: Station[] = [
    { id: 1, name: 'B', streamUrl: '', description: '', category: 'lofi', likes: 5, createdAt: '2026-01-01' },
    { id: 2, name: 'A', streamUrl: '', description: '', category: 'jazz', likes: 20, createdAt: '2026-03-01' },
    { id: 3, name: 'C', streamUrl: '', description: '', category: 'ambient', likes: 10, createdAt: '2026-02-01' },
  ];
  it('name：按名称字典序', () => {
    expect(sortStations(stations, 'name').map((s) => s.id)).toEqual([2, 1, 3]);
  });
  it('category：按分类字典序', () => {
    expect(sortStations(stations, 'category').map((s) => s.id)).toEqual([3, 2, 1]);
  });
  it('likes：点赞数降序', () => {
    expect(sortStations(stations, 'likes').map((s) => s.id)).toEqual([2, 3, 1]);
  });
  it('createdAt：最近在前', () => {
    expect(sortStations(stations, 'createdAt').map((s) => s.id)).toEqual([2, 3, 1]);
  });
  it('不修改原数组', () => {
    const before = stations.map((s) => s.id);
    sortStations(stations, 'name');
    expect(stations.map((s) => s.id)).toEqual(before);
  });
  it('createdAt 缺失/非法不抛错并稳定排序', () => {
    const messy: Station[] = [
      { id: 1, name: 'a', category: 'lofi', likes: 0, createdAt: null as any, streamUrl: '', description: '' },
      { id: 2, name: 'b', category: 'lofi', likes: 0, createdAt: undefined as any, streamUrl: '', description: '' },
      { id: 3, name: 'c', category: 'lofi', likes: 0, createdAt: '2026-02-01', streamUrl: '', description: '' },
    ];
    expect(() => sortStations(messy, 'createdAt')).not.toThrow();
    expect(sortStations(messy, 'createdAt').map((s) => s.id).slice(0, 1)).toEqual([3]);
  });
});

describe('shuffleStations', () => {
  const stations: Station[] = [
    { id: 1, name: 'a', category: 'lofi', likes: 0, createdAt: '', streamUrl: '', description: '' },
    { id: 2, name: 'b', category: 'lofi', likes: 0, createdAt: '', streamUrl: '', description: '' },
    { id: 3, name: 'c', category: 'lofi', likes: 0, createdAt: '', streamUrl: '', description: '' },
  ];
  it('rng=0 时保持原顺序且为新数组', () => {
    const out = shuffleStations(stations, () => 0);
    expect(out.map((s) => s.id)).toEqual([1, 2, 3]);
    expect(out).not.toBe(stations);
  });
  it('结果是原集合的一个排列（元素与长度不变）', () => {
    const out = shuffleStations(stations, () => 0.42);
    expect(out).toHaveLength(stations.length);
    expect(new Set(out.map((s) => s.id))).toEqual(new Set(stations.map((s) => s.id)));
  });
  it('不修改原数组', () => {
    const before = stations.map((s) => s.id);
    shuffleStations(stations, () => 0.5);
    expect(stations.map((s) => s.id)).toEqual(before);
  });
});

describe('groupStationsByCategory', () => {
  const stations: Station[] = [
    { id: 1, name: 'a', category: 'lofi', likes: 0, createdAt: '', streamUrl: '', description: '' },
    { id: 2, name: 'b', category: 'chill', likes: 0, createdAt: '', streamUrl: '', description: '' },
    { id: 3, name: 'c', category: 'lofi', likes: 0, createdAt: '', streamUrl: '', description: '' },
  ];
  it('按分类分组并保留组内顺序', () => {
    const g = groupStationsByCategory(stations);
    expect(Object.keys(g)).toEqual(['lofi', 'chill']);
    expect(g['lofi'].map((s) => s.id)).toEqual([1, 3]);
    expect(g['chill'].map((s) => s.id)).toEqual([2]);
  });
  it('空列表返回空对象', () => {
    expect(groupStationsByCategory([])).toEqual({});
  });
  it('不修改入参', () => {
    const before = stations.map((s) => s.id);
    groupStationsByCategory(stations);
    expect(stations.map((s) => s.id)).toEqual(before);
  });
});

describe('filterStationsByLikes', () => {
  const stations: Station[] = [
    { id: 1, name: 'a', category: 'lofi', likes: 3, createdAt: '', streamUrl: '', description: '' },
    { id: 2, name: 'b', category: 'chill', likes: 12, createdAt: '', streamUrl: '', description: '' },
    { id: 3, name: 'c', category: 'lofi', likes: 25, createdAt: '', streamUrl: '', description: '' },
  ];
  it('minLikes ≤ 0 返回全部', () => {
    expect(filterStationsByLikes(stations, 0)).toHaveLength(3);
    expect(filterStationsByLikes(stations, -1)).toHaveLength(3);
  });
  it('仅保留 ≥ 阈值的电台', () => {
    expect(filterStationsByLikes(stations, 10).map((s) => s.id)).toEqual([2, 3]);
    expect(filterStationsByLikes(stations, 20).map((s) => s.id)).toEqual([3]);
  });
  it('无命中返回空数组', () => {
    expect(filterStationsByLikes(stations, 100)).toEqual([]);
  });
  it('不修改入参', () => {
    const before = stations.map((s) => s.id);
    filterStationsByLikes(stations, 10);
    expect(stations.map((s) => s.id)).toEqual(before);
  });
});

describe('summarizeStations', () => {
  const stations: Station[] = [
    { id: 1, name: 'a', category: 'lofi', likes: 3, createdAt: '', streamUrl: '', description: '' },
    { id: 2, name: 'b', category: 'chill', likes: 12, createdAt: '', streamUrl: '', description: '' },
    { id: 3, name: 'c', category: 'lofi', likes: 25, createdAt: '', streamUrl: '', description: '' },
  ];
  it('统计总数、分类数、总点赞数', () => {
    expect(summarizeStations(stations)).toEqual({ total: 3, categories: 2, totalLikes: 40 });
  });
  it('空列表返回全零', () => {
    expect(summarizeStations([])).toEqual({ total: 0, categories: 0, totalLikes: 0 });
  });
  it('忽略缺失分类与点赞', () => {
    const messy: Station[] = [
      { id: 1, name: 'x', category: '', likes: 0, createdAt: '', streamUrl: '', description: '' },
      { id: 2, name: 'y', category: '', likes: 0, createdAt: '', streamUrl: '', description: '' },
    ];
    expect(summarizeStations(messy)).toEqual({ total: 2, categories: 0, totalLikes: 0 });
  });
  it('不修改入参', () => {
    const before = stations.map((s) => s.id);
    summarizeStations(stations);
    expect(stations.map((s) => s.id)).toEqual(before);
  });
});

describe('formatCount', () => {
  it('千以下原样', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });
  it('千位用 k，去掉 .0', () => {
    expect(formatCount(1000)).toBe('1k');
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(12345)).toBe('12k');
  });
  it('百万位用 M，去掉 .0', () => {
    expect(formatCount(1_000_000)).toBe('1M');
    expect(formatCount(2_500_000)).toBe('2.5M');
  });
  it('负数与非法值', () => {
    expect(formatCount(-5)).toBe('-5');
    expect(formatCount(Number.NaN)).toBe('0');
  });
});

describe('formatClock', () => {
  it('不足一分钟显示 m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(45)).toBe('0:45');
  });
  it('分钟级', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(600)).toBe('10:00');
  });
  it('小时级', () => {
    expect(formatClock(3661)).toBe('1:01:01');
  });
  it('非法 / 负数按 0:00', () => {
    expect(formatClock(-3)).toBe('0:00');
    expect(formatClock(Number.NaN)).toBe('0:00');
  });
});
