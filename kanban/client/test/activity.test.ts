import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_LABELS,
  MAX_COMMENT_LENGTH,
  activityKindLabel,
  formatActivityText,
  formatAuthor,
  groupActivitiesByDay,
  isComment,
  sortActivitiesDesc,
  summarizeActivity,
  validateComment,
} from '../src/utils/activity';
import { Activity, ActivityKind } from '../src/types';

function makeActivity(over: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    cardId: 10,
    kind: 'created',
    detail: '创建了卡片',
    author: '',
    createdAt: '2026-01-05T10:00:00.000Z',
    ...over,
  };
}

describe('activityKindLabel', () => {
  it('covers every declared kind', () => {
    const kinds: ActivityKind[] = [
      'created',
      'moved',
      'renamed',
      'due',
      'priority',
      'assignee',
      'completed',
      'batch',
      'comment',
    ];
    for (const k of kinds) {
      expect(ACTIVITY_LABELS[k]).toBeTruthy();
      expect(activityKindLabel(k)).toBe(ACTIVITY_LABELS[k]);
    }
  });

  it('falls back for unknown kinds instead of rendering undefined', () => {
    expect(activityKindLabel('what-is-this')).toBe('操作');
  });
});

describe('isComment', () => {
  it('only reports true for comment records', () => {
    expect(isComment(makeActivity({ kind: 'comment' }))).toBe(true);
    expect(isComment(makeActivity({ kind: 'moved' }))).toBe(false);
    expect(isComment(makeActivity({ kind: 'batch' }))).toBe(false);
  });
});

describe('formatActivityText', () => {
  it('returns the raw body for comments', () => {
    const a = makeActivity({ kind: 'comment', detail: '  这里需要补个截图  ' });
    expect(formatActivityText(a)).toBe('这里需要补个截图');
  });

  it('returns the server detail for system events', () => {
    const a = makeActivity({ kind: 'moved', detail: '从「待办」移动到「进行中」' });
    expect(formatActivityText(a)).toBe('从「待办」移动到「进行中」');
  });

  it('falls back to the kind label when detail is blank', () => {
    expect(formatActivityText(makeActivity({ kind: 'due', detail: '   ' }))).toBe('调整截止日');
    expect(formatActivityText(makeActivity({ kind: 'priority', detail: '' }))).toBe('调整优先级');
  });

  it('keeps comments empty when the body is blank (never shows a fake label)', () => {
    expect(formatActivityText(makeActivity({ kind: 'comment', detail: '  ' }))).toBe('');
  });
});

describe('formatAuthor', () => {
  it('trims and falls back to 匿名', () => {
    expect(formatAuthor('  阿伟 ')).toBe('阿伟');
    expect(formatAuthor('')).toBe('匿名');
    expect(formatAuthor('   ')).toBe('匿名');
    expect(formatAuthor(null)).toBe('匿名');
    expect(formatAuthor(undefined)).toBe('匿名');
  });
});

describe('validateComment', () => {
  it('accepts trimmed non-empty text', () => {
    const r = validateComment('  今天先做这个  ');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('今天先做这个');
    expect(r.error).toBe('');
  });

  it('rejects empty / whitespace-only / nullish input', () => {
    for (const bad of ['', '   ', '\n\t ', null, undefined]) {
      const r = validateComment(bad);
      expect(r.ok).toBe(false);
      expect(r.value).toBe('');
      expect(r.error).toBe('评论内容不能为空');
    }
  });

  it('rejects text longer than the server limit', () => {
    const r = validateComment('x'.repeat(MAX_COMMENT_LENGTH + 1));
    expect(r.ok).toBe(false);
    expect(r.error).toContain(String(MAX_COMMENT_LENGTH));
  });

  it('accepts text exactly at the limit', () => {
    expect(validateComment('x'.repeat(MAX_COMMENT_LENGTH)).ok).toBe(true);
  });
});

