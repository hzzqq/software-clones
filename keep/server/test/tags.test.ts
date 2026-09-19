import { test, expect } from 'vitest';
import { parseTags, limitTags, MAX_TAGS_PER_NOTE } from '../src/lib/tags';

test('parseTags: 数组输入逐个处理并小写去重', () => {
  expect(parseTags(['JS', 'Frontend', 'js'])).toEqual(['js', 'frontend']);
});

test('parseTags: 字符串按逗号/中英文逗号/空白分隔', () => {
  expect(parseTags('react, hooks, 前端')).toEqual(['react', 'hooks', '前端']);
  expect(parseTags('a，b c')).toEqual(['a', 'b', 'c']);
});

test('parseTags: 忽略空项与非字符串项', () => {
  expect(parseTags(['  ', 42, null, 'ok'])).toEqual(['ok']);
  expect(parseTags(undefined)).toEqual([]);
  expect(parseTags(null)).toEqual([]);
});

test('limitTags: 裁剪到上限', () => {
  const many = Array.from({ length: 30 }, (_, i) => `tag${i}`);
  expect(limitTags(many)).toHaveLength(MAX_TAGS_PER_NOTE);
});
