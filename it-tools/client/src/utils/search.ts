import type { ToolModule } from '../tools/types';

/**
 * Case-insensitive filter across title, description and category.
 * Returns the original list untouched when the query is blank.
 */
export function filterTools(query: string, tools: ToolModule[]): ToolModule[] {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false) ||
      t.category.toLowerCase().includes(q)
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
