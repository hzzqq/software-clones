import { describe, it, expect } from 'vitest';
import { filterTools } from '../src/utils/search';
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