describe('sortActivitiesDesc', () => {
  it('puts the newest record first', () => {
    const list: Activity[] = [
      makeActivity({ id: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeActivity({ id: 2, createdAt: '2026-01-03T00:00:00.000Z' }),
      makeActivity({ id: 3, createdAt: '2026-01-02T00:00:00.000Z' }),
    ];
    expect(sortActivitiesDesc(list).map((a) => a.id)).toEqual([2, 3, 1]);
  });

  it('breaks ties on id so the order is stable', () => {
    const list: Activity[] = [
      makeActivity({ id: 5, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeActivity({ id: 9, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeActivity({ id: 7, createdAt: '2026-01-01T00:00:00.000Z' }),
    ];
    expect(sortActivitiesDesc(list).map((a) => a.id)).toEqual([9, 7, 5]);
  });

  it('does not mutate the input array', () => {
    const list: Activity[] = [
      makeActivity({ id: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeActivity({ id: 2, createdAt: '2026-01-03T00:00:00.000Z' }),
    ];
    sortActivitiesDesc(list);
    expect(list.map((a) => a.id)).toEqual([1, 2]);
  });

  it('treats invalid timestamps as the oldest', () => {
    const list: Activity[] = [
      makeActivity({ id: 1, createdAt: 'not-a-date' }),
      makeActivity({ id: 2, createdAt: '2026-01-01T00:00:00.000Z' }),
    ];
    expect(sortActivitiesDesc(list).map((a) => a.id)).toEqual([2, 1]);
  });

  it('returns an empty array for empty input', () => {
    expect(sortActivitiesDesc([])).toEqual([]);
  });
});

describe('groupActivitiesByDay', () => {
  const now = new Date('2026-01-05T12:00:00.000Z').getTime();

  it('labels today and yesterday, keeps other days as dates', () => {
    const list: Activity[] = [
      makeActivity({ id: 1, createdAt: '2026-01-05T09:00:00.000Z' }),
      makeActivity({ id: 2, createdAt: '2026-01-04T09:00:00.000Z' }),
      makeActivity({ id: 3, createdAt: '2026-01-01T09:00:00.000Z' }),
    ];
    const groups = groupActivitiesByDay(list, now);
    expect(groups.map((g) => g.label)).toEqual(['今天', '昨天', '2026-01-01']);
    expect(groups.map((g) => g.day)).toEqual(['2026-01-05', '2026-01-04', '2026-01-01']);
  });

  it('keeps newest-first ordering both across and inside groups', () => {
    const list: Activity[] = [
      makeActivity({ id: 1, createdAt: '2026-01-04T08:00:00.000Z' }),
      makeActivity({ id: 2, createdAt: '2026-01-05T08:00:00.000Z' }),
      makeActivity({ id: 3, createdAt: '2026-01-05T11:00:00.000Z' }),
    ];
    const groups = groupActivitiesByDay(list, now);
    expect(groups[0].items.map((a) => a.id)).toEqual([3, 2]);
    expect(groups[1].items.map((a) => a.id)).toEqual([1]);
  });

  it('collects unparseable timestamps into a dedicated group', () => {
    const list: Activity[] = [
      makeActivity({ id: 1, createdAt: 'garbage' }),
      makeActivity({ id: 2, createdAt: '2026-01-05T08:00:00.000Z' }),
    ];
    const groups = groupActivitiesByDay(list, now);
    const unknown = groups.find((g) => g.day === 'unknown');
    expect(unknown).toBeDefined();
    expect(unknown?.label).toBe('时间未知');
    expect(unknown?.items.map((a) => a.id)).toEqual([1]);
  });

  it('returns an empty array for empty input', () => {
    expect(groupActivitiesByDay([], now)).toEqual([]);
  });
});

describe('summarizeActivity', () => {
  it('splits comments from system events', () => {
    const list: Activity[] = [
      makeActivity({ id: 1, kind: 'created' }),
      makeActivity({ id: 2, kind: 'comment' }),
      makeActivity({ id: 3, kind: 'comment' }),
      makeActivity({ id: 4, kind: 'moved' }),
    ];
    expect(summarizeActivity(list)).toEqual({ total: 4, comments: 2, events: 2 });
  });

  it('handles an empty timeline', () => {
    expect(summarizeActivity([])).toEqual({ total: 0, comments: 0, events: 0 });
  });
});
