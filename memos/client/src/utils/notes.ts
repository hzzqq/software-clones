import { Visibility, Note } from '../types';

/** Extract inline #tags and @mentions (lower-cased, de-duped). */
export function parseTags(content: string): string[] {
  const matches = content.match(/[#@]([\p{L}\p{N}_]+)/gu) ?? [];
  const seen = new Set<string>();
  for (const m of matches) seen.add(m.slice(1).toLowerCase());
  return Array.from(seen);
}

export function visibilityLabel(v: Visibility): string {
  switch (v) {
    case 'public':
      return '公开';
    case 'protected':
      return '受限';
    case 'private':
      return '私有';
  }
}

/** Chinese relative-time formatter used in note cards. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  // Future timestamps (e.g. clock skew) collapse to "刚刚" instead of negative units.
  if (diff < 0) return '刚刚';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} 个月前`;
  const year = Math.floor(day / 365);
  return `${year} 年前`;
}

/** Count of non-whitespace characters (works for both CJK and Latin text). */
export function countChars(content: string): number {
  return content.replace(/\s/g, '').length;
}

/** Rough reading time in minutes (~200 chars/min, min 1 for non-empty content). */
export function estimateReading(content: string): number {
  if (!content) return 0;
  return Math.max(1, Math.round(countChars(content) / 200));
}

/**
 * 按标签聚合笔记数量（标签小写去重），返回 标签 -> 数量 的映射。
 * 笔记若没有标签则不计入；同一标签出现在多篇笔记则累加。
 */
export function groupNotesByTag(notes: Note[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const note of notes) {
    for (const raw of note.tags ?? []) {
      const tag = raw.toLowerCase();
      if (!tag) continue;
      result[tag] = (result[tag] ?? 0) + 1;
    }
  }
  return result;
}

/** 返回已置顶的笔记（pinned === true），不修改入参。 */
export function pinnedNotes(notes: Note[]): Note[] {
  return notes.filter((n) => n.pinned);
}

/**
 * 置顶笔记排在前面（稳定排序，组内保持原相对顺序），不修改入参。
 * 配合「仅看置顶」开关使用，确保置顶项始终优先可见。
 */
export function sortNotesByPinned(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

/** 笔记统计概览。 */
export interface NotesSummary {
  total: number;
  totalChars: number;
  tagTotal: number;
}

/** 汇总笔记：总数、总字数、标签数（不修改入参）。 */
export function summarizeNotes(notes: Note[]): NotesSummary {
  const totalChars = notes.reduce((sum, n) => sum + countChars(n.content), 0);
  const tagCounts = groupNotesByTag(notes);
  return { total: notes.length, totalChars, tagTotal: Object.keys(tagCounts).length };
}
