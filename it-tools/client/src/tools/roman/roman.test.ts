import { describe, it, expect } from 'vitest';
import { arabicToRoman, romanToArabic, isValidRoman } from './roman';

describe('roman', () => {
  it('阿拉伯 → 罗马 经典值', () => {
    expect(arabicToRoman(1)).toBe('I');
    expect(arabicToRoman(4)).toBe('IV');
    expect(arabicToRoman(9)).toBe('IX');
    expect(arabicToRoman(2024)).toBe('MMXXIV');
    expect(arabicToRoman(3999)).toBe('MMMCMXCIX');
  });

  it('越界或非整数返回 null', () => {
    expect(arabicToRoman(0)).toBeNull();
    expect(arabicToRoman(4000)).toBeNull();
    expect(arabicToRoman(3.5)).toBeNull();
  });

  it('罗马 → 阿拉伯', () => {
    expect(romanToArabic('I')).toBe(1);
    expect(romanToArabic('IV')).toBe(4);
    expect(romanToArabic('MMXXIV')).toBe(2024);
    expect(romanToArabic('mmmcmxcix')).toBe(3999);
  });

  it('非法罗马数字返回 null（排除 IIII、VX 等）', () => {
    expect(romanToArabic('IIII')).toBeNull();
    expect(romanToArabic('VX')).toBeNull();
    expect(romanToArabic('ABC')).toBeNull();
    expect(romanToArabic('')).toBeNull();
  });

  it('isValidRoman 与 romanToArabic 一致', () => {
    expect(isValidRoman('MMXXIV')).toBe(true);
    expect(isValidRoman('IIII')).toBe(false);
  });
});
