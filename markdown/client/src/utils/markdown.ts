/**
 * Markdown 笔记纯函数工具：标签解析、字数统计、标题推导。
 * 不依赖网络 / DOM，便于单元测试。
 */

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
