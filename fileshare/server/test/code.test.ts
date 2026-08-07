import { describe, it, expect } from 'vitest';
import { generateCode, sanitizeFileName, CODE_ALPHABET } from '../src/lib/code';

describe('generateCode', () => {
  it('produces codes of the requested length', () => {
    expect(generateCode(6)).toHaveLength(6);
    expect(generateCode(8)).toHaveLength(8);
  });

  it('only uses unambiguous alphabet characters', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateCode(8);
      for (const ch of code) {
        expect(CODE_ALPHABET).toContain(ch);
      }
    }
  });

  it('produces distinct codes in practice', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      seen.add(generateCode(6));
    }
    expect(seen.size).toBe(500);
  });
});

describe('sanitizeFileName', () => {
  it('strips path separators to prevent traversal', () => {
    expect(sanitizeFileName('../../etc/passwd')).not.toContain('/');
    expect(sanitizeFileName('..\\..\\windows\\system32')).not.toContain('\\');
  });

  it('falls back to unnamed for empty input', () => {
    expect(sanitizeFileName('')).toBe('unnamed');
    expect(sanitizeFileName('   ')).toBe('unnamed');
    expect(sanitizeFileName('\u0000')).toBe('unnamed');
  });

  it('truncates very long names and keeps extension', () => {
    const long = 'a'.repeat(300) + '.txt';
    const out = sanitizeFileName(long);
    expect(out.length).toBeLessThanOrEqual(220);
    expect(out.endsWith('.txt')).toBe(true);
  });
});
