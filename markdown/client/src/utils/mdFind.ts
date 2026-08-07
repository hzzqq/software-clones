/**
 * 查找 / 替换纯函数（cycle 263）。
 *
 * 编辑器里的查找替换需要「命中列表 + 当前命中下标 + 逐个/全部替换」三件套，
 * 这里全部抽成纯函数：输入文本与选项，输出命中区间，UI 只负责把区间映射为
 * textarea 的 setSelectionRange。不依赖 DOM，可直接单测。
 */

/** 查找选项。 */
export interface FindOptions {
  /** 大小写敏感，默认 false。 */
  caseSensitive?: boolean;
  /** 全词匹配（两侧必须是非单词字符），默认 false。 */
  wholeWord?: boolean;
}

/** 单个命中区间（左闭右开，与 slice 语义一致）。 */
export interface FindMatch {
  start: number;
  end: number;
}

/** 转义正则元字符，使任意用户输入都能作为字面量安全匹配。 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 判断字符是否为「单词字符」（用于全词匹配边界判定，含中日韩以避免误切）。 */
function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[\p{L}\p{N}_]/u.test(ch);
}

/**
 * 查找全部命中区间。
 * - query 为空 / 空白无意义时返回空数组（避免零长度死循环）。
 * - 支持大小写敏感与全词匹配；重叠命中按「找到即从命中末尾继续」处理。
 * 纯函数，不修改入参。
 */
export function findMatches(text: string, query: string, options: FindOptions = {}): FindMatch[] {
  const out: FindMatch[] = [];
  if (typeof text !== 'string' || typeof query !== 'string' || query.length === 0) return out;

  const caseSensitive = options.caseSensitive === true;
  const wholeWord = options.wholeWord === true;
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();

  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    const end = idx + needle.length;
    if (wholeWord) {
      const before = idx > 0 ? text[idx - 1] : undefined;
      const after = end < text.length ? text[end] : undefined;
      if (isWordChar(before) || isWordChar(after)) {
        from = idx + 1;
        continue;
      }
    }
    out.push({ start: idx, end });
    from = end;
  }
  return out;
}

/** 命中总数（等价 findMatches().length，用于状态栏计数，避免调用方重复分配数组语义）。 */
export function countMatches(text: string, query: string, options: FindOptions = {}): number {
  return findMatches(text, query, options).length;
}

/**
 * 计算「下一个 / 上一个」命中在命中数组中的下标。
 * - 命中为空返回 -1。
 * - forward=true：返回第一个 start >= cursor 的命中，越界回绕到 0。
 * - forward=false：返回最后一个 end <= cursor 的命中，越界回绕到末尾。
 */
export function nextMatchIndex(matches: FindMatch[], cursor: number, forward = true): number {
  if (matches.length === 0) return -1;
  if (forward) {
    for (let i = 0; i < matches.length; i++) {
      if (matches[i].start >= cursor) return i;
    }
    return 0;
  }
  for (let i = matches.length - 1; i >= 0; i--) {
    if (matches[i].end <= cursor) return i;
  }
  return matches.length - 1;
}

/**
 * 替换单个命中区间，返回新文本与替换后光标应处的位置。
 * 区间非法（越界或倒置）时原样返回，光标停在原处。
 */
export function replaceMatch(
  text: string,
  match: FindMatch,
  replacement: string,
): { text: string; cursor: number } {
  if (!match || match.start < 0 || match.end > text.length || match.start > match.end) {
    return { text, cursor: Math.min(Math.max(match?.start ?? 0, 0), text.length) };
  }
  const next = text.slice(0, match.start) + replacement + text.slice(match.end);
  return { text: next, cursor: match.start + replacement.length };
}

/**
 * 全部替换。返回新文本与实际替换次数。
 * 从后往前替换以避免下标漂移；query 为空时不做任何改动。
 */
export function replaceAll(
  text: string,
  query: string,
  replacement: string,
  options: FindOptions = {},
): { text: string; count: number } {
  const matches = findMatches(text, query, options);
  if (matches.length === 0) return { text, count: 0 };
  let out = text;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    out = out.slice(0, m.start) + replacement + out.slice(m.end);
  }
  return { text: out, count: matches.length };
}

/** 由 0 基下标生成「第 n / 共 m」的展示文案；无命中返回「无匹配」。 */
export function formatMatchCounter(index: number, total: number): string {
  if (total <= 0) return '无匹配';
  const n = index < 0 ? 1 : index + 1;
  return `第 ${n} / 共 ${total}`;
}
