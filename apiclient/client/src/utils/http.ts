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

/** 命中这些响应/请求头的 key 时，其值视为敏感信息需要脱敏。 */
const SENSITIVE_HEADER_RE =
  /^(authorization|proxy-authorization|token|cookie|set-cookie|secret|apikey|api-key|x-api-key)$/i;

/**
 * 对含敏感信息的请求/响应头脱敏：命中 SENSITIVE_HEADER_RE 的 key，其值替换为掩码。
 * 纯函数，不修改入参。用于在 UI 展示响应头时避免意外暴露 Cookie / Token 等凭据。
 */
export function redactSensitiveHeaders(
  headers: Record<string, string>,
  mask = '••••••••'
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADER_RE.test(k) ? mask : v;
  }
  return out;
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

/** 响应体媒体类型分类（用于展示标签与格式化决策）。 */
export type ResponseMediaType = 'json' | 'html' | 'xml' | 'text' | 'other';

/**
 * 依据响应头 Content-Type 推断响应体的媒体类型。
 * - 不区分大小写，并忽略 "; charset=..." 等后缀。
 * - 找不到 content-type 头时回退 'other'。
 * - 纯函数，不修改入参。
 */
export function getResponseMediaType(headers: Record<string, string>): ResponseMediaType {
  const ct = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1];
  if (!ct) return 'other';
  const mime = ct.split(';')[0].trim().toLowerCase();
  if (mime.includes('json')) return 'json';
  if (mime.includes('html')) return 'html';
  if (mime.includes('xml')) return 'xml';
  if (mime.includes('text')) return 'text';
  return 'other';
}

/**
 * 依据 Content-Type 选择响应体的展示文本：
 * - json 类型自动美化（失败则原样返回）。
 * - 其余类型原样返回（HTML/XML/纯文本无需额外处理）。
 * 纯函数，不修改入参。
 */
export function formatResponseBody(body: string, headers: Record<string, string>): string {
  return getResponseMediaType(headers) === 'json' ? tryPrettyJson(body) : body;
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

/** 解析 URL 查询串为对象。"a=1&b=2&c=%20" → {a:'1', b:'2', c:' '}。
 *  - 每个值均经 decodeURIComponent 解码（如 %20 → 空格）。
 *  - 忽略 key 为空或整体为空的片段；'' 或 '?' 均返回 {}。
 *  - 不以任何方式修改入参 qs。 */
export function parseQueryString(qs: string): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = qs.startsWith('?') ? qs.slice(1) : qs;
  if (!raw) return out;
  for (const pair of raw.split('&')) {
    if (!pair) continue; // 空片段（&& 之间）忽略
    const idx = pair.indexOf('=');
    if (idx <= 0) continue; // 无 = 或 key 为空，忽略
    const k = decodeURIComponent(pair.slice(0, idx));
    const v = decodeURIComponent(pair.slice(idx + 1));
    if (!k) continue;
    out[k] = v;
  }
  return out;
}

/** 将 query params 拼接到 baseUrl，返回完整请求 URL（无 params 时原样返回）。
 *  若 baseUrl 自身已含查询串，先用 parseQueryString 解析后与新参数合并（新参数覆盖同名旧参数）。 */
export function buildUrlWithQuery(baseUrl: string, params: Record<string, string> = {}): string {
  const hasParams = params && Object.keys(params).length > 0;
  if (!hasParams) return baseUrl;

  const qIndex = baseUrl.indexOf('?');
  const base = qIndex >= 0 ? baseUrl.slice(0, qIndex) : baseUrl;
  const existing = qIndex >= 0 ? parseQueryString(baseUrl.slice(qIndex + 1)) : {};
  const merged = { ...existing, ...params };
  const qs = new URLSearchParams(merged).toString();
  return `${base}?${qs}`;
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

/** 状态码 → 可读文案（兼容未知码与 0=网络错误）。 */
const STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
  307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
  405: 'Method Not Allowed', 408: 'Request Timeout', 409: 'Conflict', 422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway',
  503: 'Service Unavailable', 504: 'Gateway Timeout',
};

export function statusText(status: number): string {
  if (status === 0) return '网络错误';
  return STATUS_TEXT[status] ?? `状态码 ${status}`;
}

/** 状态码 → 分类中文（按百位数字）：2xx 成功 / 3xx 重定向 / 4xx 客户端错误 / 5xx 服务端错误 / 其他 未知。 */
export function statusFamily(code: number): '成功' | '重定向' | '客户端错误' | '服务端错误' | '未知' {
  switch (Math.floor(code / 100)) {
    case 2:
      return '成功';
    case 3:
      return '重定向';
    case 4:
      return '客户端错误';
    case 5:
      return '服务端错误';
    default:
      return '未知';
  }
}

/** 判断是否为合法的 http/https 绝对地址（用于请求 URL 即时校验）。 */
export function isValidHttpUrl(raw: string): boolean {
  const url: string = raw.trim();
  if (!url) return false;
  try {
    const u: URL = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 计算字符串的 UTF-8 字节长度。
 *
 * 注意：JS 字符串的 `.length` 返回的是 UTF-16 码元数，对多字节字符（如中文）
 * 会显著小于真实字节数。直接用 `.length` 当作「字节数」展示是隐性 bug，
 * 这里改用 TextEncoder 计算真实字节数。
 */
export function byteLengthOf(str: string): number {
  if (!str) return 0;
  return new TextEncoder().encode(str).length;
}

/**
 * 将字节数格式化为易读文本：B / KB / MB / GB。
 * - 负数 / NaN 回退到 '0 B'。
 * - 不足 1 KB 显示整数 B；其余保留两位小数（去尾随 .00）。
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = Math.round(value * 100) / 100;
  const text = String(parseFloat(rounded.toFixed(2)));
  return `${text} ${units[unit]}`;
}
