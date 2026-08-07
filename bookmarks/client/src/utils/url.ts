/**
 * URL 归一化工具（与 server/src/lib/url.ts 同构，供表单预览 / 前端校验使用）。
 * 服务端是去重的最终权威，前端主要用于即时反馈。
 */

const PROTOCOL_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;
const DEFAULT_PORTS: Record<string, string> = { 'http:': '80', 'https:': '443' };

function stripTrailingSlashes(url: URL): void {
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }
  if (url.pathname === '/') {
    url.pathname = '';
  }
}

/** 把用户输入规范化为可打开的 URL；空输入或无法解析时返回空串。 */
export function normalizeUrl(raw: string): string {
  const value = (raw ?? '').trim();
  if (!value) {
    return '';
  }
  const withScheme: string = PROTOCOL_RE.test(value) ? value : `http://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return value;
  }
  url.hostname = url.hostname.toLowerCase();
  if (DEFAULT_PORTS[url.protocol] === url.port) {
    url.port = '';
  }
  stripTrailingSlashes(url);
  url.hash = '';
  // URL API 对空路径始终输出结尾斜杠（http://example.com/），
  // 这里显式去掉，保证「根路径不带斜杠」的规范形态。
  if (url.pathname === '' || url.pathname === '/') {
    url.pathname = '';
    return url.origin + url.search;
  }
  return url.toString();
}

/** 生成去重键：忽略协议、www 前缀、默认端口、结尾斜杠与锚点。 */
export function urlKey(normalized: string): string {
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return normalized.toLowerCase();
  }
  url.protocol = 'https:';
  let host: string = url.hostname.toLowerCase();
  if (host.startsWith('www.')) {
    host = host.slice(4);
  }
  url.hostname = host;
  url.port = '';
  stripTrailingSlashes(url);
  url.hash = '';
  if (url.pathname === '' || url.pathname === '/') {
    url.pathname = '';
    return url.origin.replace(/^https:\/\//, '') + url.search;
  }
  return url.toString().replace(/^https:\/\//, '');
}

/** 提取主机名；失败返回空串。 */
export function extractDomain(normalized: string): string {
  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** 生成站点 favicon 地址（https://<domain>/favicon.ico）。 */
export function faviconUrl(normalized: string): string {
  const domain = extractDomain(normalized);
  return domain ? `https://${domain}/favicon.ico` : '';
}
