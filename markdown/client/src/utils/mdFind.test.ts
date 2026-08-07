import { describe, expect, it } from 'vitest';
import {
  countMatches,
  escapeRegExp,
  findMatches,
  formatMatchCounter,
  nextMatchIndex,
  replaceAll,
  replaceMatch,
} from './mdFind';

describe('escapeRegExp', () => {
  it('转义正则元字符', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c');
  });

  it('普通文本原样返回', () => {
    expect(escapeRegExp('hello')).toBe('hello');
  });
});

describe('findMatches', () => {
  it('默认大小写不敏感', () => {
    expect(findMatches('Foo foo FOO', 'foo')).toHaveLength(3);
  });

  it('开启大小写敏感后只命中完全一致的', () => {
    const m = findMatches('Foo foo FOO', 'foo', { caseSensitive: true });
    expect(m).toEqual([{ start: 4, end: 7 }]);
  });

  it('全词匹配排除被单词字符包围的命中', () => {
    const m = findMatches('cat category cat', 'cat', { wholeWord: true });
    expect(m).toEqual([
      { start: 0, end: 3 },
      { start: 13, end: 16 },
    ]);
  });

  it('中文全词匹配不会被相邻汉字误判为独立词', () => {
    expect(findMatches('笔记本 笔记', '笔记', { wholeWord: true })).toEqual([{ start: 4, end: 6 }]);
  });

  it('空查询返回空数组', () => {
    expect(findMatches('abc', '')).toEqual([]);
  });

  it('无命中返回空数组', () => {
    expect(findMatches('abc', 'zzz')).toEqual([]);
  });

  it('命中不重叠（aaa 中查 aa 只命中一次）', () => {
    expect(findMatches('aaa', 'aa')).toEqual([{ start: 0, end: 2 }]);
  });

  it('不修改入参', () => {
    const s = 'abcabc';
    findMatches(s, 'abc');
    expect(s).toBe('abcabc');
  });
});

describe('countMatches', () => {
  it('返回命中总数', () => {
    expect(countMatches('a a a', 'a')).toBe(3);
  });

  it('空查询计为 0', () => {
    expect(countMatches('a a a', '')).toBe(0);
  });
});

describe('nextMatchIndex', () => {
  const matches = [
    { start: 0, end: 2 },
    { start: 10, end: 12 },
    { start: 20, end: 22 },
  ];

  it('向前查找返回光标之后的第一个命中', () => {
    expect(nextMatchIndex(matches, 3, true)).toBe(1);
  });

  it('向前越界时回绕到第一个', () => {
    expect(nextMatchIndex(matches, 99, true)).toBe(0);
  });

  it('向后查找返回光标之前的最后一个命中', () => {
    expect(nextMatchIndex(matches, 15, false)).toBe(1);
  });

  it('向后越界时回绕到最后一个', () => {
    expect(nextMatchIndex(matches, 0, false)).toBe(2);
  });

  it('空命中列表返回 -1', () => {
    expect(nextMatchIndex([], 0, true)).toBe(-1);
  });
});

describe('replaceMatch', () => {
  it('替换指定区间并返回新光标位置', () => {
    const r = replaceMatch('hello world', { start: 6, end: 11 }, 'there');
    expect(r.text).toBe('hello there');
    expect(r.cursor).toBe(11);
  });

  it('非法区间原样返回', () => {
    const r = replaceMatch('abc', { start: 2, end: 99 }, 'x');
    expect(r.text).toBe('abc');
  });
});

describe('replaceAll', () => {
  it('替换全部命中并返回次数', () => {
    const r = replaceAll('a-a-a', 'a', 'b');
    expect(r.text).toBe('b-b-b');
    expect(r.count).toBe(3);
  });

  it('大小写敏感时只替换精确命中', () => {
    const r = replaceAll('Foo foo', 'foo', 'bar', { caseSensitive: true });
    expect(r.text).toBe('Foo bar');
    expect(r.count).toBe(1);
  });

  it('替换为更长文本时下标不漂移', () => {
    const r = replaceAll('x x', 'x', 'yyyy');
    expect(r.text).toBe('yyyy yyyy');
  });

  it('无命中时原样返回且次数为 0', () => {
    const r = replaceAll('abc', 'z', 'y');
    expect(r.text).toBe('abc');
    expect(r.count).toBe(0);
  });

  it('替换为空串等价删除', () => {
    expect(replaceAll('a-b-a', 'a', '').text).toBe('-b-');
  });
});

describe('formatMatchCounter', () => {
  it('有命中时展示序号与总数', () => {
    expect(formatMatchCounter(0, 3)).toBe('第 1 / 共 3');
  });

  it('尚未定位到具体命中时按第 1 条展示', () => {
    expect(formatMatchCounter(-1, 3)).toBe('第 1 / 共 3');
  });

  it('无命中时展示提示文案', () => {
    expect(formatMatchCounter(-1, 0)).toBe('无匹配');
  });
});
