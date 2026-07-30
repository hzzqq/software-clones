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
