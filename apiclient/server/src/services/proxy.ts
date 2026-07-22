import type { ProxyRequest, ProxyResponse } from '../types';

/**
 * 服务端代理：在 Node 侧发起请求，规避浏览器 CORS 限制。
 * 使用 Node 18+ 内置的全局 fetch。
 */
export async function performRequest(input: ProxyRequest): Promise<ProxyResponse> {
  let target = input.url.trim();
  if (!/^https?:\/\//i.test(target)) {
    target = `https://${target}`;
  }

  const u = new URL(target);
  if (input.params) {
    for (const [k, v] of Object.entries(input.params)) {
      if (v != null && v !== '') u.searchParams.set(k, String(v));
    }
  }

  const init: RequestInit = {
    method: input.method,
    headers: input.headers ?? {},
    redirect: 'follow',
  };

  if (input.body && input.method !== 'GET' && input.method !== 'HEAD') {
    init.body = input.body;
  }

  const start = Date.now();
  const resp = await fetch(u.toString(), init);
  const timeMs = Date.now() - start;

  const respHeaders: Record<string, string> = {};
  resp.headers.forEach((value, key) => {
    respHeaders[key] = value;
  });

  const body = await resp.text();

  return {
    status: resp.status,
    statusText: resp.statusText,
    headers: respHeaders,
    body,
    timeMs,
  };
}
