import { describe, it, expect } from 'vitest';
import { filterTools, sortTools, groupToolsByCategory } from '../src/utils/search';
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
