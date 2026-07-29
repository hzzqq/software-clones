import { describe, it, expect } from 'vitest';
import { countChars, countWords, estimateReading } from './notes';

describe('countChars', () => {
  it('忽略空白字符', () => {
    expect(countChars('')).toBe(0);
    expect(countChars('   ')).toBe(0);
    expect(countChars('你好 world')).toBe(7);
  });
  it('中文按字符计数', () => {
    expect(countChars('轻笔记')).toBe(3);
  });
});

describe('estimateReading', () => {
  it('空内容返回 0', () => {
    expect(estimateReading('')).toBe(0);
  });
  it('非空内容至少 1 分钟', () => {
    expect(estimateReading('短')).toBe(1);
    expect(estimateReading('字'.repeat(400))).toBe(2);
  });
});

describe('countWords', () => {
  it('空内容返回 0', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords(null as unknown as string)).toBe(0);
  });
  it('中文按字符计数（不被算成 1 个词）', () => {
    expect(countWords('轻笔记')).toBe(3);
  });
  it('英文按空白分词', () => {
    expect(countWords('hello world foo')).toBe(3);
  });
  it('中英混排各自计数后相加', () => {
    expect(countWords('你好 world 世界')).toBe(5);
  });
});
