import crypto from 'crypto';

/**
 * 短码生成工具（复用自 fileshare）。
 */

/** 去掉易混淆字符（0/O/1/l/I）的字母表，避免短码手抄/口头传递出错。 */
export const CODE_ALPHABET: string = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * 生成随机的短分享码。
 * @param length 码长，默认 6
 */
export function generateCode(length: number = 6): string {
  const len = Math.max(4, Math.min(12, length));
  const bytes = crypto.randomBytes(len);
  let code = '';
  for (let i = 0; i < len; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}
