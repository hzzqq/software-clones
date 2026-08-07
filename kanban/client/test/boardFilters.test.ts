import { describe, it, expect } from 'vitest';
import {
  searchCards,
  filterCardsByTags,
  filterCardsByDueRange,
  wipState,
  wipLabel,
  applyCardFilters,
  hasActiveFilters,
  DUE_RANGE_LABELS,
  type DueRange,
} from '../src/utils/filterCards';
import type { Card, ChecklistItem, Tag } from '../src/types';

function mkCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    listId: 1,
    title: '卡片',
    description: '',
    dueDate: null,
    priority: 0,
    completed: 0,
    assignee: '',
    position: 0,
    createdAt: '',
    updatedAt: '',
    tagIds: [],
    checklist: [],
    ...overrides,
  };
}

function mkItem(text: string): ChecklistItem {
  return { id: 1, cardId: 1, text, done: 0, position: 0, createdAt: '' };
}

const TAGS: Tag[] = [
  { id: 10, boardId: 1, name: '紧急', color: '#ef4444' },
  { id: 20, boardId: 1, name: 'backend', color: '#3b82f6' },
];

describe('searchCards', () => {
  const cards: Card[] = [
    mkCard({ id: 1, title: '登录页', description: '实现 OAuth' }),
    mkCard({ id: 2, title: '支付', assignee: '小王' }),
    mkCard({ id: 3, title: '重构', tagIds: [20] }),
    mkCard({ id: 4, title: '导出', checklist: [mkItem('对接 CSV 下载')] }),
    mkCard({ id: 5, title: '巡检', tagIds: [10] }),
  ];

  it('returns all cards for an empty query', () => {
    expect(searchCards(cards, '   ', TAGS)).toHaveLength(5);
    expect(searchCards(cards, '', TAGS)).toHaveLength(5);
  });

  it('matches the title', () => {
    expect(searchCards(cards, '支付', TAGS).map((c) => c.id)).toEqual([2]);
  });

  it('matches the description case-insensitively', () => {
    expect(searchCards(cards, 'oauth', TAGS).map((c) => c.id)).toEqual([1]);
  });

  it('matches the assignee', () => {
    expect(searchCards(cards, '小王', TAGS).map((c) => c.id)).toEqual([2]);
  });

  it('matches tag names', () => {
    expect(searchCards(cards, 'backend', TAGS).map((c) => c.id)).toEqual([3]);
    expect(searchCards(cards, '紧急', TAGS).map((c) => c.id)).toEqual([5]);
  });

  it('matches checklist item text', () => {
    expect(searchCards(cards, 'csv', TAGS).map((c) => c.id)).toEqual([4]);
  });

  it('degrades gracefully when no tags are supplied', () => {
    expect(searchCards(cards, 'backend').map((c) => c.id)).toEqual([]);
    expect(searchCards(cards, '支付').map((c) => c.id)).toEqual([2]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchCards(cards, 'zzz', TAGS)).toHaveLength(0);
  });

  it('does not mutate the input', () => {
    const before = cards.map((c) => c.id);
    searchCards(cards, '支付', TAGS);
    expect(cards.map((c) => c.id)).toEqual(before);
  });
});

describe('filterCardsByTags', () => {
  const cards: Card[] = [
    mkCard({ id: 1, tagIds: [10, 20] }),
    mkCard({ id: 2, tagIds: [20] }),
    mkCard({ id: 3, tagIds: [] }),
  ];

  it('returns all cards when no tag is selected', () => {
    expect(filterCardsByTags(cards, [])).toHaveLength(3);
  });

  it('OR mode keeps cards matching any selected tag', () => {
    expect(filterCardsByTags(cards, [10, 20], 'or').map((c) => c.id)).toEqual([1, 2]);
  });

  it('AND mode requires every selected tag', () => {
    expect(filterCardsByTags(cards, [10, 20], 'and').map((c) => c.id)).toEqual([1]);
  });

  it('defaults to OR mode', () => {
    expect(filterCardsByTags(cards, [10, 20]).map((c) => c.id)).toEqual([1, 2]);
  });

  it('returns empty when nothing matches in AND mode', () => {
    expect(filterCardsByTags(cards, [10, 99], 'and')).toHaveLength(0);
  });

  it('does not mutate the input', () => {
    const before = cards.map((c) => c.id);
    filterCardsByTags(cards, [20], 'and');
    expect(cards.map((c) => c.id)).toEqual(before);
  });
});

