import { describe, expect, it } from 'vitest';
import { sluggify, slugifyHeading } from '../src/utils/markdown';

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
