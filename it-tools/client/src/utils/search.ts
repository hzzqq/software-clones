import type { ToolModule } from '../tools/types';

/**
 * 归一化搜索词：小写 + 折叠空白 + 剥离变音符号（重音）。
 * 让 "  JSON  " / "Café" 等都能稳定命中，纯函数、无副作用。
 */
export function normalizeQuery(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Case-insensitive filter across title, description and category.
 * Returns the original list untouched when the query is blank.
 */
export function filterTools(query: string, tools: ToolModule[]): ToolModule[] {
  const q = normalizeQuery(query);
  if (!q) return tools;
  return tools.filter(
    (t) =>
      normalizeQuery(t.title).includes(q) ||
      normalizeQuery(t.description ?? '').includes(q) ||
      normalizeQuery(t.category).includes(q)
  );
}

export type ToolSort = 'title' | 'key';

/**
 * 返回按指定字段排序的新数组（不修改入参）。
 * - 'title'：按标题（忽略大小写）字典序
 * - 'key'：按稳定 key（忽略大小写）字典序
 */
export function sortTools(tools: ToolModule[], by: ToolSort = 'title'): ToolModule[] {
  return [...tools].sort((a, b) => {
    const av = (by === 'key' ? a.key : a.title).toLowerCase();
    const bv = (by === 'key' ? b.key : b.title).toLowerCase();
    return av.localeCompare(bv);
  });
}

/**
 * 按分类分组（不修改入参），组内保持原始顺序。
 * 返回对象的键即为分类名；空列表返回空对象。
 */
export function groupToolsByCategory(tools: ToolModule[]): Record<string, ToolModule[]> {
  const map: Record<string, ToolModule[]> = {};
  for (const t of tools) {
    (map[t.category] ||= []).push(t);
  }
  return map;
}

/** 工具统计概览。 */
export interface ToolsSummary {
  total: number;
  categories: number;
  byCategory: Record<string, number>;
}

/** 汇总工具：总数、分类数、各分类数量（不修改入参）。 */
export function summarizeTools(tools: ToolModule[]): ToolsSummary {
  const byCategory: Record<string, number> = {};
  for (const t of tools) byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
  return { total: tools.length, categories: Object.keys(byCategory).length, byCategory };
}

/**
 * 经典 Levenshtein 编辑距离（大小写不敏感比较）。
 * 空串处理：distance('', n) = n。纯函数，无副作用。
 */
export function levenshtein(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * 容错搜索：在 title / category / description 中
 * 1) 命中子串（忽略大小写）立即返回；
 * 2) 否则按词级编辑距离 ≤ maxDistance 模糊匹配（纠正拼写/拼音近似）。
 * 空查询返回原列表。不修改入参。
 */
export function fuzzyMatchTools(
  tools: ToolModule[],
  query: string,
  maxDistance = 1
): ToolModule[] {
  const q = normalizeQuery(query);
  if (!q) return tools;
  return tools.filter((tool) => {
    const hay = normalizeQuery([tool.title, tool.category, tool.description ?? ''].join(' '));
    if (hay.includes(q)) return true;
    return hay
      .split(/\s+/)
      .some((token) => token.length > 0 && levenshtein(q, token) <= maxDistance);
  });
}
