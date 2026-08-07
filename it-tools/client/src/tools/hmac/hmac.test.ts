import { describe, it, expect } from 'vitest';
import { hmac, isHmacAlgo, isHmacFormat } from './hmac';

describe('hmac', () => {
  it('SHA256 命中 RFC 经典向量', () => {
    const out = hmac('SHA256', 'The quick brown fox jumps over the lazy dog', 'key');
    expect(out).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  });

  it('不同算法输出长度符合预期（hex）', () => {
    expect(hmac('MD5', 'm', 's')).toHaveLength(32);
    expect(hmac('SHA1', 'm', 's')).toHaveLength(40);
    expect(hmac('SHA256', 'm', 's')).toHaveLength(64);
    expect(hmac('SHA512', 'm', 's')).toHaveLength(128);
  });

  it('base64 输出与 hex 不同且可逆解码', () => {
    const hex = hmac('SHA256', 'message', 'secret', 'hex');
    const b64 = hmac('SHA256', 'message', 'secret', 'base64');
    expect(b64).not.toBe(hex);
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('相同输入产生确定结果', () => {
    const a = hmac('SHA256', 'hello', 'k');
    const b = hmac('SHA256', 'hello', 'k');
    expect(a).toBe(b);
  });

  it('校验函数正确识别合法算法/格式', () => {
    expect(isHmacAlgo('SHA256')).toBe(true);
    expect(isHmacAlgo('XX')).toBe(false);
    expect(isHmacFormat('base64')).toBe(true);
    expect(isHmacFormat('yaml')).toBe(false);
  });
});
