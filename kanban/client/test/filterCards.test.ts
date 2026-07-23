import { describe, it, expect } from 'vitest';
import { filterCardsByQuery } from '../src/utils/filterCards';
import type { Card } from '../src/types';

function mk(id: number, title: string, description = ''): Card {
  return {
    id,
    listId: 1,
    title,
    description,
    dueDate: null,
    priority: 0,
    completed: 0,
    position: id,
    createdAt: '',
    updatedAt: '',
    tagIds: [],
  };
}

describe('filterCardsByQuery', () => {
  const cards = [mk(1, '登录页', '实现 OAuth'), mk(2, '支付', '对接微信'), mk(3, '重构', '')];
  it('空白返回全部', () => {
    expect(filterCardsByQuery('  ', cards)).toHaveLength(3);
  });
  it('按标题匹配', () => {
    expect(filterCardsByQuery('支付', cards).map((c) => c.id)).toEqual([2]);
  });
  it('按描述匹配（大小写不敏感）', () => {
    expect(filterCardsByQuery('oauth', cards).map((c) => c.id)).toEqual([1]);
  });
  it('无命中返回空数组', () => {
    expect(filterCardsByQuery('zzz', cards)).toHaveLength(0);
  });
});
