import { describe, it, expect } from 'vitest';
import { categoryLabel, truncate, filterStations, sortStations, groupStationsByCategory } from './station';
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
