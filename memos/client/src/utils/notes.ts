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
    default:
      return '未知';
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

/**
 * 将字数格式化为紧凑可读形式：<1000 原样；>=1000 用「k」（保留 1 位小数，去 .0）；
 * >=1,000,000 用「M」。纯函数。用于字数较多的汇总场景，避免「12345 字」这类冗长展示。
 */
export function formatCharCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
  }
  const m = n / 1_000_000;
  return `${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10}M`;
}

/** Rough reading time in minutes (~200 chars/min, min 1 for non-empty content). */
export function estimateReading(content: string): number {
  if (!content) return 0;
  return Math.max(1, Math.round(countChars(content) / 200));
}

/**
 * CJK 感知的词数统计（与 countChars 互补）：中日韩字符按字符计，
 * 其余按空白分词，避免中文被算成「1 个词」。空内容返回 0。
 * 纯函数，不修改入参。用于笔记卡片/汇总中展示「词」维度。
 */
export function countWords(content: string): number {
  if (typeof content !== 'string' || content.trim() === '') return 0;
  const cjk = (content.match(/[㐀-䶿一-鿿぀-ヿ가-힯]/g) ?? []).length;
  const nonCjk = content
    .replace(/[㐀-䶿一-鿿぀-ヿ가-힯]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = nonCjk ? nonCjk.split(' ').length : 0;
  return cjk + words;
}

/**
 * 段落数统计：以空行分隔，忽略仅含空白的片段。
 * 空串/非字符串返回 0；单段无空行返回 1。
 */
export function countParagraphs(content: string): number {
  if (typeof content !== 'string' || content.trim() === '') return 0;
  const blocks = content
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  return blocks.length;
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

/**
 * 按标签筛选笔记：返回 tags 中包含 `tag` 的笔记（大小写不敏感的子串匹配）。
 * tag 为空或仅空白时返回全部；不修改入参。
 */
export function filterNotesByTag(notes: Note[], tag: string): Note[] {
  const needle = tag.trim().toLowerCase();
  if (!needle) return notes;
  return notes.filter((n) =>
    (n.tags ?? []).some((t) => t.toLowerCase().includes(needle))
  );
}

/**
 * 按可见性筛选笔记；visibility 为 null / '' / 'all' 时返回全部。
 * 与 filterNotesByTag / pinnedNotes / sortNotes 形成一组正交过滤器，便于按
 * 公开 / 受限 / 私有筛选当前列表。不修改入参（返回新数组）。
 */
export function filterNotesByVisibility(
  notes: Note[],
  visibility: Visibility | 'all' | '' | null,
): Note[] {
  const v = (visibility ?? '').toString().trim();
  if (!v || v === 'all') return notes;
  return notes.filter((n) => n.visibility === v);
}

/** 返回已置顶的笔记（pinned === true），不修改入参。 */
export function pinnedNotes(notes: Note[]): Note[] {
  return notes.filter((n) => n.pinned);
}

/** 将日期安全转为时间戳：非法 / 空值回退为 0（最早），避免排序出现 NaN。 */
function safeTime(value: string | undefined): number {
  const t = +new Date(value ?? '');
  return Number.isNaN(t) ? 0 : t;
}

/** 笔记排序方式。 */
export type NoteSortMode = 'newest' | 'oldest' | 'updated';

/**
 * 笔记排序：'newest' 按创建时间倒序，'oldest' 按创建时间正序，'updated' 按更新时间倒序。
 * 非法 / 空 createdAt / updatedAt 视为最早，排序稳定。不修改入参（返回新数组）。
 */
export function sortNotes(notes: Note[], mode: NoteSortMode = 'newest'): Note[] {
  const arr = [...notes];
  if (mode === 'oldest') arr.sort((a, b) => safeTime(a.createdAt) - safeTime(b.createdAt));
  else if (mode === 'updated') arr.sort((a, b) => safeTime(b.updatedAt) - safeTime(a.updatedAt));
  else arr.sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt));
  return arr;
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

/**
 * 将时间戳安全转为「本地时区」的 YYYY-MM 键（与卡片相对时间一致，避免 UTC 月份偏差）。
 * 非法 / 空值返回 ''，调用方据此跳过该笔记；不修改入参。
 */
export function monthKeyOf(iso: string): string {
  const d = new Date(iso);
  const t = d.getTime();
  if (!Number.isFinite(t)) return '';
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * 按创建月份（本地时区的 YYYY-MM）分组笔记，键按时间倒序（最新月份在前）。
 * 空入参返回 {}；createdAt 无法解析的笔记会被忽略；不修改入参。
 */
export function groupNotesByMonth(notes: Note[]): Record<string, Note[]> {
  const buckets: Record<string, Note[]> = {};
  for (const note of notes) {
    const prefix = monthKeyOf(note.createdAt);
    if (!prefix) continue;
    (buckets[prefix] ??= []).push(note);
  }
  const keys = Object.keys(buckets).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const ordered: Record<string, Note[]> = {};
  for (const key of keys) ordered[key] = buckets[key];
  return ordered;
}

/**
 * 将时间戳安全转为「本地时区」的 YYYY-MM-DD 键。
 * 非法 / 空值返回 ''，调用方据此跳过该笔记；不修改入参。
 */
export function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 把 YYYY-MM-DD 转成人类友好的分组标题：今天 / 昨天 / 原日期。
 * `now` 可注入，便于单测做确定性断言。
 */
export function dayLabel(dayKey: string, now: number = Date.now()): string {
  if (!dayKey) return '';
  const todayKey = dayKeyOf(new Date(now).toISOString());
  const yesterdayKey = dayKeyOf(new Date(now - 24 * 60 * 60 * 1000).toISOString());
  if (dayKey === todayKey) return '今天';
  if (dayKey === yesterdayKey) return '昨天';
  return dayKey;
}

/**
 * 按创建日期（本地时区 YYYY-MM-DD）分组笔记，键按时间倒序（最新的一天在前）。
 * 相比按月分组，日视图更贴合「今天 / 昨天写了什么」的回顾习惯。
 * 空入参返回 {}；createdAt 无法解析的笔记会被忽略；不修改入参。
 */
export function groupNotesByDay(notes: Note[]): Record<string, Note[]> {
  const buckets: Record<string, Note[]> = {};
  for (const note of notes) {
    const key = dayKeyOf(note.createdAt);
    if (!key) continue;
    (buckets[key] ??= []).push(note);
  }
  const keys = Object.keys(buckets).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const ordered: Record<string, Note[]> = {};
  for (const key of keys) ordered[key] = buckets[key];
  return ordered;
}

/**
 * 从笔记正文提取标题：取第一段非空行，去除开头 # 标题符号与首尾空白。
 * 空内容 / 全空白 / 无有效行返回 ''。用于列表卡片展示标题而非整段正文。
 */
export function extractTitle(content: string): string {
  const lines = (content ?? '').split('\n');
  for (const line of lines) {
    const t = line.trim().replace(/^#+\s*/, '').trim();
    if (t) return t;
  }
  return '';
}

/**
 * 生成列表预览文本：折叠全部空白为单空格并去除首尾空白，超长按 max 截断加省略号。
 * 用于笔记卡片，避免超长正文（含换行）撑爆卡片布局（真实 UX / 性能兜底）。
 * 空内容返回 ''；不修改入参。
 */
export function truncatePreview(content: string, max = 140): string {
  const flat = (content ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max - 1) + '…';
}

/** 高亮片段：text 为原文字，match 表示是否命中查询词。 */
export interface TextSegment {
  text: string;
  match: boolean;
}

/**
 * 将文本按查询词切片为交替的 {text, match} 片段（大小写不敏感，支持 CJK 子串）。
 * 用于安全渲染搜索高亮：调用方用 <mark> 包裹 match 片段即可，无需 dangerouslySetInnerHTML。
 * 查询词为空 / 仅空白或原文为空时：返回单个非匹配片段（空文返回 []）。
 * 采用线性扫描，命中部分不重叠切分；不修改入参。
 */
export function highlightSegments(text: string, query: string): TextSegment[] {
  const q = (query ?? '').trim();
  if (!q) return text ? [{ text, match: false }] : [];
  const lower = (text ?? '').toLowerCase();
  const lq = q.toLowerCase();
  const segments: TextSegment[] = [];
  let i = 0;
  let prev = 0;
  while (i < text.length) {
    const idx = lower.indexOf(lq, i);
    if (idx === -1) break;
    if (idx > prev) segments.push({ text: text.slice(prev, idx), match: false });
    segments.push({ text: text.slice(idx, idx + lq.length), match: true });
    i = idx + lq.length;
    prev = i;
  }
  if (prev < text.length) segments.push({ text: text.slice(prev), match: false });
  return segments;
}

/** 命中区间 [start, end)，内部使用。 */
interface MatchRange {
  start: number;
  end: number;
}

/**
 * 找出所有查询词在文本中的命中区间，并把重叠 / 相邻接触的区间合并。
 * 结果按起点升序，且互不重叠——这是多词高亮不出现「标签套标签」的前提。
 */
function collectRanges(text: string, queries: string[]): MatchRange[] {
  const lower = text.toLowerCase();
  const ranges: MatchRange[] = [];
  for (const raw of queries) {
    const q = (raw ?? '').trim().toLowerCase();
    if (!q) continue;
    let from = 0;
    while (from <= lower.length - q.length) {
      const idx = lower.indexOf(q, from);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + q.length });
      // 允许同一位置被不同词覆盖，但同一个词按不重叠推进，避免死循环。
      from = idx + q.length;
    }
  }
  if (ranges.length === 0) return [];
  ranges.sort((a, b) => (a.start - b.start) || (a.end - b.end));
  const merged: MatchRange[] = [ranges[0]];
  for (let i = 1; i < ranges.length; i += 1) {
    const last = merged[merged.length - 1];
    const cur = ranges[i];
    if (cur.start <= last.end) {
      // 重叠或首尾相接：扩展上一段，保证输出区间互不重叠。
      if (cur.end > last.end) last.end = cur.end;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/**
 * 多关键词高亮：把文本切成交替的 {text, match} 片段（大小写不敏感、支持 CJK 子串）。
 * 与单词版 highlightSegments 的区别是支持「北京 会议」这类多词查询，
 * 重叠命中会自动合并，不会产生嵌套或重复片段。
 * queries 为空 / 全为空白时：非空文本返回单个非匹配片段，空文本返回 []。
 * 纯函数，不修改入参。
 */
export function highlightSegmentsMulti(text: string, queries: string[]): TextSegment[] {
  const src = text ?? '';
  const list = Array.isArray(queries) ? queries : [];
  if (!src) return [];
  const ranges = collectRanges(src, list);
  if (ranges.length === 0) return [{ text: src, match: false }];

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) segments.push({ text: src.slice(cursor, r.start), match: false });
    segments.push({ text: src.slice(r.start, r.end), match: true });
    cursor = r.end;
  }
  if (cursor < src.length) segments.push({ text: src.slice(cursor), match: false });
  return segments;
}

/**
 * 命中上下文摘要：在长正文里定位第一个命中位置，截取其前后各 radius 个字符，
 * 两端按需加省略号。搜索结果里能直接看到「命中的那句话」，而不是永远只看开头。
 * 未命中（或无查询词）时退化为开头截断，行为与 truncatePreview 一致。
 * 会先把连续空白折叠成单空格，避免换行撑乱卡片布局。纯函数。
 */
export function snippetAround(text: string, queries: string[], radius: number = 60): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  const r = Number.isFinite(radius) && radius > 0 ? Math.floor(radius) : 60;
  const list = Array.isArray(queries) ? queries : [];
  const ranges = collectRanges(flat, list);
  if (ranges.length === 0) {
    const max = r * 2;
    return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
  }
  const first = ranges[0];
  const start = Math.max(0, first.start - r);
  const end = Math.min(flat.length, first.end + r);
  const head = start > 0 ? '…' : '';
  const tail = end < flat.length ? '…' : '';
  return `${head}${flat.slice(start, end)}${tail}`;
}
