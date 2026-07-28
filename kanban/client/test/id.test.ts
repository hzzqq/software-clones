import { describe, it, expect } from 'vitest';
import { parseIdParam } from '../src/utils/id';

describe('parseIdParam', () => {
  it('合法数字字符串解析为 id', () => {
    expect(parseIdParam('42')).toBe(42);
    expect(parseIdParam('7')).toBe(7);
  });
  it('缺失 / 空串 / 空白 返回 null', () => {
    expect(parseIdParam(undefined)).toBeNull();
    expect(parseIdParam(null)).toBeNull();
    expect(parseIdParam('')).toBeNull();
    expect(parseIdParam('   ')).toBeNull();
  });
  it('非数字 / NaN / 非整数 / <=0 返回 null', () => {
    expect(parseIdParam('abc')).toBeNull();
    expect(parseIdParam('12.5')).toBeNull();
    expect(parseIdParam('0')).toBeNull();
    expect(parseIdParam('-3')).toBeNull();
  });
});
