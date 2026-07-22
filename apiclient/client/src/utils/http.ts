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
