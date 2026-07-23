import { describe, it, expect } from 'vitest';
import { filterCardsByQuery, sortCards, countCardsByPriority } from '../src/utils/filterCards';
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

describe('sortCards', () => {
  const cards: Card[] = [
    { id: 1, listId: 1, title: 'B', description: '', dueDate: null, priority: 1, completed: 0, position: 3, createdAt: '', updatedAt: '2026-01-01', tagIds: [] },
    { id: 2, listId: 1, title: 'A', description: '', dueDate: '2026-02-01', priority: 3, completed: 0, position: 1, createdAt: '', updatedAt: '2026-03-01', tagIds: [] },
    { id: 3, listId: 1, title: 'C', description: '', dueDate: null, priority: 2, completed: 0, position: 2, createdAt: '', updatedAt: '2026-02-01', tagIds: [] },
  ];
  it('position：按 position 升序', () => {
    expect(sortCards(cards, 'position').map((c) => c.id)).toEqual([2, 3, 1]);
  });
  it('title：按标题字典序', () => {
    expect(sortCards(cards, 'title').map((c) => c.id)).toEqual([2, 1, 3]);
  });
  it('priority：高优先级在前', () => {
    expect(sortCards(cards, 'priority').map((c) => c.id)).toEqual([2, 3, 1]);
  });
  it('dueDate：升序且空截止日排最后', () => {
    expect(sortCards(cards, 'dueDate').map((c) => c.id)).toEqual([2, 1, 3]);
  });
  it('updatedAt：最近更新在前', () => {
    expect(sortCards(cards, 'updatedAt').map((c) => c.id)).toEqual([2, 3, 1]);
  });
  it('不修改原数组', () => {
    const before = cards.map((c) => c.id);
    sortCards(cards, 'title');
    expect(cards.map((c) => c.id)).toEqual(before);
  });
});

describe('countCardsByPriority', () => {
  const cards: Card[] = [
    { id: 1, title: 'a', description: '', priority: 1, columnId: 1, position: 0, createdAt: '', updatedAt: '' },
    { id: 2, title: 'b', description: '', priority: 3, columnId: 1, position: 1, createdAt: '', updatedAt: '' },
    { id: 3, title: 'c', description: '', priority: 3, columnId: 2, position: 0, createdAt: '', updatedAt: '' },
  ];
  it('按优先级计数', () => {
    expect(countCardsByPriority(cards)).toEqual({ 1: 1, 3: 2 });
  });
  it('空列表返回空对象', () => {
    expect(countCardsByPriority([])).toEqual({});
  });
  it('不修改入参', () => {
    const before = cards.map((c) => c.id);
    countCardsByPriority(cards);
    expect(cards.map((c) => c.id)).toEqual(before);
  });
});
