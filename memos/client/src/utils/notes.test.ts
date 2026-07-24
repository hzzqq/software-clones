import { describe, it, expect } from 'vitest';
import { parseTags, formatRelativeTime, visibilityLabel, groupNotesByTag, filterNotesByTag, pinnedNotes, sortNotesByPinned, summarizeNotes, groupNotesByMonth, formatCharCount } from './notes';
import { Visibility, Note } from '../types';

describe('parseTags', () => {
  it('extracts #tags and @mentions lower-cased and de-duped', () => {
    expect(parseTags('hello #Work and #work @alice #Plan')).toEqual([
      'work',
      'alice',
      'plan',
    ]);
  });
  it('returns empty for plain text', () => {
    expect(parseTags('just a normal note')).toEqual([]);
  });
});

describe('visibilityLabel', () => {
  it('maps values to Chinese labels', () => {
    expect(visibilityLabel('public' as Visibility)).toBe('公开');
    expect(visibilityLabel('protected' as Visibility)).toBe('受限');
    expect(visibilityLabel('private' as Visibility)).toBe('私有');
  });
  it('未知可见性回退为「未知」而非 undefined', () => {
    expect(visibilityLabel('weird' as unknown as Visibility)).toBe('未知');
  });
});

describe('formatCharCount', () => {
  it('千以下原样', () => {
    expect(formatCharCount(0)).toBe('0');
    expect(formatCharCount(999)).toBe('999');
  });
  it('千位用 k，去 .0', () => {
    expect(formatCharCount(1000)).toBe('1k');
    expect(formatCharCount(1500)).toBe('1.5k');
    expect(formatCharCount(12345)).toBe('12k');
  });
  it('百万位用 M', () => {
    expect(formatCharCount(1_000_000)).toBe('1M');
    expect(formatCharCount(2_500_000)).toBe('2.5M');
  });
  it('非法/负值回退 0', () => {
    expect(formatCharCount(-5)).toBe('0');
    expect(formatCharCount(Number.NaN)).toBe('0');
  });
});

describe('formatRelativeTime', () => {
  it('returns 刚刚 for < 1 min', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('刚刚');
  });
  it('formats minutes / hours / days', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 5 * 60 * 1000).toISOString())).toBe('5 分钟前');
    expect(formatRelativeTime(new Date(now - 3 * 3600 * 1000).toISOString())).toBe('3 小时前');
    expect(formatRelativeTime(new Date(now - 2 * 86400 * 1000).toISOString())).toBe('2 天前');
  });
  it('formats months and years', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 60 * 86400 * 1000).toISOString())).toBe('2 个月前');
    expect(formatRelativeTime(new Date(now - 400 * 86400 * 1000).toISOString())).toBe('1 年前');
  });
  it('returns empty string for invalid input', () => {
    expect(formatRelativeTime('')).toBe('');
    expect(formatRelativeTime('not-a-date')).toBe('');
  });
  it('treats future timestamps as 刚刚 (clock skew guard)', () => {
    const future = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(future)).toBe('刚刚');
  });
});

describe('groupNotesByTag', () => {
  const notes: Note[] = [
    { id: 1, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: ['Work', 'Idea'] },
    { id: 2, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: ['work', 'Plan'] },
    { id: 3, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: [] },
  ];
  it('标签小写去重并累加数量', () => {
    expect(groupNotesByTag(notes)).toEqual({ work: 2, idea: 1, plan: 1 });
  });
  it('空标签不计，空数组返回空对象', () => {
    expect(groupNotesByTag([])).toEqual({});
  });
});

describe('pinnedNotes', () => {
  const notes: Note[] = [
    { id: 1, content: '', visibility: 'private', pinned: true, archived: false, createdAt: '', updatedAt: '', tags: [] },
    { id: 2, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: [] },
    { id: 3, content: '', visibility: 'private', pinned: true, archived: false, createdAt: '', updatedAt: '', tags: [] },
  ];
  it('仅返回已置顶的笔记', () => {
    expect(pinnedNotes(notes).map((n) => n.id)).toEqual([1, 3]);
  });
  it('无置顶时返回空数组', () => {
    expect(pinnedNotes([notes[1]])).toEqual([]);
  });
  it('不修改入参', () => {
    const before = notes.map((n) => n.id);
    pinnedNotes(notes);
    expect(notes.map((n) => n.id)).toEqual(before);
  });
});

describe('sortNotesByPinned', () => {
  const notes: Note[] = [
    { id: 1, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: [] },
    { id: 2, content: '', visibility: 'private', pinned: true, archived: false, createdAt: '', updatedAt: '', tags: [] },
    { id: 3, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: [] },
    { id: 4, content: '', visibility: 'private', pinned: true, archived: false, createdAt: '', updatedAt: '', tags: [] },
  ];
  it('置顶笔记排在最前', () => {
    expect(sortNotesByPinned(notes).map((n) => n.id)).toEqual([2, 4, 1, 3]);
  });
  it('组内保持原相对顺序（稳定排序）', () => {
    const r = sortNotesByPinned(notes);
    expect(r.slice(0, 2).map((n) => n.id)).toEqual([2, 4]);
    expect(r.slice(2).map((n) => n.id)).toEqual([1, 3]);
  });
  it('全部未置顶时顺序不变', () => {
    const flat = notes.map((n) => ({ ...n, pinned: false }));
    expect(sortNotesByPinned(flat).map((n) => n.id)).toEqual([1, 2, 3, 4]);
  });
  it('不修改入参', () => {
    const before = notes.map((n) => n.id);
    sortNotesByPinned(notes);
    expect(notes.map((n) => n.id)).toEqual(before);
  });
});