describe('filterCardsByDueRange', () => {
  // 固定参考时间：2026-07-23 10:00 本地时区。
  const now = new Date(2026, 6, 23, 10, 0, 0);
  const iso = (y: number, m: number, d: number): string => new Date(y, m, d, 9, 0, 0).toISOString();

  const cards: Card[] = [
    mkCard({ id: 1, dueDate: iso(2026, 6, 21) }), // 2 天前 → 逾期
    mkCard({ id: 2, dueDate: iso(2026, 6, 23) }), // 今天
    mkCard({ id: 3, dueDate: iso(2026, 6, 28) }), // 5 天后
    mkCard({ id: 4, dueDate: iso(2026, 7, 30) }), // 远未来
    mkCard({ id: 5, dueDate: null }), // 无截止
    mkCard({ id: 6, dueDate: 'not-a-date' }), // 非法
  ];

  it('all → returns everything untouched', () => {
    expect(filterCardsByDueRange(cards, 'all', now)).toHaveLength(6);
  });

  it('overdue → only dates before today', () => {
    expect(filterCardsByDueRange(cards, 'overdue', now).map((c) => c.id)).toEqual([1]);
  });

  it('today → only the same calendar day', () => {
    expect(filterCardsByDueRange(cards, 'today', now).map((c) => c.id)).toEqual([2]);
  });

  it('week → today through 7 days ahead, inclusive', () => {
    expect(filterCardsByDueRange(cards, 'week', now).map((c) => c.id)).toEqual([2, 3]);
  });

  it('has → any valid due date', () => {
    expect(filterCardsByDueRange(cards, 'has', now).map((c) => c.id)).toEqual([1, 2, 3, 4]);
  });

  it('none → missing or invalid dates', () => {
    expect(filterCardsByDueRange(cards, 'none', now).map((c) => c.id)).toEqual([5, 6]);
  });

  it('treats an empty-string due date as "none"', () => {
    const c = [mkCard({ id: 9, dueDate: '' })];
    expect(filterCardsByDueRange(c, 'none', now)).toHaveLength(1);
    expect(filterCardsByDueRange(c, 'has', now)).toHaveLength(0);
  });

  it('exposes a label for every range', () => {
    const ranges: DueRange[] = ['all', 'overdue', 'today', 'week', 'has', 'none'];
    for (const r of ranges) expect(DUE_RANGE_LABELS[r]).toBeTruthy();
  });

  it('does not mutate the input', () => {
    const before = cards.map((c) => c.id);
    filterCardsByDueRange(cards, 'today', now);
    expect(cards.map((c) => c.id)).toEqual(before);
  });
});

describe('wipState / wipLabel', () => {
  it('is off when the limit is unset or non-positive', () => {
    expect(wipState(5, 0)).toBe('off');
    expect(wipState(5, -1)).toBe('off');
    expect(wipState(5, Number.NaN)).toBe('off');
    expect(wipLabel(5, 0)).toBe('');
  });

  it('is ok below the limit', () => {
    expect(wipState(2, 3)).toBe('ok');
  });

  it('is near exactly at the limit', () => {
    expect(wipState(3, 3)).toBe('near');
  });

  it('is over above the limit', () => {
    expect(wipState(4, 3)).toBe('over');
  });

  it('clamps dirty counts to 0', () => {
    expect(wipState(-5, 3)).toBe('ok');
    expect(wipState(Number.NaN, 3)).toBe('ok');
    expect(wipLabel(Number.NaN, 3)).toBe('0/3');
  });

  it('formats as count/limit', () => {
    expect(wipLabel(2, 5)).toBe('2/5');
  });
});

describe('applyCardFilters', () => {
  const now = new Date(2026, 6, 23, 10, 0, 0);
  const iso = (y: number, m: number, d: number): string => new Date(y, m, d, 9, 0, 0).toISOString();

  const cards: Card[] = [
    mkCard({ id: 1, title: '登录', priority: 3, tagIds: [10], dueDate: iso(2026, 6, 23) }),
    mkCard({ id: 2, title: '登录回归', priority: 1, tagIds: [10, 20], completed: 1 }),
    mkCard({ id: 3, title: '支付', priority: 3, tagIds: [20], dueDate: iso(2026, 6, 21) }),
    mkCard({ id: 4, title: '文档', priority: 0 }),
  ];

  it('returns everything with no criteria', () => {
    expect(applyCardFilters(cards, {}, TAGS, now)).toHaveLength(4);
    expect(applyCardFilters(cards, undefined, TAGS, now)).toHaveLength(4);
  });

  it('combines query and priority', () => {
    const out = applyCardFilters(cards, { query: '登录', priority: 3 }, TAGS, now);
    expect(out.map((c) => c.id)).toEqual([1]);
  });

  it('combines tags in AND mode with onlyIncomplete', () => {
    const out = applyCardFilters(
      cards,
      { tagIds: [10, 20], tagMode: 'and', onlyIncomplete: true },
      TAGS,
      now
    );
    expect(out).toHaveLength(0);
  });

  it('combines due range with a query', () => {
    const out = applyCardFilters(cards, { dueRange: 'overdue' }, TAGS, now);
    expect(out.map((c) => c.id)).toEqual([3]);
  });

  it('filters out completed cards when onlyIncomplete is set', () => {
    const out = applyCardFilters(cards, { onlyIncomplete: true }, TAGS, now);
    expect(out.map((c) => c.id)).toEqual([1, 3, 4]);
  });

  it('tolerates a non-array input', () => {
    expect(applyCardFilters(null as unknown as Card[], { query: 'x' }, TAGS, now)).toEqual([]);
  });

  it('does not mutate the input', () => {
    const before = cards.map((c) => c.id);
    applyCardFilters(cards, { query: '登录', onlyIncomplete: true }, TAGS, now);
    expect(cards.map((c) => c.id)).toEqual(before);
  });
});

describe('hasActiveFilters', () => {
  it('is false for an empty criteria object', () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters()).toBe(false);
  });

  it('is false for explicit neutral values', () => {
    expect(
      hasActiveFilters({
        query: '  ',
        tagIds: [],
        priority: null,
        dueRange: 'all',
        onlyIncomplete: false,
      })
    ).toBe(false);
  });

  it('detects each active dimension', () => {
    expect(hasActiveFilters({ query: 'a' })).toBe(true);
    expect(hasActiveFilters({ tagIds: [1] })).toBe(true);
    expect(hasActiveFilters({ priority: 0 })).toBe(true);
    expect(hasActiveFilters({ dueRange: 'today' })).toBe(true);
    expect(hasActiveFilters({ onlyIncomplete: true })).toBe(true);
  });
});
