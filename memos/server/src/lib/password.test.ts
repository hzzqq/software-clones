import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from './password';

/**
 * 回归测试：曾出现过 hashPassword 模板串漏写 `$` 分隔符的 bug，
 * 导致 verifyPassword 里 indexOf('$') === -1 直接返回 false —— 任何密码都登不进去。
 * 更坑的是当时的集成测试只验了「注册拿 token」和「错误密码被拒」，
 * 正确密码登录这条路径从没跑过，于是假绿。以下用例专门钉死这些行为。
 */

test('哈希产物包含 $ 分隔符，格式为 salt$hash', () => {
  const stored = hashPassword('secret1');
  const sep = stored.indexOf('$');
  assert.ok(sep > 0, '存储格式必须含 $ 分隔符');
  assert.equal(stored.slice(0, sep).length, 32, 'salt 应为 16 字节 = 32 个十六进制字符');
  assert.equal(stored.slice(sep + 1).length, 128, 'hash 应为 64 字节 = 128 个十六进制字符');
});

test('正确密码可以验证通过（核心路径）', () => {
  const stored = hashPassword('secret1');
  assert.equal(verifyPassword('secret1', stored), true);
});

test('错误密码被拒绝', () => {
  const stored = hashPassword('secret1');
  assert.equal(verifyPassword('WRONGpw', stored), false);
  assert.equal(verifyPassword('', stored), false);
  assert.equal(verifyPassword('secret', stored), false); // 前缀不算命中
});

test('相同密码两次哈希不同（盐值随机）', () => {
  assert.notEqual(hashPassword('secret1'), hashPassword('secret1'));
});

test('畸形存储值一律不通过，且不抛异常', () => {
  for (const bad of ['', 'garbage', '$', 'abc$', '$def', 'x'.repeat(160)]) {
    assert.equal(verifyPassword('secret1', bad), false, `应拒绝: ${JSON.stringify(bad)}`);
  }
});

test('兼容旧的无分隔符格式（salt+hash 定长拼接）', () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync('secret1', salt, 64).toString('hex');
  const legacy = `${salt}${hash}`; // 旧 bug 写出来的格式
  assert.equal(legacy.length, 160);
  assert.equal(verifyPassword('secret1', legacy), true, '旧账号仍应能登录');
  assert.equal(verifyPassword('WRONGpw', legacy), false);
});
