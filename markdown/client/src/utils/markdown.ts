/**
 * Markdown 笔记纯函数工具：标签解析、字数统计、标题推导。
 * 不依赖网络 / DOM，便于单元测试。
 */
import type { Note } from '../types';

/** 从文本提取 #标签。 */
export function parseTags(text: string): string[] {
  const matches = text.match(/#([\p{L}\p{N}_-]+)/gu) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const tag = m.slice(1).toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

/** 去除 markdown 语法符号后统计可读字数。 */
export function countWords(text: string): number {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~\-]+/g, ' ')
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ')
    .trim();
  if (!cleaned) return 0;
  // 中日韩文字按字符计，其余按空白分词（避免中文被算成 1 个词）。
  const cjk = (cleaned.match(/[㐀-䶿一-鿿぀-ヿ가-힯]/g) ?? []).length;
  const nonCjk = cleaned
    .replace(/[㐀-䶿一-鿿぀-ヿ가-힯]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = nonCjk ? nonCjk.split(' ').length : 0;
  return cjk + words;
}

/** 估算阅读时长（分钟），中文约 250 字/分钟折中。至少 1 分钟。 */
export function estimateReadingTime(text: string): number {
  return Math.max(1, Math.round(countWords(text) / 250));
}

/**
 * 将时间格式化为中文相对时间（"刚刚 / N 分钟前 / N 小时前 / N 天前 / N 周前"），
 * 超过约 5 周则退化为「M 月 D 日」。纯函数，不修改入参。
 * - `now` 可注入以便测试；默认取当前时间。
 * - 非法输入（无法解析为日期）或未来时间返回空串，避免展示无意义文案。
 */
export function formatRelativeTime(input: Date | string | number, now: Date = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  const t = d.getTime();
  if (Number.isNaN(t)) return '';
  const diff = now.getTime() - t;
  if (diff < 0) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} 周前`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** 从内容推导标题：首个 # 标题，否则首行。 */
export function deriveTitle(content: string): string {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim().slice(0, 120);
  const firstLine = content.trim().split('\n')[0]?.trim();
  if (firstLine) return firstLine.slice(0, 120);
  return '无标题笔记';
}

/** 统计内容中的代码块数量（成对 ``` 计 1 个，向下取整以容忍未闭合的围栏）。 */
export function countCodeBlocks(text: string): number {
  return Math.floor((text.match(/```/g) ?? []).length / 2);
}

/** 单个标题的结构（层级、原文、锚点 id）。 */
export interface Heading {
  level: number;
  text: string;
  id: string;
}

/**
 * 将任意标题文本转为 URL 安全的锚点 id（纯函数，不修改入参）。
 * 规则：小写 → NFD 去重音符号 → 非 [a-z0-9\u4e00-\u9fa5-] 的字符替换为 '-'
 * → 合并连续 '-' → 去除首尾 '-'。
 */
export function sluggify(heading: string): string {
  return heading
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // 去除变音符号（如 é→e）
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 将标题文本转为稳定锚点 id（去 HTML 标签 + 中文保留）。复用 sluggify 集中逻辑。 */
export function slugifyHeading(text: string, index: number): string {
  const base = sluggify(text.replace(/<[^>]+>/g, '')) || `h${index}`;
  return `${base}-${index}`;
}

/**
 * 从 markdown 内容提取 H1–H3 标题（跳过代码块内的 # 注释）。
 * 顺序与渲染后的 <h1>/<h2>/<h3> 一一对应，便于生成锚点。
 */
export function extractHeadings(content: string): Heading[] {
  const lines = content.split('\n');
  const out: Heading[] = [];
  let inFence = false;
  let idx = 0;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.+)$/.exec(line);
    if (m) {
      const text = m[2].trim();
      out.push({ level: m[1].length, text: text.replace(/<[^>]+>/g, ''), id: slugifyHeading(text, idx++) });
    }
  }
  return out;
}

/** 侧栏笔记排序：置顶优先，其次按更新时间倒序。 */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return +new Date(b.updatedAt) - +new Date(a.updatedAt);
  });
}

/**
 * 按文件夹过滤笔记：folder 为空或 'all' 时返回全部，否则按精确匹配过滤。
 * 笔记 folder 为空字符串时归入「未分类」。
 */
export function filterNotesByFolder(notes: Note[], folder: string): Note[] {
  const f = folder.trim();
  if (!f || f === 'all') return notes;
  return notes.filter((n) => (n.folder ?? '').trim() === f);
}

/** 单个 Markdown 链接（文本 + 地址）。 */
export interface MdLink {
  text: string;
  url: string;
}

/**
 * 从 markdown 内容提取链接（跳过图片链接 ![...] 与代码块内的链接），按 url 去重。
 * 仅匹配 http/https 协议，避免匹配相对路径或锚点。
 */
export function extractLinks(content: string): MdLink[] {
  const lines = content.split('\n');
  const out: MdLink[] = [];
  const seen = new Set<string>();
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const re = /(!?)\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (m[1] === '!') continue; // 跳过图片
      const url = m[3];
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ text: m[2].trim(), url });
    }
  }
  return out;
}

/** 笔记列表统计概览。 */
export interface NotesSummary {
  total: number;
  totalWords: number;
  tagTotal: number;
}

/**
 * 智能截断文本：不超过 max 个字符（按 code unit 计，对 CJK 友好），超出则追加省略号。
 * 纯函数，不修改入参。
 * - 文本长度 <= max 时原样返回；
 * - 否则保留 max - ellipsis.length 个字符并追加省略号；
 * - 当 max 小于省略号长度时直接截取前 max 个字符（避免负长度 slice）。
 */
export function truncateText(text: string, max: number, ellipsis = '…'): string {
  if (text.length <= max) return text;
  if (max < ellipsis.length) return text.slice(0, max);
  return text.slice(0, max - ellipsis.length) + ellipsis;
}

/** 汇总笔记列表：总篇数、总字数、标签总数（去重，小写归一）。不修改入参。 */
export function summarizeNotes(notes: Note[]): NotesSummary {
  const tagSet = new Set<string>();
  let totalWords = 0;
  for (const n of notes) {
    totalWords += countWords(n.content ?? '');
    for (const t of n.tags ?? []) {
      if (t) tagSet.add(t.toLowerCase());
    }
  }
  return { total: notes.length, totalWords, tagTotal: tagSet.size };
}
