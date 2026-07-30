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
 * 判断某工具是否为已收藏项（收藏判定）。
 * 入参 favoriteIds 既可为 string[] 也可为 Set<string>，函数内部做防御性识别，
 * 不依赖调用方传入的具体集合类型；纯函数、无副作用、绝不修改入参。
 */
export function isFavoriteTool(favoriteIds: string[] | Set<string>, toolId: string): boolean {
  if (favoriteIds instanceof Set) {
    return favoriteIds.has(toolId);
  }
  if (Array.isArray(favoriteIds)) {
    return favoriteIds.includes(toolId);
  }
  return false;
}

/**
 * 分类显示标签映射表：将注册表中的分类标识映射为更紧凑的中文标题。
 * 仅登记需要重写展示形态的分类（如 '加密与哈希' → '加密·哈希'），
 * 其余分类保持原样，便于将来新增分类时无需改动此表。
 */
const CATEGORY_LABELS: Record<string, string> = {
  '加密与哈希': '加密·哈希',
  '日期时间': '日期·时间',
};

/**
 * 将分类标识映射为抽屉中展示的中文标签；未登记的分类原样返回（passthrough）。
 * 纯函数、无副作用、不修改入参。
 */
export function toolCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
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

/**
 * 将字符串数组格式化为中文列举串：「a、b、c」。
 * - 0 项 → 空串 ''。
 * - 1 项 → 该项原样返回。
 * - ≥2 项 → 用 separator（默认 '、'）连接，末两项之间用 lastSep（默认 separator）连接。
 * 入参非数组按空数组处理，单项非字符串按 String() 转换。
 * 用于收藏夹/历史等「共 N 个工具：a、b、c」类友好展示。
 */
export function formatList(
  items: (string | null | undefined)[] | null | undefined,
  separator = '、',
  lastSep?: string,
): string {
  if (!Array.isArray(items)) return '';
  const list = items.filter((x) => x != null).map((x) => String(x));
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  const sep = lastSep ?? separator;
  const head = list.slice(0, -1).join(separator);
  return head + sep + list[list.length - 1];
}
