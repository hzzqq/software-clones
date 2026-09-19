import crypto from 'crypto';

/**
 * 短码生成与文件名清洗工具（复制自 fileshare，零额外依赖）。
 */

/** 去掉易混淆字符（0/O/1/l/I）的字母表，避免短码手抄/口头传递出错。 */
export const CODE_ALPHABET: string =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * 生成随机的短分享码。
 * @param length 码长，默认 8
 */
export function generateCode(length: number = 8): string {
  const len = Math.max(4, Math.min(16, length));
  const bytes = crypto.randomBytes(len);
  let code = '';
  for (let i = 0; i < len; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/**
 * 清洗上传文件名：去路径分隔符、控制字符、截断到 200 字符、空名回退 "unnamed"。
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
  const ext = cleaned.slice(dot).slice(0, 20);
  return `${name}${ext}`;
}
