/** 订阅源 URL 规范化（客户端校验，与服务端一致）。 */

/** 校验并规范化订阅源地址：补协议（默认 https）、仅允许 http/https。返回 '' 表示非法。 */
export function normalizeFeedUrl(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  let candidate: string;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    // 已带协议：只接受 http/https，其余（ftp、javascript 等）一律拒绝。
    if (!/^https?:\/\//i.test(trimmed)) return '';
    candidate = trimmed;
  } else {
    candidate = `https://${trimmed}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return '';
  }
  return parsed.toString();
}
