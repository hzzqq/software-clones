import { describe, it, expect } from 'vitest';
import {
  filterCardsByQuery,
  sortCards,
  clampPriority,
  countCardsByPriority,
  dueSoonCards,
  overdueCards,
  filterCardsByPriority,
  filterCardsByCompleted,
  formatDueLabel,
  countCardsByTag,
} from './filterCards';
import { Card } from '../types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    listId: 1,
    title: '卡片',
    description: '',
    dueDate: null,
    priority: 0,
    completed: 0,
    position: 0,
    createdAt: '',
    updatedAt: '',
    tagIds: [],
    ...overrides,
  };
}

describe('clampPriority', () => {
  it('clamps NaN / negative to 0', () => {
    expect(clampPriority(NaN)).toBe(0);
    expect(clampPriority(-3)).toBe(0);
  });
  it('clamps out-of-range above max to max', () => {
    expect(clampPriority(99)).toBe(3);
  });
  it('passes through valid priorities', () => {
    expect(clampPriority(0)).toBe(0);
    expect(clampPriority(2)).toBe(2);
    expect(clampPriority(3)).toBe(3);
  });
});

describe('countCardsByPriority', () => {
  it('counts valid priorities into separate buckets', () => {
    const cards = [
      makeCard({ id: 1, priority: 0 }),
      makeCard({ id: 2, priority: 2 }),
      makeCard({ id: 3, priority: 2 }),
      makeCard({ id: 4, priority: 3 }),
    ];
    expect(countCardsByPriority(cards)).toEqual({ 0: 1, 2: 2, 3: 1 });
  });

  it('clamps out-of-range and NaN priorities into the 0 bucket (no garbage keys)', () => {
    const cards = [
      makeCard({ id: 1, priority: 5 }),
      makeCard({ id: 2, priority: 99 }),
      makeCard({ id: 3, priority: NaN }),
    ];
    // 全部回落到 0；绝不应出现 "P5" / "P99" / "PNaN" 标签所用的键。
    expect(countCardsByPriority(cards)).toEqual({ 0: 3 });
  });

  it('does not mutate input', () => {
    const cards = [makeCard({ id: 1, priority: 4 })];
    const snapshot = JSON.stringify(cards);
    countCardsByPriority(cards);
    expect(JSON.stringify(cards)).toBe(snapshot);
  });
});

describe('filterCardsByQuery', () => {
  it('matches title and description case-insensitively', () => {
    const cards = [
      makeCard({ id: 1, title: '设计稿', description: 'x' }),
      makeCard({ id: 2, title: 'a', description: '联调任务' }),
    ];
    expect(filterCardsByQuery('设计', cards).map((c) => c.id)).toEqual([1]);
    expect(filterCardsByQuery('联调', cards).map((c) => c.id)).toEqual([2]);
  });
  it('returns all cards for empty query', () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })];
    expect(filterCardsByQuery('   ', cards)).toEqual(cards);
  });
});

describe('sortCards', () => {
  it('sorts by priority descending without mutating input', () => {
    const cards = [
      makeCard({ id: 1, priority: 0, position: 0 }),
      makeCard({ id: 2, priority: 3, position: 1 }),
    ];
    const out = sortCards(cards, 'priority');
    expect(out.map((c) => c.id)).toEqual([2, 1]);
    expect(cards.map((c) => c.id)).toEqual([1, 2]);
  });
  it('sorts by dueDate with missing dates last', () => {
    const cards = [
      makeCard({ id: 1, dueDate: '2024-06-10T00:00:00.000Z' }),
      makeCard({ id: 2, dueDate: null }),
      makeCard({ id: 3, dueDate: '2024-06-01T00:00:00.000Z' }),
    ];
    expect(sortCards(cards, 'dueDate').map((c) => c.id)).toEqual([3, 1, 2]);
  });
});

describe('dueSoonCards / overdueCards', () => {
  it('dueSoon includes overdue and within-window incomplete cards', () => {
    const cards = [
      makeCard({ id: 1, dueDate: '2024-06-07T00:00:00.000Z', completed: 0 }), // 临期
      makeCard({ id: 2, dueDate: '2024-06-01T00:00:00.000Z', completed: 0 }), // 已逾期
      makeCard({ id: 3, dueDate: '2024-07-01T00:00:00.000Z', completed: 0 }), // 远未来
      makeCard({ id: 4, dueDate: '2024-06-01T00:00:00.000Z', completed: 1 }), // 已完成
      makeCard({ id: 5, dueDate: 'not-a-date', completed: 0 }), // 非法日期
    ];
    expect(dueSoonCards(cards, 3).map((c) => c.id)).toEqual([1, 2]);
  });
  it('overdue excludes completed and invalid dates', () => {
    const cards = [
      makeCard({ id: 1, dueDate: '2024-06-01T00:00:00.000Z', completed: 0 }),
      makeCard({ id: 2, dueDate: '2024-06-01T00:00:00.000Z', completed: 1 }),
    ];
    expect(overdueCards(cards).map((c) => c.id)).toEqual([1]);
  });
});

describe('filterCardsByPriority / filterCardsByCompleted', () => {
  it('filters by exact priority (null = all)', () => {
    const cards = [makeCard({ id: 1, priority: 2 }), makeCard({ id: 2, priority: 3 })];
    expect(filterCardsByPriority(cards, 2).map((c) => c.id)).toEqual([1]);
    expect(filterCardsByPriority(cards, null)).toEqual(cards);
  });
  it('filters incomplete only', () => {
    const cards = [makeCard({ id: 1, completed: 0 }), makeCard({ id: 2, completed: 1 })];
    expect(filterCardsByCompleted(cards, true).map((c) => c.id)).toEqual([1]);
  });
});

describe('formatDueLabel', () => {
  it('returns none for null and invalid', () => {
    expect(formatDueLabel(null).tone).toBe('none');
    expect(formatDueLabel('bad-date').tone).toBe('none');
  });
  it('classifies relative to fixed now', () => {
    const now = new Date('2024-06-05T12:00:00.000Z');
    expect(formatDueLabel('2024-06-04T00:00:00.000Z', now).tone).toBe('overdue');
    expect(formatDueLabel('2024-06-05T00:00:00.000Z', now).tone).toBe('today');
    expect(formatDueLabel('2024-06-07T00:00:00.000Z', now).tone).toBe('soon');
    expect(formatDueLabel('2024-06-20T00:00:00.000Z', now).tone).toBe('none');
  });
});

describe('countCardsByTag', () => {
  it('counts each tag occurrence, tolerant of missing tagIds', () => {
    const cards = [
      makeCard({ id: 1, tagIds: [1, 2] }),
      makeCard({ id: 2, tagIds: [2] }),
      makeCard({ id: 3 }),
    ];
    expect(countCardsByTag(cards)).toEqual({ 1: 1, 2: 2 });
  });
});
