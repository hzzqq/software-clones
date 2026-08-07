import crypto from 'crypto';

/**
 * 短码生成与文件名清洗工具。
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
 * 清洗上传文件名：
 *  - 去掉路径分隔符（防目录穿越）；
 *  - 去掉控制字符与首尾空白；
 *  - 截断到 200 字符，保留扩展名；
 *  - 空名回退为 "unnamed"。
 *
 * @param raw 客户端提供的原始文件名
 * @returns 安全文件名
 */
export function sanitizeFileName(raw: string): string {
  const cleaned = String(raw ?? '')
    .replace(/[\\/]/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  if (!cleaned) {
    return 'unnamed';
  }
  if (cleaned.length <= 200) {
    return cleaned;
  }
  const dot = cleaned.lastIndexOf('.');
  const name = cleaned.slice(0, 200);
  if (dot <= 0 || dot >= cleaned.length - 1) {
    return name;
  }
  // 截断时尽量保留扩展名（最多 20 字符）。
  const ext = cleaned.slice(dot).slice(0, 20);
  return `${name}${ext}`;
}
