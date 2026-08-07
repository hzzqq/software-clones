import { describe, it, expect } from 'vitest';
import {
  encryptText,
  decryptText,
  deriveKeyFromSecret,
  generateKey,
  KEY_LENGTH,
} from './crypto';

describe('vault crypto utils', () => {
  const key = generateKey();

  it('加密→解密往返一致', () => {
    const plain = 'S3cret-P@ss-2024!';
    const enc = encryptText(plain, key);
    expect(enc).not.toBe(plain);
    expect(enc.split('.')).toHaveLength(3);
    expect(decryptText(enc, key)).toBe(plain);
  });

  it('空串加密返回空串', () => {
    expect(encryptText('', key)).toBe('');
    expect(decryptText('', key)).toBe('');
  });

  it('同一明文两次加密得到不同密文（随机 IV）', () => {
    const plain = 'same text';
    const a = encryptText(plain, key);
    const b = encryptText(plain, key);
    expect(a).not.toBe(b);
    expect(decryptText(a, key)).toBe(plain);
    expect(decryptText(b, key)).toBe(plain);
  });

  it('篡改密文导致解密失败', () => {
    const enc = encryptText('integrity matters', key);
    const parts = enc.split('.');
    const data = Buffer.from(parts[2], 'base64');
    data[0] = (data[0] ^ 0xff) & 0xff; // 翻转第一个字节
    parts[2] = Buffer.from(data).toString('base64');
    expect(() => decryptText(parts.join('.'), key)).toThrow();
  });

  it('篡改认证标签导致解密失败', () => {
    const enc = encryptText('tag tamper', key);
    const parts = enc.split('.');
    const tag = Buffer.from(parts[1], 'base64');
    tag[0] = (tag[0] ^ 0x01) & 0xff;
    parts[1] = Buffer.from(tag).toString('base64');
    expect(() => decryptText(parts.join('.'), key)).toThrow();
  });

  it('错误密钥导致解密失败', () => {
    const enc = encryptText('wrong key test', key);
    const otherKey = generateKey();
    expect(otherKey.equals(key)).toBe(false);
    expect(() => decryptText(enc, otherKey)).toThrow();
  });

  it('非法格式抛出异常', () => {
    expect(() => decryptText('not-a-valid-payload', key)).toThrow();
    expect(() => decryptText('a.b', key)).toThrow();
  });

  it('deriveKeyFromSecret 稳定且长度为 32', () => {
    const k1 = deriveKeyFromSecret('my app master passphrase 001');
    const k2 = deriveKeyFromSecret('my app master passphrase 001');
    expect(k1.length).toBe(KEY_LENGTH);
    expect(k1.equals(k2)).toBe(true);

    const k3 = deriveKeyFromSecret('different passphrase 002');
    expect(k1.equals(k3)).toBe(false);
  });

  it('generateKey 返回 32 字节随机密钥', () => {
    const a = generateKey();
    const b = generateKey();
    expect(a.length).toBe(KEY_LENGTH);
    expect(a.equals(b)).toBe(false);
  });
});
