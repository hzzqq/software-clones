/**
 * 罗马数字与阿拉伯数字互转（标准减法记法，范围 1 ~ 3999）。
 * 纯函数、可单测。
 */

const ROMAN_MAP: Array<{ value: number; symbol: string }> = [
  { value: 1000, symbol: 'M' },
  { value: 900, symbol: 'CM' },
  { value: 500, symbol: 'D' },
  { value: 400, symbol: 'CD' },
  { value: 100, symbol: 'C' },
  { value: 90, symbol: 'XC' },
  { value: 50, symbol: 'L' },
  { value: 40, symbol: 'XL' },
  { value: 10, symbol: 'X' },
  { value: 9, symbol: 'IX' },
  { value: 5, symbol: 'V' },
  { value: 4, symbol: 'IV' },
  { value: 1, symbol: 'I' },
];

/** 阿拉伯数字（1~3999）→ 罗马数字。越界或非法返回 null。 */
export function arabicToRoman(input: number): string | null {
  if (!Number.isInteger(input) || input < 1 || input > 3999) {
    return null;
  }
  let n = input;
  let out = '';
  for (const { value, symbol } of ROMAN_MAP) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

/** 罗马数字（仅 I~M 大写）→ 阿拉伯数字；非法返回 null。 */
export function romanToArabic(input: string): number | null {
  const roman = (input || '').trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(roman)) return null;
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  let prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const cur = values[roman[i]];
    if (cur < prev) {
      total -= cur;
    } else {
      total += cur;
      prev = cur;
    }
  }
  // 交叉校验：转回去应当一致，确保是合法减法记法（排除 IIII、VX 等）。
  return arabicToRoman(total) === roman ? total : null;
}

/** 校验是否为合法罗马数字字符串。 */
export function isValidRoman(input: string): boolean {
  return romanToArabic(input) !== null;
}
