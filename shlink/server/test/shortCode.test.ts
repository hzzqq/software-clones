import { describe, it, expect } from 'vitest';
import {
  SHORT_CODE_ALPHABET,
  SHORT_CODE_LENGTH,
  randomShortCode,
  isValidShortCode,
  generateUniqueShortCode,
} from '../src/lib/shortCode';

describe('shortCode 生成算法', () => {
  it('生成默认长度 6 的短码', () => {
    expect(randomShortCode()).toHaveLength(SHORT_CODE_LENGTH);
    expect(randomShortCode()).toHaveLength(6);
  });

  it('生成指定长度的短码', () => {
    expect(randomShortCode(4)).toHaveLength(4);
    expect(randomShortCode(10)).toHaveLength(10);
  });

  it('短码只包含合法字符', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = randomShortCode();
      for (const ch of code) {
        expect(SHORT_CODE_ALPHABET).toContain(ch);
      }
    }
  });

  it('isValidShortCode 正确校验', () => {
    expect(isValidShortCode('abc123')).toBe(true);
    expect(isValidShortCode('ABC_1')).toBe(false);
    expect(isValidShortCode('')).toBe(false);
    expect(isValidShortCode('abc 123')).toBe(false);
  });

  it('批量生成不碰撞（10k 次）', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i += 1) {
      const code = randomShortCode();
      expect(seen.has(code)).toBe(false);
      seen.add(code);
    }
  });

  it('generateUniqueShortCode 会避开已占用的码', () => {
    const taken = new Set(['abc123']);
    const code = generateUniqueShortCode((c) => taken.has(c), 5);
    expect(taken.has(code)).toBe(false);
  });

  it('generateUniqueShortCode 全部占用时自动加长重试', () => {
    // 永远返回 true：模拟极端全碰撞，此时应回退为长度 7 的码。
    const code = generateUniqueShortCode(() => true, 3);
    expect(code.length).toBe(SHORT_CODE_LENGTH + 1);
  });
});
