import { describe, it, expect } from 'vitest';
import { filterTools, sortTools, groupToolsByCategory, levenshtein, fuzzyMatchTools, summarizeTools, normalizeQuery, toolCategoryLabel } from '../src/utils/search';
import type { ToolModule } from '../src/tools/types';

const noop = (() => null) as unknown as ToolModule['Component'];
const mock: ToolModule[] = [
  { key: 'hash', title: '哈希', category: '加密与哈希', description: 'MD5 / SHA', Component: noop },
  { key: 'json', title: 'JSON 格式化', category: '格式化', description: '格式化与校验 JSON', Component: noop },
  { key: 'cron', title: 'Cron 解析', category: '开发', description: '解析 5 段 Cron', Component: noop },
];

describe('filterTools', () => {
  it('空白查询返回全部', () => {
    expect(filterTools('   ', mock)).toHaveLength(3);
    expect(filterTools('', mock)).toHaveLength(3);
  });
  it('按标题匹配（大小写不敏感）', () => {
    expect(filterTools('JSON', mock).map((t) => t.key)).toEqual(['json']);
  });
  it('按描述匹配', () => {
    expect(filterTools('cron', mock).map((t) => t.key)).toEqual(['cron']);
  });
  it('按分类匹配', () => {
    expect(filterTools('加密', mock).map((t) => t.key)).toEqual(['hash']);
  });
  it('无命中返回空数组', () => {
    expect(filterTools('zzz', mock)).toHaveLength(0);
  });
  it('容忍多余空白（归一化后匹配）', () => {
    expect(filterTools('  JSON  ', mock).map((t) => t.key)).toEqual(['json']);
  });
});

describe('normalizeQuery', () => {
  it('折叠多余空白并转小写', () => {
    expect(normalizeQuery('  JSON  ')).toBe('json');
    expect(normalizeQuery('A  B\nC')).toBe('a b c');
  });
  it('剥离变音符号（重音）', () => {
    expect(normalizeQuery('Café')).toBe('cafe');
    expect(normalizeQuery('Naïve')).toBe('naive');
  });
  it('空串返回空串', () => {
    expect(normalizeQuery('   ')).toBe('');
  });
});

describe('sortTools', () => {
  it('默认按标题排序且不修改原数组', () => {
    const before = mock.map((t) => t.key);
    const sorted = sortTools(mock);
    expect(sorted).toHaveLength(3);
    expect(mock.map((t) => t.key)).toEqual(before);
  });
  it('按 key 字典序排序', () => {
    expect(sortTools(mock, 'key').map((t) => t.key)).toEqual(['cron', 'hash', 'json']);
  });
  it('空数组返回空数组', () => {
    expect(sortTools([])).toHaveLength(0);
  });
});

describe('groupToolsByCategory', () => {
  const mock: ToolModule[] = [
    { key: 'a', title: 'A', category: '编码', description: '', component: null as never },
    { key: 'b', title: 'B', category: '编码', description: '', component: null as never },
    { key: 'c', title: 'C', category: '网络', description: '', component: null as never },
  ];
  it('按分类分组并保留组内顺序', () => {
    const g = groupToolsByCategory(mock);
    expect(Object.keys(g)).toEqual(['编码', '网络']);
    expect(g['编码'].map((t) => t.key)).toEqual(['a', 'b']);
    expect(g['网络'].map((t) => t.key)).toEqual(['c']);
  });
  it('不修改入参', () => {
    const before = [...mock];
    groupToolsByCategory(mock);
    expect(mock).toEqual(before);
  });
  it('空列表返回空对象', () => {
    expect(groupToolsByCategory([])).toEqual({});
  });
});

describe('summarizeTools', () => {
  it('汇总总数与分类数', () => {
    const s = summarizeTools(mock);
    expect(s.total).toBe(3);
    expect(s.categories).toBe(3);
    expect(s.byCategory['格式化']).toBe(1);
  });
  it('空列表为零', () => {
    const s = summarizeTools([]);
    expect(s.total).toBe(0);
    expect(s.categories).toBe(0);
    expect(s.byCategory).toEqual({});
  });
  it('分类计数正确累加', () => {
    const s = summarizeTools([
      { key: 'a', title: 'A', category: 'X', description: '', Component: (null as never) },
      { key: 'b', title: 'B', category: 'X', description: '', Component: (null as never) },
      { key: 'c', title: 'C', category: 'Y', description: '', Component: (null as never) },
    ]);
    expect(s.byCategory).toEqual({ X: 2, Y: 1 });
    expect(s.categories).toBe(2);
  });
  it('不修改入参', () => {
    const before = [...mock];
    summarizeTools(mock);
    expect(mock).toEqual(before);
  });
});

describe('levenshtein', () => {
  it('空串距离为另一串长度', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
  it('相同串距离为 0', () => {
    expect(levenshtein('json', 'json')).toBe(0);
  });
  it('单字符替换距离为 1（大小写不敏感）', () => {
    expect(levenshtein('JSON', 'JSOX')).toBe(1);
  });
  it('插入/删除距离正确', () => {
    expect(levenshtein('cat', 'cart')).toBe(1);
    expect(levenshtein('cart', 'cat')).toBe(1);
  });
});

describe('toolCategoryLabel', () => {
  it('将「加密与哈希」映射为「加密·哈希」', () => {
    expect(toolCategoryLabel('加密与哈希')).toBe('加密·哈希');
  });
  it('将「日期时间」映射为「日期·时间」', () => {
    expect(toolCategoryLabel('日期时间')).toBe('日期·时间');
  });
  it('未登记的分类原样返回（passthrough）', () => {
    expect(toolCategoryLabel('开发')).toBe('开发');
    expect(toolCategoryLabel('未知分类')).toBe('未知分类');
  });
});

describe('fuzzyMatchTools', () => {
  it('空白查询返回全部', () => {
    expect(fuzzyMatchTools(mock, '  ')).toHaveLength(3);
  });
  it('子串命中（大小写不敏感）', () => {
    expect(fuzzyMatchTools(mock, 'json').map((t) => t.key)).toEqual(['json']);
  });
  it('编辑距离内模糊命中（拼写纠错）', () => {
    // "jsom" 与 "json" 距离 1，应被容错匹配
    expect(fuzzyMatchTools(mock, 'jsom').map((t) => t.key)).toEqual(['json']);
  });
  it('超出阈值无命中', () => {
    expect(fuzzyMatchTools(mock, 'zzzzz')).toHaveLength(0);
  });
  it('不修改入参', () => {
    const before = [...mock];
    fuzzyMatchTools(mock, 'json');
    expect(mock).toEqual(before);
  });
});
