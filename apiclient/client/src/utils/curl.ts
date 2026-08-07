/**
 * cURL 命令解析：把从浏览器 DevTools / 文档里复制来的 `curl ...` 命令还原成请求草稿。
 * 与 `buildCurlCommand`（导出方向）配对，构成「导入 / 导出」闭环。
 *
 * 支持：-X/--request、-H/--header、-d/--data(-raw|-binary|-ascii|-urlencode)、
 *       -u/--user、--url、-A/--user-agent、-b/--cookie、-e/--referer，
 *       单/双引号、反斜杠续行、URL 内查询串自动拆到 params。
 * 全部为纯函数，不触碰网络与 DOM（base64 使用运行时内置 btoa）。
 */

import { parseQueryString } from './http';

/** 由 cURL 还原出的请求草稿。 */
export interface CurlDraft {
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: string;
}

/**
 * 类 shell 分词：识别单引号（内部不转义）、双引号（支持 \" \\ \$ \` 转义）、
 * 反斜杠续行，以及未加引号片段中的反斜杠转义。
 */
export function tokenizeCurl(input: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let started = false;
  let quote: '"' | "'" | null = null;

  const flush = (): void => {
    if (started) {
      tokens.push(cur);
      cur = '';
      started = false;
    }
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (quote === "'") {
      if (ch === "'") quote = null;
      else cur += ch;
      continue;
    }

    if (quote === '"') {
      if (ch === '\\') {
        const next = input[i + 1];
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          cur += next;
          i += 1;
          continue;
        }
        if (next === '\n') {
          i += 1;
          continue;
        }
        cur += ch;
        continue;
      }
      if (ch === '"') {
        quote = null;
        continue;
      }
      cur += ch;
      continue;
    }

    if (ch === '\\') {
      const next = input[i + 1];
      if (next === '\n') {
        i += 1;
        continue;
      }
      if (next === '\r' && input[i + 2] === '\n') {
        i += 2;
        continue;
      }
      if (next !== undefined) {
        cur += next;
        started = true;
        i += 1;
        continue;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
      continue;
    }

    if (/\s/.test(ch)) {
      flush();
      continue;
    }

    cur += ch;
    started = true;
  }

  flush();
  return tokens;
}

/** 带独立参数、但对本应用无意义的 flag：需要连同其值一起跳过，避免被误判成 URL。 */
const VALUE_FLAGS = new Set<string>([
  '-o',
  '--output',
  '-m',
  '--max-time',
  '--connect-timeout',
  '-w',
  '--write-out',
  '--retry',
  '--cert',
  '--key',
  '--cacert',
  '-x',
  '--proxy',
  '-F',
  '--form',
  '--form-string',
  '--resolve',
  '--interface',
  '--limit-rate',
]);

/** UTF-8 安全的 Basic 凭据编码（btoa 只接受 latin1，中文需先转字节）。 */
export function encodeBasicCredentials(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** 把 "Key: Value" 单行片段并入 headers（键去空白，值保留内部冒号）。 */
function addHeaderLine(headers: Record<string, string>, line: string | undefined): void {
  if (!line) return;
  const idx = line.indexOf(':');
  if (idx <= 0) return;
  const k = line.slice(0, idx).trim();
  const v = line.slice(idx + 1).trim();
  if (k) headers[k] = v;
}

/** 请求体是否看起来是 JSON（用于在缺少 Content-Type 时做保守推断）。 */
function looksLikeJson(body: string): boolean {
  const t = body.trim();
  if (!t) return false;
  if (!(t.startsWith('{') || t.startsWith('['))) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

/** headers 中是否已存在某个键（大小写不敏感）。 */
function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === lower);
}

/**
 * 解析 cURL 命令为请求草稿；无法找到 URL 时返回 null。
 * - 多个 -d 片段按 curl 语义用 `&` 连接。
 * - 含 body 且未显式指定方法时，方法推断为 POST（与 curl 一致）。
 * - URL 自带的查询串会被拆进 params，便于在 Params 页签继续编辑。
 */
