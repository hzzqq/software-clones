import { describe, it, expect } from 'vitest';
import { categoryLabel, truncate, filterStations } from './station';
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
