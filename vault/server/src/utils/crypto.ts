/**
 * 密码字段的 AES-256-GCM 加密工具（零额外依赖，使用 node:crypto）。
 *
 * 密文格式：`base64(iv).base64(authTag).base64(ciphertext)`（三段以点分隔）。
 * GCM 自带完整性认证：密钥错误或密文被篡改时，解密会抛出异常。
 */

import crypto from 'crypto';

export const CIPHER_ALGORITHM = 'aes-256-gcm';
export const IV_LENGTH = 12;
export const AUTH_TAG_LENGTH = 16;
export const KEY_LENGTH = 32;

export interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

/** 加密文本，返回三段 base64 用点连接的可持久化字符串。 */
export function encryptText(plaintext: string, key: Buffer): string {
  if (!plaintext) return '';
  if (key.length !== KEY_LENGTH) {
    throw new Error(`密钥长度必须为 ${KEY_LENGTH} 字节`);
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

/** 解密文本；密钥错误 / 密文被篡改 / 格式非法时抛出异常。 */
export function decryptText(payload: string, key: Buffer): string {
  if (!payload) return '';
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new Error('无效的密文格式');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error('无效的 IV 或认证标签');
  }
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

/** 从文本密钥派生 32 字节密钥（SHA-256）。 */
export function deriveKeyFromSecret(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

/** 生成随机 32 字节密钥。 */
export function generateKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}
