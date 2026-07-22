import { describe, it, expect } from 'vitest';
import { categoryLabel, truncate } from './station';

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
