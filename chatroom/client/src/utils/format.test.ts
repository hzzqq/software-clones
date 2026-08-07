import { describe, it, expect } from 'vitest';
import { formatMessageTime } from './format';

describe('formatMessageTime', () => {
  it('formats a valid ISO time', () => {
    const iso = new Date(2026, 2, 25, 14, 5).toISOString();
    const out = formatMessageTime(iso);
    expect(out).toMatch(/^\d{2}:\d{2}$|^\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('returns placeholder for invalid input', () => {
    expect(formatMessageTime('not-a-date')).toBe('—');
    expect(formatMessageTime('')).toBe('—');
  });
});
