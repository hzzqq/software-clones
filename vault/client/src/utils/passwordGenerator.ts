/**
 * 随机密码生成器（零依赖，基于 Web Crypto / node:crypto 的 crypto.getRandomValues）。
 *
 * 特性：
 * - 可配置长度（8–64）与字符集（大写 / 小写 / 数字 / 符号）；
 * - 保证每个勾选的字符集至少出现 1 个字符（避免「勾了数字却一个数字都没有」）；
 * - 可排除易混淆字符（Il1O0o 等）；
 * - 输出经过洗牌，避免「固定前缀 + 随机尾巴」的可预测结构。
 */

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
};

export const PASSWORD_LENGTH_MIN = 8;
export const PASSWORD_LENGTH_MAX = 64;

const CHARS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
} as const;

/** 视觉上容易混淆的字符（含数字 0/1 与字母 O/o/I/l 等）。 */
const AMBIGUOUS_CHARS = new Set('Il1O0o`´‘’"\'|');

function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % maxExclusive;
}

export function validateOptions(options: PasswordOptions): { ok: boolean; error?: string } {
  if (!Number.isInteger(options.length) || options.length < PASSWORD_LENGTH_MIN || options.length > PASSWORD_LENGTH_MAX) {
    return { ok: false, error: `长度需在 ${PASSWORD_LENGTH_MIN}–${PASSWORD_LENGTH_MAX} 之间` };
  }
  const enabledCount = [options.uppercase, options.lowercase, options.digits, options.symbols].filter(Boolean).length;
  if (enabledCount === 0) {
    return { ok: false, error: '至少勾选一种字符集' };
  }
  if (options.length < enabledCount) {
    return { ok: false, error: `长度不能小于已勾选字符集数量（${enabledCount}）` };
  }
  return { ok: true };
}

/** 构建可用字符池（已排除易混淆字符）。 */
export function buildCharset(options: PasswordOptions): string {
  const groups: string[] = [];
  if (options.uppercase) groups.push(CHARS.uppercase);
  if (options.lowercase) groups.push(CHARS.lowercase);
  if (options.digits) groups.push(CHARS.digits);
  if (options.symbols) groups.push(CHARS.symbols);

  const pool = groups.join('');
  if (!options.excludeAmbiguous) return pool;
  return pool
    .split('')
    .filter((ch) => !AMBIGUOUS_CHARS.has(ch))
    .join('');
}

/** 洗牌（Fisher–Yates，使用安全随机源）。 */
export function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * 生成随机密码。
 * 保证每个启用的字符集至少出现一次，随后用随机字符填充至目标长度，最后洗牌。
 */
export function generatePassword(options: PasswordOptions): string {
  const validation = validateOptions(options);
  if (!validation.ok) {
    throw new Error(validation.error ?? '密码参数不合法');
  }

  const pool = buildCharset(options);
  const groups: string[] = [];
  if (options.uppercase) groups.push(CHARS.uppercase);
  if (options.lowercase) groups.push(CHARS.lowercase);
  if (options.digits) groups.push(CHARS.digits);
  if (options.symbols) groups.push(CHARS.symbols);
  const filteredGroups = options.excludeAmbiguous
    ? groups.map((g) => g.split('').filter((ch) => !AMBIGUOUS_CHARS.has(ch)).join('')).filter((g) => g.length > 0)
    : groups;

  if (filteredGroups.length === 0) {
    throw new Error('至少勾选一种字符集');
  }

  const chars: string[] = [];
  // 每个启用的字符集至少贡献 1 个字符。
  for (const group of filteredGroups) {
    chars.push(group[secureRandomInt(group.length)]);
  }
  // 剩余长度从完整池中随机填充。
  while (chars.length < options.length) {
    chars.push(pool[secureRandomInt(pool.length)]);
  }
  return shuffle(chars).join('');
}
