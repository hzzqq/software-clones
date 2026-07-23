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

/** 从内容推导标题：首个 # 标题，否则首行。 */
export function deriveTitle(content: string): string {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim().slice(0, 120);
  const firstLine = content.trim().split('\n')[0]?.trim();
  if (firstLine) return firstLine.slice(0, 120);
  return '无标题笔记';
}

/** 统计内容中的代码块数量。 */
export function countCodeBlocks(text: string): number {
  return (text.match(/```/g) ?? []).length / 2;
}

/** 单个标题的结构（层级、原文、锚点 id）。 */
export interface Heading {
  level: number;
  text: string;
  id: string;
}

/** 将标题文本转为稳定锚点 id（去 HTML 标签 + 中文保留）。 */
export function slugifyHeading(text: string, index: number): string {
  const base =
    text
      .replace(/<[^>]+>/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9一-鿿]+/g, '-')
      .replace(/^-+|-+$/g, '') || `h${index}`;
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
