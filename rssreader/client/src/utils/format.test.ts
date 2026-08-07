import { describe, it, expect } from 'vitest';
import { formatDateTime, relativeTime, stripHtml, truncate } from './format';

describe('formatDateTime', () => {
  it('formats ISO to local YYYY-MM-DD HH:mm', () => {
    expect(formatDateTime('2024-06-01T08:30:00.000Z')).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
    );
  });

  it('returns empty for invalid input', () => {
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime('nope')).toBe('');
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2024-06-01T12:00:00Z');

  it('handles future / just now', () => {
    expect(relativeTime('2024-06-01T12:00:30Z', now)).toBe('刚刚');
    expect(relativeTime('2024-06-01T11:59:40Z', now)).toBe('刚刚');
  });

  it('formats minutes / hours / days', () => {
    expect(relativeTime('2024-06-01T11:30:00Z', now)).toBe('30 分钟前');
    expect(relativeTime('2024-06-01T08:00:00Z', now)).toBe('4 小时前');
    expect(relativeTime('2024-05-30T12:00:00Z', now)).toBe('2 天前');
  });

  it('formats months / years', () => {
    expect(relativeTime('2024-01-01T12:00:00Z', now)).toBe('5 个月前');
    expect(relativeTime('2020-06-01T12:00:00Z', now)).toBe('4 年前');
  });

  it('returns empty for invalid input', () => {
    expect(relativeTime('')).toBe('');
  });
});

describe('stripHtml', () => {
  it('removes tags and decodes common entities', () => {
    expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    expect(stripHtml('a &amp; b')).toBe('a & b');
    expect(stripHtml('&lt;tag&gt;')).toBe('<tag>');
  });

  it('collapses whitespace', () => {
    expect(stripHtml('<p>a</p>\n<p>b</p>')).toBe('a b');
  });

  it('handles empty input', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('truncate', () => {
  it('truncates long text with ellipsis', () => {
    expect(truncate('a'.repeat(200), 10)).toBe('aaaaaaaaa…');
  });

  it('keeps short text unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });
});
