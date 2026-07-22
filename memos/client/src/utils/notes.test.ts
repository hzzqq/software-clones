import { describe, it, expect } from 'vitest';
import { parseTags, formatRelativeTime, visibilityLabel } from './notes';
import { Visibility } from '../types';

describe('parseTags', () => {
  it('extracts #tags and @mentions lower-cased and de-duped', () => {
    expect(parseTags('hello #Work and #work @alice #Plan')).toEqual([
      'work',
      'alice',
      'plan',
    ]);
  });
  it('returns empty for plain text', () => {
    expect(parseTags('just a normal note')).toEqual([]);
  });
});

describe('visibilityLabel', () => {
  it('maps values to Chinese labels', () => {
    expect(visibilityLabel('public' as Visibility)).toBe('公开');
    expect(visibilityLabel('protected' as Visibility)).toBe('受限');
    expect(visibilityLabel('private' as Visibility)).toBe('私有');
  });
});

describe('formatRelativeTime', () => {
  it('returns 刚刚 for < 1 min', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('刚刚');
  });
  it('formats minutes / hours / days', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 5 * 60 * 1000).toISOString())).toBe('5 分钟前');
    expect(formatRelativeTime(new Date(now - 3 * 3600 * 1000).toISOString())).toBe('3 小时前');
    expect(formatRelativeTime(new Date(now - 2 * 86400 * 1000).toISOString())).toBe('2 天前');
  });
  it('formats months and years', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 60 * 86400 * 1000).toISOString())).toBe('2 个月前');
    expect(formatRelativeTime(new Date(now - 400 * 86400 * 1000).toISOString())).toBe('1 年前');
  });
  it('returns empty string for invalid input', () => {
    expect(formatRelativeTime('')).toBe('');
    expect(formatRelativeTime('not-a-date')).toBe('');
  });
  it('treats future timestamps as 刚刚 (clock skew guard)', () => {
    const future = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(future)).toBe('刚刚');
  });
});