export function parseCurlCommand(text: string): CurlDraft | null {
  const tokens = tokenizeCurl(text ?? '');
  if (tokens.length === 0) return null;

  let i = 0;
  if (tokens[i] === '$' || tokens[i] === '#') i += 1;
  if (tokens[i] === 'curl') i += 1;

  let method = '';
  let url = '';
  let basic = '';
  const headers: Record<string, string> = {};
  const dataParts: string[] = [];

  for (; i < tokens.length; i += 1) {
    const t = tokens[i];

    if (t === '-X' || t === '--request') {
      method = (tokens[i + 1] ?? '').toUpperCase();
      i += 1;
      continue;
    }
    if (t.startsWith('-X') && t.length > 2) {
      method = t.slice(2).toUpperCase();
      continue;
    }
    if (t.startsWith('--request=')) {
      method = t.slice('--request='.length).toUpperCase();
      continue;
    }

    if (t === '-H' || t === '--header') {
      addHeaderLine(headers, tokens[i + 1]);
      i += 1;
      continue;
    }
    if (t.startsWith('--header=')) {
      addHeaderLine(headers, t.slice('--header='.length));
      continue;
    }
    if (t.startsWith('-H') && t.length > 2) {
      addHeaderLine(headers, t.slice(2));
      continue;
    }

    if (
      t === '-d' ||
      t === '--data' ||
      t === '--data-raw' ||
      t === '--data-binary' ||
      t === '--data-ascii' ||
      t === '--data-urlencode'
    ) {
      dataParts.push(tokens[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (t.startsWith('--data=')) {
      dataParts.push(t.slice('--data='.length));
      continue;
    }
    if (t.startsWith('-d') && t.length > 2) {
      dataParts.push(t.slice(2));
      continue;
    }

    if (t === '-u' || t === '--user') {
      basic = tokens[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (t.startsWith('--user=')) {
      basic = t.slice('--user='.length);
      continue;
    }

    if (t === '--url') {
      url = tokens[i + 1] ?? url;
      i += 1;
      continue;
    }
    if (t.startsWith('--url=')) {
      url = t.slice('--url='.length);
      continue;
    }

    if (t === '-A' || t === '--user-agent') {
      headers['User-Agent'] = tokens[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (t === '-b' || t === '--cookie') {
      headers.Cookie = tokens[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (t === '-e' || t === '--referer') {
      headers.Referer = tokens[i + 1] ?? '';
      i += 1;
      continue;
    }

    if (VALUE_FLAGS.has(t)) {
      i += 1;
      continue;
    }

    // 其余无参 flag（-s -i -k -L --compressed -v 等）忽略。
    if (t.startsWith('-')) continue;

    if (!url) url = t;
  }

  if (!url) return null;

  if (basic) {
    const sep = basic.indexOf(':');
    const user = sep >= 0 ? basic.slice(0, sep) : basic;
    const pass = sep >= 0 ? basic.slice(sep + 1) : '';
    headers.Authorization = `Basic ${encodeBasicCredentials(user, pass)}`;
  }

  const body = dataParts.join('&');
  if (!method) method = body ? 'POST' : 'GET';

  if (body && !hasHeader(headers, 'content-type')) {
    headers['Content-Type'] = looksLikeJson(body)
      ? 'application/json'
      : 'application/x-www-form-urlencoded';
  }

  const qIndex = url.indexOf('?');
  const params = qIndex >= 0 ? parseQueryString(url.slice(qIndex + 1)) : {};
  const baseUrl = qIndex >= 0 ? url.slice(0, qIndex) : url;

  return { method, url: baseUrl, headers, params, body };
}

/** 将变量表 / 键值对序列化为 `key=value` 多行文本（用于回填 Params 编辑框）。 */
export function keyValueToText(record: Record<string, string>): string {
  return Object.entries(record)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}
