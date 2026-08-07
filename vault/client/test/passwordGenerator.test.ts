import { describe, it, expect } from 'vitest';
import {
  generatePassword,
  buildCharset,
  shuffle,
  validateOptions,
  DEFAULT_PASSWORD_OPTIONS,
  PASSWORD_LENGTH_MIN,
  PASSWORD_LENGTH_MAX,
} from '../src/utils/passwordGenerator';

describe('passwordGenerator', () => {
  it('生成指定长度的密码', () => {
    for (const len of [8, 16, 32, 64]) {
      const pwd = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: len });
      expect(pwd.length).toBe(len);
    }
  });

  it('保证每个勾选的字符集至少出现一次', () => {
    const pwd = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 12 });
    expect(/[A-Z]/.test(pwd)).toBe(true);
    expect(/[a-z]/.test(pwd)).toBe(true);
    expect(/[0-9]/.test(pwd)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(pwd)).toBe(true);
  });

  it('未勾选的字符集不会出现', () => {
    const pwd = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, uppercase: false, symbols: false, length: 12 });
    expect(/[A-Z]/.test(pwd)).toBe(false);
    expect(/[^a-z0-9]/.test(pwd)).toBe(false);
  });

  it('排除易混淆字符', () => {
    const pwd = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, excludeAmbiguous: true, length: 32 });
    for (const ch of pwd) {
      expect('Il1O0o'.includes(ch)).toBe(false);
    }
  });

  it('buildCharset 尊重排除项', () => {
    const pool = buildCharset({ ...DEFAULT_PASSWORD_OPTIONS, excludeAmbiguous: true });
    expect(pool.includes('I')).toBe(false);
    expect(pool.includes('l')).toBe(false);
    expect(pool.includes('0')).toBe(false);
    expect(pool.includes('A')).toBe(true);
  });

  it('随机性：两次生成的密码基本不同', () => {
    const a = generatePassword(DEFAULT_PASSWORD_OPTIONS);
    const b = generatePassword(DEFAULT_PASSWORD_OPTIONS);
    expect(a).not.toBe(b);
  });

  it('shuffle 保持元素集合不变', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = shuffle(arr);
    expect([...shuffled].sort()).toEqual([...arr].sort());
  });

  it('validateOptions 拒绝非法参数', () => {
    expect(validateOptions({ ...DEFAULT_PASSWORD_OPTIONS, length: PASSWORD_LENGTH_MIN - 1 }).ok).toBe(false);
    expect(validateOptions({ ...DEFAULT_PASSWORD_OPTIONS, length: PASSWORD_LENGTH_MAX + 1 }).ok).toBe(false);
    expect(
      validateOptions({ ...DEFAULT_PASSWORD_OPTIONS, uppercase: false, lowercase: false, digits: false, symbols: false }).ok
    ).toBe(false);
    // 长度小于勾选的字符集数量
    expect(validateOptions({ ...DEFAULT_PASSWORD_OPTIONS, length: 2 }).ok).toBe(false);
  });

  it('validateOptions 接受合法参数', () => {
    expect(validateOptions(DEFAULT_PASSWORD_OPTIONS).ok).toBe(true);
    expect(validateOptions({ ...DEFAULT_PASSWORD_OPTIONS, length: PASSWORD_LENGTH_MIN }).ok).toBe(true);
  });

  it('generatePassword 对非法参数抛错', () => {
    expect(() =>
      generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, uppercase: false, lowercase: false, digits: false, symbols: false })
    ).toThrow();
  });
});
