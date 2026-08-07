/**
 * 响应查看辅助：JSON 结构拍平、结构统计与文本检索。
 * 目的是让「大 JSON 响应里找某个字段」不再靠肉眼滚动。
 * 全部为纯函数，不依赖 DOM。
 */

export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

/** 拍平后的单行：路径、类型、值预览、层级深度。 */
export interface FlatRow {
  path: string;
  type: JsonValueType;
  preview: string;
  depth: number;
}

/** 判定 JSON 值的类型标签。 */
export function jsonTypeOf(value: unknown): JsonValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'object') return 'object';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'string';
}

/** 生成值的简短预览文本（容器显示元素/键数量，标量显示值本身，超长截断）。 */
export function previewOf(value: unknown, maxLen = 80): string {
  const type = jsonTypeOf(value);
  if (type === 'array') return `[ ${(value as unknown[]).length} 项 ]`;
  if (type === 'object') return `{ ${Object.keys(value as object).length} 个键 }`;
  if (type === 'null') return 'null';
  const raw = type === 'string' ? String(value) : String(value);
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
}

/** 拼接子路径：数组用 `[i]`，合法标识符用 `.key`，其余用 `["key"]`。 */
export function joinPath(parent: string, key: string | number): string {
  if (typeof key === 'number') return `${parent}[${key}]`;
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return parent ? `${parent}.${key}` : key;
  const escaped = key.replace(/"/g, '\\"');
  return `${parent}["${escaped}"]`;
}

/**
 * 把 JSON 文本拍平成「路径 → 值」行列表（深度优先，保持原始键顺序）。
 * - 文本不是合法 JSON 时返回 null（调用方据此隐藏「结构」页签）。
 * - 超过 limit 行后停止展开，避免超大响应卡死界面。
 * - 根节点路径为 `$`。
 */
export function flattenJson(text: string, limit = 500): FlatRow[] | null {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    return null;
  }

  const rows: FlatRow[] = [];
  const walk = (value: unknown, path: string, depth: number): void => {
    if (rows.length >= limit) return;
    rows.push({ path, type: jsonTypeOf(value), preview: previewOf(value), depth });
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        if (rows.length >= limit) return;
        walk(value[i], joinPath(path, i), depth + 1);
      }
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (rows.length >= limit) return;
        walk(v, joinPath(path, k), depth + 1);
      }
    }
  };

  walk(root, '$', 0);
  return rows;
}

/** 按路径或值预览过滤拍平结果（大小写不敏感；空关键字返回全部）。 */
export function filterFlatRows(rows: FlatRow[], needle: string): FlatRow[] {
  const n = (needle ?? '').trim().toLowerCase();
  if (!n) return rows;
  return rows.filter(
    (r) => r.path.toLowerCase().includes(n) || r.preview.toLowerCase().includes(n),
  );
}

/** JSON 结构概览：是否合法、节点数、最大深度。 */
export interface JsonSummary {
  valid: boolean;
  nodes: number;
  depth: number;
}

/** 统计 JSON 文本的节点数与最大深度（非法 JSON 返回 valid=false）。 */
export function summarizeJson(text: string): JsonSummary {
  const rows = flattenJson(text, Number.MAX_SAFE_INTEGER);
  if (rows === null) return { valid: false, nodes: 0, depth: 0 };
  let depth = 0;
  for (const r of rows) if (r.depth > depth) depth = r.depth;
  return { valid: true, nodes: rows.length, depth };
}

/** 统计子串出现次数（空关键字返回 0；不使用正则，避免特殊字符问题）。 */
export function countOccurrences(text: string, needle: string): number {
  if (!text || !needle) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const idx = text.indexOf(needle, from);
    if (idx === -1) break;
    count += 1;
    from = idx + needle.length;
  }
  return count;
}

/** 只保留包含关键字的行（用于大响应体的快速定位）。空关键字返回原文。 */
export function filterLines(text: string, needle: string): string {
  const n = (needle ?? '').trim();
  if (!n) return text;
  const lower = n.toLowerCase();
  return (text ?? '')
    .split('\n')
    .filter((line) => line.toLowerCase().includes(lower))
    .join('\n');
}

/** 响应头排序为稳定的表格行（键名升序，便于对比两次响应）。 */
export function headerRows(headers: Record<string, string>): Array<[string, string]> {
  return Object.entries(headers ?? {}).sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase()),
  );
}
