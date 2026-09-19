import crypto from 'crypto';

/**
 * 短码生成与文件名清洗工具（复用 fileshare 方案）。
 */

/** 去掉易混淆字符（0/O/1/l/I）的字母表，避免短码手抄/口头传递出错。 */
export const CODE_ALPHABET: string = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * 生成随机的短分享码。
 *
 * @param length 码长，默认 6
 * @returns 例如 "Kx7mQz"
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

/**
 * 清洗路径片段（防目录穿越）：去掉路径分隔符与控制字符，截断到 200 字符。
 */
export function sanitizeSegment(raw: string): string {
  const cleaned = String(raw ?? '')
    .replace(/[\\/]/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  return cleaned.slice(0, 200);
}
