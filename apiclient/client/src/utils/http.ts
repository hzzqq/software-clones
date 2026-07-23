/**
 * HTTP 工具纯函数：headers 文本与对象互转、状态分类、URL 拼接。
 * 不依赖网络，便于单元测试。
 */

/** 将 "Key: Value" 多行文本解析为对象。兼容 Windows CRLF（\r 不会残留在值里）。 */
export function parseHeadersText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k) out[k] = v;
    }
  }
  return out;
}

/** 将对象序列化为 "Key: Value" 多行文本。 */
export function headersToText(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/** 将 key=value 多行文本解析为对象（用于 query params）。兼容 Windows CRLF。 */
export function parseKeyValueText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k) out[k] = v;
    }
  }
  return out;
}

/** 根据状态码返回颜色语义：success / warning / error。 */
export function statusKind(status: number): 'success' | 'warning' | 'error' | 'info' {
  if (status === 0) return 'error';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  return 'error';
}

/** 简单 JSON 美化（失败则原样返回）。 */
export function tryPrettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** 侧栏集合项按 方法/名称/URL 匹配关键字（空白匹配全部）。 */
export function matchRequest(
  needle: string,
  r: { method: string; name?: string; url: string },
): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return `${r.method} ${r.name ?? ''} ${r.url}`.toLowerCase().includes(n);
}

/** 侧栏历史项按 方法/URL/状态码 匹配关键字（空白匹配全部）。 */
export function matchHistory(
  needle: string,
  h: { method: string; url: string; status: number },
): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return `${h.method} ${h.url} ${h.status}`.toLowerCase().includes(n);
}

/** 将 query params 拼接到 baseUrl，返回完整请求 URL（无 params 时原样返回）。 */
export function buildUrlWithQuery(baseUrl: string, params: Record<string, string> = {}): string {
  const hasParams = params && Object.keys(params).length > 0;
  if (!hasParams) return baseUrl;
  const qs = new URLSearchParams(params).toString();
  return baseUrl.includes('?') ? `${baseUrl}&${qs}` : `${baseUrl}?${qs}`;
}

/** 由请求草稿生成可复制的 curl 命令（含 query/headers/body，多行拼接）。 */
export function buildCurlCommand(input: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
}): string {
  const url = buildUrlWithQuery(input.url, input.params ?? {});
  const parts = [`curl -X ${input.method} '${url}'`];
  for (const [k, v] of Object.entries(input.headers ?? {})) {
    parts.push(`  -H '${k}: ${v.replace(/'/g, "'\\''")}'`);
  }
  if (input.body) {
    parts.push(`  -d '${input.body.replace(/'/g, "'\\''")}'`);
  }
  return parts.join(' \\\n');
}

/** 请求类条目排序维度。 */
export type RequestSort = 'name' | 'method' | 'createdAt' | 'updatedAt';

/**
 * 对「请求类」条目（集合项 / 历史项通用）排序，不修改入参。
 * - name：按 名称或URL 升序（无名称置后）
 * - method：按方法名升序，同名再按名称
 * - createdAt / updatedAt：按时间倒序（最新在前）
 */
export function sortRequests<T extends {
  method: string;
  name?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}>(items: T[], by: RequestSort = 'name'): T[] {
  const arr = [...items];
  if (by === 'name') {
    return arr.sort((a, b) => {
      const la = (a.name ?? a.url ?? '').trim().toLowerCase();
      const lb = (b.name ?? b.url ?? '').trim().toLowerCase();
      if (!la && !lb) return 0;
      if (!la) return 1;
      if (!lb) return -1;
      return la.localeCompare(lb);
    });
  }
  if (by === 'method') {
    return arr.sort((a, b) => {
      const r = a.method.localeCompare(b.method);
      if (r !== 0) return r;
      const la = (a.name ?? a.url ?? '').toLowerCase();
      const lb = (b.name ?? b.url ?? '').toLowerCase();
      return la.localeCompare(lb);
    });
  }
  // createdAt / updatedAt 倒序
  const key = by;
  return arr.sort((a, b) => {
    const ta = a[key] ?? '';
    const tb = b[key] ?? '';
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return tb.localeCompare(ta);
  });
}

/** 常见方法的 canonical 顺序，用于分组展示时排序。 */
const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * 按 HTTP 方法分组（不修改入参）。
 * 组内保持原始插入顺序；组间按 METHOD_ORDER 排列，其余方法按字典序排在最后。
 */
export function groupByMethod<T extends { method: string }>(items: T[]): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const it of items) {
    const m = (it.method || 'UNKNOWN').toUpperCase();
    (map[m] ||= []).push(it);
  }
  const ordered: Record<string, T[]> = {};
  const seen = new Set<string>();
  for (const m of METHOD_ORDER) {
    if (map[m]) {
      ordered[m] = map[m];
      seen.add(m);
    }
  }
  for (const m of Object.keys(map).sort()) {
    if (!seen.has(m)) ordered[m] = map[m];
  }
  return ordered;
}
