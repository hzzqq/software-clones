/**
 * Chmod 权限计算器：数字（如 755）与符号（如 rwxr-xr-x）互转。
 * 纯函数、可单测。
 */

/** 3 位权限 → 符号串映射（有序：---, --x, -w-, ... rwx）。 */
const SYMBOLS = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];

export interface ChmodClass {
  /** 用户类别：owner / group / other。 */
  cls: 'owner' | 'group' | 'other';
  /** 符号串，如 rwx。 */
  symbol: string;
  /** 该类别的数字（0~7）。 */
  value: number;
  /** 读 / 写 / 执行布尔。 */
  read: boolean;
  write: boolean;
  execute: boolean;
}

/** 数字权限（0~0777）→ 符号串（9 字符，如 rwxr-xr-x）。 */
export function permissionsToSymbolic(mode: number): string {
  const m = Math.trunc(mode);
  if (!Number.isInteger(m) || m < 0 || m > 0o777) {
    throw new Error('权限必须是 0~777 之间的整数');
  }
  const owner = (m >> 6) & 7;
  const group = (m >> 3) & 7;
  const other = m & 7;
  return SYMBOLS[owner] + SYMBOLS[group] + SYMBOLS[other];
}

/** 符号串（9 字符）→ 数字权限；非法返回 null。 */
export function symbolicToPermissions(symbol: string): number | null {
  const sym = (symbol || '').trim();
  if (!/^[rwx-]{9}$/.test(sym)) return null;
  const a = SYMBOLS.indexOf(sym.slice(0, 3));
  const b = SYMBOLS.indexOf(sym.slice(3, 6));
  const c = SYMBOLS.indexOf(sym.slice(6, 9));
  if (a < 0 || b < 0 || c < 0) return null;
  return (a << 6) | (b << 3) | c;
}

/** 解析用户输入：可接受 "755" 或 "rwxr-xr-x"，返回数字权限；失败返回 null。 */
export function parseChmod(input: string): number | null {
  const s = (input || '').trim();
  if (/^\d{1,4}$/.test(s)) {
    const n = Number(s);
    if (n >= 0 && n <= 0o7777) return n & 0o777;
    return null;
  }
  return symbolicToPermissions(s);
}

/** 数字权限的逐类别拆分（含布尔权限）。 */
export function describeChmod(mode: number): ChmodClass[] {
  const m = Math.trunc(mode) & 0o777;
  const classes: Array<ChmodClass['cls']> = ['owner', 'group', 'other'];
  const shifts = [6, 3, 0];
  return classes.map((cls, i) => {
    const value = (m >> shifts[i]) & 7;
    const symbol = SYMBOLS[value];
    return {
      cls,
      symbol,
      value,
      read: (value & 4) === 4,
      write: (value & 2) === 2,
      execute: (value & 1) === 1,
    };
  });
}

/** 校验字符串是否为合法符号权限。 */
export function isValidSymbolic(symbol: string): boolean {
  return symbolicToPermissions(symbol) !== null;
}
