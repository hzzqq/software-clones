import { describe, it, expect } from 'vitest';
import { sanitizeNickname, randomGuestName } from './nickname';

describe('sanitizeNickname', () => {
  it('trims whitespace and collapses internal spaces', () => {
    expect(sanitizeNickname('  Alice  ')).toBe('Alice');
    expect(sanitizeNickname('a   b')).toBe('a b');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeNickname('')).toBe('');
    expect(sanitizeNickname('   ')).toBe('');
    expect(sanitizeNickname(null as unknown as string)).toBe('');
  });

  it('caps length at 24 chars', () => {
    const long = 'x'.repeat(100);
    expect(sanitizeNickname(long)).toHaveLength(24);
  });
});

describe('randomGuestName', () => {
  it('produces a guest-style nickname', () => {
    const name = randomGuestName();
    expect(name).toMatch(/^游客\d{4}$/);
  });

  it('produces varied names across calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      seen.add(randomGuestName());
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
