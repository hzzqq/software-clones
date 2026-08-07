import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  buildShortUrl,
  formatDateTime,
  formatClicks,
} from './shortLink';

describe('normalizeUrl', () => {
  it('keeps a valid http url', () => {
    expect(normalizeUrl('http://example.com/a')).toBe('http://example.com/a');
  });

  it('keeps a valid https url', () => {
    expect(normalizeUrl('https://example.com/a?q=1')).toBe('https://example.com/a?q=1');
  });

  it('prepends https:// when scheme is missing', () => {
    expect(normalizeUrl('example.com/x')).toBe('https://example.com/x');
  });

  it('trims whitespace', () => {
    expect(normalizeUrl('  https://example.com/  ')).toBe('https://example.com/');
  });

  it('rejects invalid urls', () => {
    expect(normalizeUrl('not a url')).toBe('');
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
  });

  it('rejects non-http protocols', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBe('');
    expect(normalizeUrl('ftp://example.com')).toBe('');
  });
});

describe('buildShortUrl', () => {
  it('joins base and code without double slashes', () => {
    expect(buildShortUrl('abc123', 'http://localhost:5193')).toBe(
      'http://localhost:5193/abc123'
    );
  });

  it('strips trailing slashes from base', () => {
    expect(buildShortUrl('abc123', 'http://localhost:5193///')).toBe(
      'http://localhost:5193/abc123'
    );
  });

  it('encodes special characters in the code', () => {
    expect(buildShortUrl('a/b', 'http://localhost:5193')).toBe(
      'http://localhost:5193/a%2Fb'
    );
  });

  it('falls back to a default base', () => {
    expect(buildShortUrl('abc123')).toMatch(/\/abc123$/);
  });
});

describe('formatDateTime', () => {
  it('formats an ISO timestamp in local time', () => {
    // 固定一个明确可解析的时间，仅校验格式骨架。
    expect(formatDateTime('2024-06-01T08:30:00.000Z')).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
    );
  });

  it('returns empty string for invalid input', () => {
    expect(formatDateTime('not-a-date')).toBe('');
    expect(formatDateTime('')).toBe('');
  });
});

describe('formatClicks', () => {
  it('shows small numbers verbatim', () => {
    expect(formatClicks(0)).toBe('0');
    expect(formatClicks(42)).toBe('42');
    expect(formatClicks(999)).toBe('999');
  });

  it('compacts thousands', () => {
    expect(formatClicks(1000)).toBe('1k');
    expect(formatClicks(1234)).toBe('1.2k');
    expect(formatClicks(12500)).toBe('12.5k');
  });

  it('compacts millions', () => {
    expect(formatClicks(2_000_000)).toBe('2M');
    expect(formatClicks(3_400_000)).toBe('3.4M');
  });
});
