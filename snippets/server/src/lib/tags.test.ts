import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTags, limitTags, MAX_TAGS_PER_SNIPPET } from './tags';

test('parseTags: 数组输入逐个处理并小写去重', () => {
  assert.deepEqual(parseTags(['JS', 'Frontend', 'js']), ['js', 'frontend']);
});

test('parseTags: 字符串按逗号/中英文逗号/空白分隔', () => {
  assert.deepEqual(parseTags('react, hooks, 前端'), ['react', 'hooks', '前端']);
  assert.deepEqual(parseTags('a，b c'), ['a', 'b', 'c']);
});

test('parseTags: 忽略空项与非字符串项', () => {
  assert.deepEqual(parseTags(['  ', 42, null, 'ok']), ['ok']);
  assert.deepEqual(parseTags(undefined), []);
  assert.deepEqual(parseTags(null), []);
});

test('limitTags: 裁剪到上限', () => {
  const many = Array.from({ length: 30 }, (_, i) => `tag${i}`);
  assert.equal(limitTags(many).length, MAX_TAGS_PER_SNIPPET);
});
