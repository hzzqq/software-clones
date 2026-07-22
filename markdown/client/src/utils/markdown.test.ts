import { describe, it, expect } from 'vitest';
import { parseTags, countWords, deriveTitle, countCodeBlocks } from './markdown';

describe('parseTags', () => {
  it('提取去重标签', () => {
    expect(parseTags('#todo #bug #todo')).toEqual(['todo', 'bug']);
  });
  it('空文本返回空', () => {
    expect(parseTags('no tags here')).toEqual([]);
  });
});

describe('countWords', () => {
  it('忽略 markdown 符号', () => {
    expect(countWords('# 标题\n\n这是 **粗体** 文字')).toBe(4);
  });
  it('空文本为 0', () => {
    expect(countWords('   ')).toBe(0);
  });
});

describe('deriveTitle', () => {
  it('优先取首个标题', () => {
    expect(deriveTitle('# 我的笔记\n正文')).toBe('我的笔记');
  });
  it('退化为首行', () => {
    expect(deriveTitle('首行就是标题\n更多')).toBe('首行就是标题');
  });
  it('都为空时回退', () => {
    expect(deriveTitle('\n\n')).toBe('无标题笔记');
  });
});

describe('countCodeBlocks', () => {
  it('成对计数', () => {
    expect(countCodeBlocks('```js\nx\n```\n```py\ny\n```')).toBe(2);
  });
});
