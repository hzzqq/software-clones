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
