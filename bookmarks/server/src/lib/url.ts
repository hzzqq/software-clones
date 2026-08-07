/**
 * URL 归一化工具。
 *
 * 两个层次：
 *  - `normalizeUrl`：把用户输入整理成可展示 / 可打开的规范地址（补协议、小写主机、
 *    去掉默认端口与结尾斜杠、去掉锚点）。存入 `bookmarks.url`。
 *  - `urlKey`：在 `normalizeUrl` 结果之上进一步忽略 `www.` 前缀、http/https 协议差异
 *    与默认端口，生成**去重键**（存入 `bookmarks.url_key`，UNIQUE 约束）。
 *
 * 这样既保证「www.example.com」与「https://example.com/」视为同一条书签（防重复），
 * 又保留用户输入的协议与 www 前缀用于真实打开页面。
 */

const PROTOCOL_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;
const DEFAULT_PORTS: Record<string, string> = { 'http:': '80', 'https:': '443' };

/** 去掉路径末尾多余的斜杠（保留根路径为空）。 */
function stripTrailingSlashes(url: URL): void {
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }
  if (url.pathname === '/') {
    url.pathname = '';
  }
}

/**
 * 把用户输入规范化为可打开的 URL。
 *  - 空输入返回空串；
 *  - 缺少协议时补 `http://`；
 *  - 主机名小写；去掉默认端口（http:80 / https:443）；
 *  - 去掉结尾斜杠与锚点；
 *  - 无法解析时原样返回 trim 后的输入。
 */
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

/**
 * 生成去重键：忽略协议（http/https 视为同一）、忽略 `www.` 前缀、
 * 忽略默认端口、忽略结尾斜杠与锚点，主机名小写。
 * 传入的 `normalized` 应来自 {@link normalizeUrl}。
 */
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

/** 从归一化 URL 中提取主机名（用于 favicon）。解析失败返回空串。 */
export function extractDomain(normalized: string): string {
  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return '';
  }
}
