import { describe, it, expect } from 'vitest';
import { postReadingTime } from '../src/utils/forum';

describe('postReadingTime', () => {
  it('空串返回 0', () => {
    expect(postReadingTime('')).toBe(0);
  });
  it('纯空白串返回 0', () => {
    expect(postReadingTime('   \n\t  ')).toBe(0);
  });
  it('非空内容至少返回 1 分钟', () => {
    expect(postReadingTime('一句话。')).toBe(1);
  });
  it('短中文段落返回较小整数（1 分钟）', () => {
    const short = '这是一段简短的中文帖子内容，用来演示阅读时长估算。';
    expect(postReadingTime(short)).toBe(1);
  });
  it('较长中文内容返回更大的分钟数', () => {
    const long = '这是一篇较长的文章正文。' + '内容持续展开，讨论主题、细节与延伸观点。'.repeat(60);
    expect(postReadingTime(long)).toBeGreaterThan(1);
  });
  it('含 Markdown 标记时仍按纯文本估算且至少 1 分钟', () => {
    const md = '# 标题\n\n这是 **加粗** 与 `代码` 还有 [链接](http://x.com) 的中文正文内容。';
    expect(postReadingTime(md)).toBe(1);
  });
  it('不修改入参', () => {
    const input = '# 标题\n\n这是 **加粗** 的中文正文，字数不多。';
    const before = input;
    postReadingTime(input);
    expect(input).toBe(before);
  });
});
