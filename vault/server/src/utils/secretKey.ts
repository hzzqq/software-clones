/**
 * 密钥装配：优先使用 SECRET 环境变量派生；否则读取 / 生成 data/secret.key。
 * 独立于 crypto.ts 的纯函数，使加解密本身可被无副作用地单测。
 */

import fs from 'fs';
import path from 'path';
import { DATA_DIR, SECRET } from '../config';
import { deriveKeyFromSecret, generateKey, KEY_LENGTH } from './crypto';

let cachedKey: Buffer | null = null;

/** 获取当前进程使用的 32 字节加密密钥（惰性加载 + 缓存）。 */
export function getSecretKey(): Buffer {
  if (cachedKey) return cachedKey;

  if (SECRET && SECRET.trim()) {
    cachedKey = deriveKeyFromSecret(SECRET.trim());
    return cachedKey;
  }

  const keyPath = path.join(DATA_DIR, 'secret.key');
  if (fs.existsSync(keyPath)) {
    const raw = fs.readFileSync(keyPath);
    if (raw.length === KEY_LENGTH) {
      cachedKey = raw;
      return cachedKey;
    }
  }

  const key = generateKey();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(keyPath, key, { flag: 'w' });
  try {
    fs.chmodSync(keyPath, 0o600);
  } catch {
    /* Windows 无 POSIX 权限位，忽略 */
  }
  cachedKey = key;
  return cachedKey;
}

/** 仅供测试重置缓存（切换 SECRET / DATA_DIR 后调用）。 */
export function resetSecretKeyCache(): void {
  cachedKey = null;
}

export default getSecretKey;
