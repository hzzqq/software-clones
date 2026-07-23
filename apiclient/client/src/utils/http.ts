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

/** 由请求草稿生成可复制的 curl 命令（含 query/headers/body，多行拼接）。 */
export function buildCurlCommand(input: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
}): string {
  const hasParams = input.params && Object.keys(input.params).length > 0;
  const url = hasParams
    ? `${input.url}?${new URLSearchParams(input.params as Record<string, string>).toString()}`
    : input.url;
  const parts = [`curl -X ${input.method} '${url}'`];
  for (const [k, v] of Object.entries(input.headers ?? {})) {
    parts.push(`  -H '${k}: ${v.replace(/'/g, "'\\''")}'`);
  }
  if (input.body) {
    parts.push(`  -d '${input.body.replace(/'/g, "'\\''")}'`);
  }
  return parts.join(' \\\n');
}
