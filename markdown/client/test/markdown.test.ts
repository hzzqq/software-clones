import { describe, expect, it } from 'vitest';
import { sluggify, slugifyHeading, truncateText } from '../src/utils/markdown';

describe('sluggify', () => {
  it('英文标题小写并空格转连字符', () => {
    expect(sluggify('Hello World')).toBe('hello-world');
  });

  it('中文标题保留汉字，空格转连字符', () => {
    expect(sluggify('你好 世界')).toBe('你好-世界');
  });

  it('符号替换为连字符', () => {
    expect(sluggify('Hello, World!')).toBe('hello-world');
  });

  it('连续的连字符被合并', () => {
    expect(sluggify('A---B!!C')).toBe('a-b-c');
  });

  it('去除首尾连字符', () => {
    expect(sluggify('!! 标题 !!')).toBe('标题');
  });

  it('去除重音符号（éclaire → eclaire）', () => {
    expect(sluggify('Café Münchën')).toBe('cafe-munchen');
  });

  it('不修改入参原字符串', () => {
    const input = 'Hello, World!';
    sluggify(input);
    expect(input).toBe('Hello, World!');
  });

  it('slugifyHeading 复用 sluggify 生成带序号的稳定 id', () => {
    expect(slugifyHeading('Hello World', 0)).toBe('hello-world-0');
    expect(slugifyHeading('你好 世界', 2)).toBe('你好-世界-2');
  });
});

describe('truncateText', () => {
  it('短文本原样返回（不截断）', () => {
    expect(truncateText('你好世界', 40)).toBe('你好世界');
  });

  it('长文本被截断并追加省略号（CJK 友好，总长不超过 max）', () => {
    const long = '一'.repeat(50);
    const out = truncateText(long, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith('…')).toBe(true);
    expect(out).toBe('一'.repeat(39) + '…');
  });

  it('max 小于省略号长度时直接按 max 截断，避免负长度 slice', () => {
    // 默认省略号 '…' 长度为 1，用更长省略符 '...'（长度 3）构造 max(1) < 3 的边界。
    expect(truncateText('abcdef', 1, '...')).toBe('a');
    expect(truncateText('abcdef', 0)).toBe('');
  });

  it('空字符串返回空字符串', () => {
    expect(truncateText('', 40)).toBe('');
  });

  it('恰好等于 max 时不截断', () => {
    expect(truncateText('12345', 5)).toBe('12345');
  });

  it('自定义省略符生效', () => {
    expect(truncateText('abcdefghij', 5, '...')).toBe('ab...');
  });

  it('不修改入参原字符串', () => {
    const input = 'hello world';
    truncateText(input, 5);
    expect(input).toBe('hello world');
  });
});