describe('filterNotesByTag', () => {
  const notes: Note[] = [
    { id: 1, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: ['Work', 'Idea'] },
    { id: 2, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: ['work', 'Plan'] },
    { id: 3, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: ['Reading'] },
    { id: 4, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: [] },
  ];
  it('匹配包含该标签的笔记（大小写不敏感）', () => {
    expect(filterNotesByTag(notes, 'work').map((n) => n.id)).toEqual([1, 2]);
    expect(filterNotesByTag(notes, 'WORK').map((n) => n.id)).toEqual([1, 2]);
  });
  it('子串匹配也能命中', () => {
    expect(filterNotesByTag(notes, 'ea').map((n) => n.id)).toEqual([1, 3]);
  });
  it('无匹配时返回空数组', () => {
    expect(filterNotesByTag(notes, 'nope')).toEqual([]);
  });
  it('空/空白标签返回全部', () => {
    expect(filterNotesByTag(notes, '').map((n) => n.id)).toEqual([1, 2, 3, 4]);
    expect(filterNotesByTag(notes, '   ').map((n) => n.id)).toEqual([1, 2, 3, 4]);
  });
  it('不修改入参', () => {
    const before = notes.map((n) => n.id);
    filterNotesByTag(notes, 'work');
    expect(notes.map((n) => n.id)).toEqual(before);
  });
});

describe('groupNotesByMonth', () => {
  const notes: Note[] = [
    { id: 1, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '2024-03-15T10:00:00.000Z', updatedAt: '', tags: [] },
    { id: 2, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '2024-03-02T08:00:00.000Z', updatedAt: '', tags: [] },
    { id: 3, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '2024-01-20T12:00:00.000Z', updatedAt: '', tags: [] },
    { id: 4, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '2024-01-05T09:00:00.000Z', updatedAt: '', tags: [] },
    { id: 5, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '2023-12-31T23:00:00.000Z', updatedAt: '', tags: [] },
  ];
  it('按 YYYY-MM 分到不同月份', () => {
    const grouped = groupNotesByMonth(notes);
    expect(Object.keys(grouped).sort()).toEqual(['2023-12', '2024-01', '2024-03']);
    expect(grouped['2024-03'].map((n) => n.id)).toEqual([1, 2]);
    expect(grouped['2024-01'].map((n) => n.id)).toEqual([3, 4]);
    expect(grouped['2023-12'].map((n) => n.id)).toEqual([5]);
  });
  it('键按时间倒序（最新月份在前）', () => {
    expect(Object.keys(groupNotesByMonth(notes))).toEqual(['2024-03', '2024-01', '2023-12']);
  });
  it('空入参返回空对象', () => {
    expect(groupNotesByMonth([])).toEqual({});
  });
  it('不修改入参（顺序与内容均不变）', () => {
    const before = notes.map((n) => n.id);
    const grouped = groupNotesByMonth(notes);
    expect(notes.map((n) => n.id)).toEqual(before);
    // 每个桶内的笔记保持原相对顺序
    expect(grouped['2024-03'].map((n) => n.id)).toEqual([1, 2]);
    expect(grouped['2024-01'].map((n) => n.id)).toEqual([3, 4]);
  });
  it('忽略无法解析为 YYYY-MM 的 createdAt', () => {
    const dirty: Note[] = [
      { id: 1, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: [] },
      { id: 2, content: '', visibility: 'private', pinned: false, archived: false, createdAt: 'not-a-date', updatedAt: '', tags: [] },
    ];
    expect(groupNotesByMonth(dirty)).toEqual({});
  });
});

describe('summarizeNotes', () => {
  const notes: Note[] = [
    { id: 1, content: '你好 世界', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: ['a', 'b'] },
    { id: 2, content: 'hello world', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: ['b'] },
    { id: 3, content: '', visibility: 'private', pinned: false, archived: false, createdAt: '', updatedAt: '', tags: [] },
  ];
  it('汇总总数与总字数（忽略空白）', () => {
    const s = summarizeNotes(notes);
    expect(s.total).toBe(3);
    // 「你好 世界」=4 非空白字符，「hello world」=10 非空白字符，空串=0
    expect(s.totalChars).toBe(14);
  });
  it('标签去重计数', () => {
    expect(summarizeNotes(notes).tagTotal).toBe(2);
  });
  it('空列表为零', () => {
    const s = summarizeNotes([]);
    expect(s.total).toBe(0);
    expect(s.totalChars).toBe(0);
    expect(s.tagTotal).toBe(0);
  });
  it('不修改入参', () => {
    const before = notes.map((n) => n.id);
    summarizeNotes(notes);
    expect(notes.map((n) => n.id)).toEqual(before);
  });
});
