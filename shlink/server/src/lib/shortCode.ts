import { randomBytes } from 'crypto';

/**
 * 短码生成算法（纯函数 + 随机源）。
 *
 * 短码字母表使用 URL 安全的 62 个字符（数字 + 小写 + 大写），
 * 默认长度 6 位，空间为 62^6 ≈ 568 亿，足以支撑单机演示规模；
 * 生成时用 crypto.randomBytes 取真随机字节，并做取模映射。
 *
 * 碰撞防护不在本模块内（由 repository 在插入时以唯一索引 + 重试兜底），
 * 本模块只负责「生成一个合法、随机的短码」。
 */

export const SHORT_CODE_ALPHABET: string =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const SHORT_CODE_LENGTH = 6;

/** 校验一个短码是否只包含合法字符（用于对外部输入做防御）。 */
export function isValidShortCode(code: string): boolean {
  if (!code || code.length === 0) return false;
  for (const ch of code) {
    if (!SHORT_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * 生成一个随机短码。
 * @param length 目标长度（默认 6，最小 1；超出字母表长度的长度也支持，只是重复率上升）
 */
export function randomShortCode(length: number = SHORT_CODE_LENGTH): string {
  const n = Math.max(1, Math.floor(length));
  const bytes = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i += 1) {
    out += SHORT_CODE_ALPHABET[bytes[i] % SHORT_CODE_ALPHABET.length];
  }
  return out;
}

/**
 * 生成一个不与现有 code 集合冲突的短码。
 * @param isTaken 判断某个候选码是否已被占用（幂等、可重入）
 * @param maxAttempts 最大尝试次数，防止极端情况下死循环
 */
export function generateUniqueShortCode(
  isTaken: (code: string) => boolean,
  maxAttempts: number = 10,
): string {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = randomShortCode();
    if (!isTaken(candidate)) return candidate;
  }
  // 极小概率全撞车：长度 +1 再试一轮，几乎不可能再失败。
  return randomShortCode(SHORT_CODE_LENGTH + 1);
}
