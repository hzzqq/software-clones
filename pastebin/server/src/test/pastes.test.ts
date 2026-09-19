import { test } from 'node:test';
import assert from 'node:assert';
import { createPaste, getPasteByCode, deletePaste } from '../repositories/pastesRepo';

test('paste: create then fetch by code', () => {
  const p = createPaste({ title: 'hello', content: 'console.log(1)', language: 'js' });
  assert.ok(p.code.length >= 4);
  const got = getPasteByCode(p.code);
  assert.ok(got);
  assert.strictEqual(got!.content, 'console.log(1)');
  // 清理
  deletePaste(p.code);
  assert.strictEqual(getPasteByCode(p.code), null);
});

test('paste: expired paste is invisible', () => {
  const p = createPaste({ content: 'x', expiresInMinutes: -1 });
  // expiresInMinutes 为负 → 已过期 → 查询返回 null
  assert.strictEqual(getPasteByCode(p.code), null);
  deletePaste(p.code);
});
