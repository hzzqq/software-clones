import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './time';

const NOW = new Date('2025-01-15T12:00:00').getTime();

describe('formatRelativeTime', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(formatRelativeTime(null, NOW)).toBe('');
    expect(formatRelativeTime(undefined, NOW)).toBe('');
    expect(formatRelativeTime('', NOW)).toBe('');
  });

  it('returns empty string for unparseable date strings', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('');
  });

  it('formats "just now" within a minute', () => {
    expect(formatRelativeTime('2025-01-15T11:59:30', NOW)).toBe('刚刚');
  });

  it('formats minutes ago', () => {
    expect(formatRelativeTime('2025-01-15T11:30:00', NOW)).toBe('30 分钟前');
  });

  it('formats hours ago', () => {
    expect(formatRelativeTime('2025-01-15T09:00:00', NOW)).toBe('3 小时前');
  });

  it('formats days ago', () => {
    expect(formatRelativeTime('2025-01-13T12:00:00', NOW)).toBe('2 天前');
  });

  it('falls back to absolute date beyond 7 days', () => {
    expect(formatRelativeTime('2025-01-01T08:00:00', NOW)).toBe('2025-01-01');
  });

  it('falls back to absolute date for future timestamps', () => {
    expect(formatRelativeTime('2025-02-01T08:00:00', NOW)).toBe('2025-02-01');
  });

  it('accepts numeric (epoch ms) input', () => {
    expect(formatRelativeTime(NOW - 2 * 3_600_000, NOW)).toBe('2 小时前');
  });
});
