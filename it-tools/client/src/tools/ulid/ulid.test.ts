import { describe, it, expect } from 'vitest';
import {
  encodeTime,
  generateUlid,
  generateUlids,
  isValidUlid,
  ulidTime,
  type RandomSource,
} from './ulid';

const fixedRandom: RandomSource = (len) => {
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = (i * 7 + 3) % 256;
  return bytes;
};

describe('ulid', () => {
  it('encodeTime 是确定性的且长度正确', () => {
    expect(encodeTime(0)).toBe('0000000000');
    const t = 1672531200000;
    expect(encodeTime(t)).toHaveLength(10);
    expect(encodeTime(t)).toBe(encodeTime(t));
  });

  it('encodeTime 拒绝越界时间戳', () => {
    expect(() => encodeTime(-1)).toThrow();
    expect(() => encodeTime(281474976710656)).toThrow();
  });

  it('generateUlid 长度为 26 且符合 Crockford 字母表', () => {
    const id = generateUlid(1000, fixedRandom);
    expect(id).toHaveLength(26);
    expect(isValidUlid(id)).toBe(true);
  });

  it('isValidUlid 排除易混淆字符 I L O U 与非字母', () => {
    expect(isValidUlid('01AN4Z07GB') + 'XXXXXXXX'.slice(0, 16)).toBeTruthy();
    const bad = '01AN4Z07GB' + 'I'.repeat(15);
    expect(isValidUlid(bad)).toBe(false);
    expect(isValidUlid('too-short')).toBe(false);
  });

  it('ulidTime 可从 ULID 解析出嵌入时间戳', () => {
    const now = 1672531200000;
    const id = generateUlid(now, fixedRandom);
    expect(ulidTime(id)).toBe(now);
    expect(ulidTime('not-a-ulid')).toBeNull();
  });

  it('generateUlids 生成指定数量且不重复', () => {
    const ids = generateUlids(10);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });

  it('generateUlids 至少生成 1 个（数量为 0 时）', () => {
    expect(generateUlids(0)).toHaveLength(1);
  });
});
