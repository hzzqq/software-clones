import { describe, it, expect } from 'vitest';
import { formatBytes, formatDateTime } from './format';

describe('formatBytes', () => {
  it('handles zero and negative-ish input safely', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });

  it('renders plain bytes below 1KB without decimals', () => {
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('converts to KB with one decimal', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10 * 1024)).toBe('10.0 KB');
  });

  it('converts to MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('converts to GB', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });
});

describe('formatDateTime', () => {
  it('formats a valid ISO string into YYYY-MM-DD HH:mm', () => {
    const iso = new Date(2026, 2, 25, 14, 5).toISOString();
    expect(formatDateTime(iso)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('returns placeholder for invalid input', () => {
    expect(formatDateTime('not-a-date')).toBe('—');
    expect(formatDateTime('')).toBe('—');
  });
});
