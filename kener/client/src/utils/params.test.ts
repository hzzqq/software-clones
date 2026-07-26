import { describe, it, expect } from 'vitest';
import { parseIdParam } from './params';

describe('parseIdParam', () => {
  it('合法正整数', () => {
    expect(parseIdParam('12')).toBe(12);
  });
  it('undefined / null / 空串 → null', () => {
    expect(parseIdParam(undefined)).toBeNull();
    expect(parseIdParam(null)).toBeNull();
    expect(parseIdParam('')).toBeNull();
    expect(parseIdParam('  ')).toBeNull();
  });
  it('非数字 → null', () => {
    expect(parseIdParam('abc')).toBeNull();
  });
  it('负数 / 0 / 小数 → null', () => {
    expect(parseIdParam('-3')).toBeNull();
    expect(parseIdParam('0')).toBeNull();
    expect(parseIdParam('12.5')).toBeNull();
  });
});
