import crypto from 'crypto';

/**
 * 密码哈希工具：使用 Node 内置 scrypt，无需额外依赖。
 * 存储格式：`salt$hash`（均为十六进制，salt 为 16 字节 = 32 个十六进制字符）。
 */
const SALT_BYTES = 16;
const SALT_HEX_LEN = SALT_BYTES * 2; // 32
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}$${hash}`;
}

/**
 * 校验密码。
 *
 * 兼容性说明：早期版本因模板串漏写 `$`，写入过 `salt+hash` 无分隔符的记录
 * （导致任何密码都验不过）。这里对无分隔符的旧数据按定长 salt 回退切分，
 * 使既有账号仍可正常登录。
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (typeof stored !== 'string' || stored.length === 0) return false;

  let salt: string;
  let hash: string;
  const sep = stored.indexOf('$');
  if (sep >= 0) {
    salt = stored.slice(0, sep);
    hash = stored.slice(sep + 1);
  } else if (stored.length === SALT_HEX_LEN + KEY_LEN * 2) {
    // 旧格式回退：前 32 字符是 salt，其余是 hash
    salt = stored.slice(0, SALT_HEX_LEN);
    hash = stored.slice(SALT_HEX_LEN);
  } else {
    return false;
  }
  if (!salt || !hash) return false;

  const candidate = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  if (candidate.length !== hash.length) return false;
  // 定长比较，避免时序侧信道
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ candidate.charCodeAt(i);
  }
  return diff === 0;
}
