import { describe, expect, it } from 'vitest';
import { parseTags, tagsToText, textToTags } from './tags';

describe('parseTags', () => {
  it('数组输入小写去重', () => {
    expect(parseTags(['JS', 'Frontend', 'js'])).toEqual(['js', 'frontend']);
  });

  it('字符串按逗号 / 中英文逗号 / 空白分隔', () => {
    expect(parseTags('react, hooks, 前端')).toEqual(['react', 'hooks', '前端']);
    expect(parseTags('a，b c')).toEqual(['a', 'b', 'c']);
  });

  it('忽略空项与非字符串项', () => {
    expect(parseTags(['  ', 42, null, 'ok'])).toEqual(['ok']);
    expect(parseTags(undefined)).toEqual([]);
  });
});

describe('tagsToText / textToTags', () => {
  it('数组 ↔ 文本互转', () => {
    expect(tagsToText(['a', 'b'])).toBe('a, b');
    expect(textToTags('a, b')).toEqual(['a', 'b']);
  });
});
