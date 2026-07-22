import { describe, it, expect } from 'vitest';
import { parseTags, countWords, deriveTitle, countCodeBlocks, estimateReadingTime } from './markdown';

describe('parseTags', () => {
  it('提取去重标签', () => {
    expect(parseTags('#todo #bug #todo')).toEqual(['todo', 'bug']);
  });
  it('空文本返回空', () => {
    expect(parseTags('no tags here')).toEqual([]);
  });
});

describe('countWords', () => {
  it('忽略 markdown 符号，中文按字符计', () => {
    // 标题/这是/粗体/文字 共 8 个汉字，按字符计数（中文无空格分词）
    expect(countWords('# 标题\n\n这是 **粗体** 文字')).toBe(8);
  });
  it('空文本为 0', () => {
    expect(countWords('   ')).toBe(0);
  });
  it('中文按字符计数（不再被算成 1 个词）', () => {
    expect(countWords('中文测试一下')).toBe(6);
    // 中文 + 英文混排
    expect(countWords('这是一段 text 示例')).toBe(7);
  });
});

describe('estimateReadingTime', () => {
  it('250 字约 1 分钟，至少 1 分钟', () => {
    expect(estimateReadingTime('字'.repeat(250))).toBe(1);
    expect(estimateReadingTime('字'.repeat(10))).toBe(1);
    expect(estimateReadingTime('字'.repeat(750))).toBe(3);
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
