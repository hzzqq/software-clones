import { describe, it, expect } from 'vitest';
import { filterCardsByQuery, sortCards, countCardsByPriority, dueSoonCards, overdueCards, filterCardsByPriority, filterCardsByCompleted, formatDueLabel } from '../src/utils/filterCards';
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

describe('dueSoonCards', () => {
  const day = 24 * 60 * 60 * 1000;
  const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
  const cards: Card[] = [
    { id: 1, listId: 1, title: 'a', description: '', dueDate: iso(1 * day), priority: 0, completed: 0, position: 0, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 2, listId: 1, title: 'b', description: '', dueDate: iso(10 * day), priority: 0, completed: 0, position: 1, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 3, listId: 1, title: 'c', description: '', dueDate: iso(-1 * day), priority: 0, completed: 0, position: 2, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 4, listId: 1, title: 'd', description: '', dueDate: iso(1 * day), priority: 0, completed: 1, position: 3, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 5, listId: 1, title: 'e', description: '', dueDate: null, priority: 0, completed: 0, position: 4, createdAt: '', updatedAt: '', tagIds: [] },
  ];
  it('包含 3 天内到期与已逾期（未完成）', () => {
    expect(dueSoonCards(cards).map((c) => c.id)).toEqual([1, 3]);
  });
  it('10 天后到期不计入', () => {
    expect(dueSoonCards(cards).map((c) => c.id)).not.toContain(2);
  });
  it('已完成卡片不计入', () => {
    expect(dueSoonCards(cards).map((c) => c.id)).not.toContain(4);
  });
  it('无截止日不计入', () => {
    expect(dueSoonCards(cards).map((c) => c.id)).not.toContain(5);
  });
  it('可调整窗口天数', () => {
    // 调到 11 天窗口后，id=2（10 天后）也应纳入
    expect(dueSoonCards(cards, 11).map((c) => c.id).sort()).toEqual([1, 2, 3]);
  });
  it('空列表返回空数组', () => {
    expect(dueSoonCards([])).toEqual([]);
  });
});

describe('overdueCards', () => {
  const day = 24 * 60 * 60 * 1000;
  const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
  const cards: Card[] = [
    { id: 1, listId: 1, title: 'a', description: '', dueDate: iso(1 * day), priority: 0, completed: 0, position: 0, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 2, listId: 1, title: 'b', description: '', dueDate: iso(-1 * day), priority: 0, completed: 0, position: 1, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 3, listId: 1, title: 'c', description: '', dueDate: iso(-10 * day), priority: 0, completed: 1, position: 2, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 4, listId: 1, title: 'd', description: '', dueDate: null, priority: 0, completed: 0, position: 3, createdAt: '', updatedAt: '', tagIds: [] },
  ];
  it('仅统计已逾期且未完成', () => {
    expect(overdueCards(cards).map((c) => c.id)).toEqual([2]);
  });
  it('临期但未到（1 天后）不计入', () => {
    expect(overdueCards(cards).map((c) => c.id)).not.toContain(1);
  });
  it('已逾期但已完成不计入', () => {
    expect(overdueCards(cards).map((c) => c.id)).not.toContain(3);
  });
  it('无截止日不计入', () => {
    expect(overdueCards(cards).map((c) => c.id)).not.toContain(4);
  });
  it('空列表返回空数组', () => {
    expect(overdueCards([])).toEqual([]);
  });
});

describe('filterCardsByPriority', () => {
  const cards: Card[] = [
    { id: 1, listId: 1, title: 'a', description: '', dueDate: null, priority: 0, completed: 0, position: 0, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 2, listId: 1, title: 'b', description: '', dueDate: null, priority: 2, completed: 0, position: 1, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 3, listId: 1, title: 'c', description: '', dueDate: null, priority: 2, completed: 1, position: 2, createdAt: '', updatedAt: '', tagIds: [] },
  ];
  it('null 返回全部', () => {
    expect(filterCardsByPriority(cards, null)).toHaveLength(3);
  });
  it('按优先级筛选（含已完成）', () => {
    expect(filterCardsByPriority(cards, 2).map((c) => c.id)).toEqual([2, 3]);
  });
  it('无匹配返回空', () => {
    expect(filterCardsByPriority(cards, 3)).toHaveLength(0);
  });
  it('不修改入参', () => {
    const before = cards.map((c) => c.id);
    filterCardsByPriority(cards, 2);
    expect(cards.map((c) => c.id)).toEqual(before);
  });
});

describe('filterCardsByCompleted', () => {
  const cards: Card[] = [
    { id: 1, listId: 1, title: 'a', description: '', dueDate: null, priority: 0, completed: 0, position: 0, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 2, listId: 1, title: 'b', description: '', dueDate: null, priority: 2, completed: 1, position: 1, createdAt: '', updatedAt: '', tagIds: [] },
    { id: 3, listId: 1, title: 'c', description: '', dueDate: null, priority: 2, completed: 0, position: 2, createdAt: '', updatedAt: '', tagIds: [] },
  ];
  it('onlyIncomplete 为 true 时过滤掉已完成', () => {
    expect(filterCardsByCompleted(cards, true).map((c) => c.id)).toEqual([1, 3]);
  });
  it('onlyIncomplete 为 false 时返回全部', () => {
    expect(filterCardsByCompleted(cards, false)).toHaveLength(3);
  });
  it('空列表返回空数组', () => {
    expect(filterCardsByCompleted([], true)).toEqual([]);
  });
  it('不修改入参', () => {
    const before = cards.map((c) => c.id);
    filterCardsByCompleted(cards, true);
    expect(cards.map((c) => c.id)).toEqual(before);
  });
});

describe('formatDueLabel', () => {
  // 固定参考时间：2026-07-23 10:00（本地时区），保证测试可重现。
  const now = new Date(2026, 6, 23, 10, 0, 0);
  const iso = (d: Date): string => d.toISOString();
  it('null → 无截止 / none', () => {
    expect(formatDueLabel(null, now)).toEqual({ text: '无截止', tone: 'none' });
  });
  it('已逾期（2 天前）→ 逾期 2天 / overdue', () => {
    const due = new Date(2026, 6, 21, 9, 0, 0); // 比 now 早 2 个日历日
    expect(formatDueLabel(iso(due), now)).toEqual({ text: '逾期 2天', tone: 'overdue' });
  });
  it('今天（同日历日，更晚时刻）→ 今天 / today', () => {
    const due = new Date(2026, 6, 23, 22, 30, 0); // 同属 7/23，忽略具体时刻
    expect(formatDueLabel(iso(due), now)).toEqual({ text: '今天', tone: 'today' });
  });
  it('3 天内（2 天后）→ 2天后 / soon', () => {
    const due = new Date(2026, 6, 25, 8, 0, 0); // 比 now 晚 2 个日历日
    expect(formatDueLabel(iso(due), now)).toEqual({ text: '2天后', tone: 'soon' });
  });
  it('较远未来（10 天后）→ 10天后 / none', () => {
    const due = new Date(2026, 7, 2, 8, 0, 0); // 7/23 + 10 天 = 8/2
    expect(formatDueLabel(iso(due), now)).toEqual({ text: '10天后', tone: 'none' });
  });
  it('非法日期字符串 → 日期无效 / none（不渲染 NaN天后）', () => {
    expect(formatDueLabel('not-a-date', now)).toEqual({ text: '日期无效', tone: 'none' });
  });
});
