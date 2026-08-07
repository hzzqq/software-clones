/**
 * 短链接前端工具（纯函数，可单测）。
 *  - normalizeUrl：规范化用户输入的长链
 *  - buildShortUrl：由短码拼出完整短链地址
 *  - formatDateTime：ISO 时间 → 本地可读文本
 *  - formatClicks：点击数的紧凑展示
 */

/** 校验并规范化长链：补协议（默认 https）、仅允许 http/https。返回 '' 表示非法。 */
export function normalizeUrl(raw: string): string {
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

/**
 * 由短码拼出完整短链地址。
 * @param code 短码
 * @param base 前端基址（默认取当前页面 origin），如 http://localhost:5193
 */
export function buildShortUrl(code: string, base?: string): string {
  const origin =
    base ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5193');
  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}/${encodeURIComponent(code)}`;
}

/** ISO 时间 → 本地「YYYY-MM-DD HH:mm」；非法输入返回 ''。 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 点击数的紧凑展示：>=1000 显示 1.2k / 12.5k / 123k，>=100 万显示 1.3M。 */
export function formatClicks(n: number): string {
  const num = Number(n) || 0;
  if (num < 1000) return String(num);
  if (num < 1_000_000) {
    const k = num / 1000;
    if (k >= 100) return `${Math.round(k)}k`;
    const rounded = Math.round(k * 10) / 10;
    return `${rounded}k`;
  }
  const m = num / 1_000_000;
  if (m >= 100) return `${Math.round(m)}M`;
  const roundedM = Math.round(m * 10) / 10;
  return `${roundedM}M`;
}
