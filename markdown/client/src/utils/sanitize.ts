/**
 * 轻量级 HTML 净化（防御性深度，零依赖）。
 *
 * Markdown 预览用 `marked` 生成 HTML 后通过 dangerouslySetInnerHTML 注入，
 * 而 marked v12 默认不做任何清洗，用户笔记中的 `<script>` / `<img onerror>` /
 * `javascript:` 链接会直接执行，构成存储型 XSS。
 *
 * 这里用保守的正则做「够用」的拦截（覆盖主要攻击面），无需引入 DOMPurify：
 *   - 删除 script/style/iframe/object/embed 等高危标签及其内容；
 *   - 剥离所有 on* 事件处理属性；
 *   - 中和 javascript:/vbscript:/data:（图片仅放行常见位图 data:image/*）。
 *
 * 注意：纯正则表达式清洗无法覆盖 100% 的边界情形，属于「纵深防御」而非完整
 * 白名单消毒器；对于完全不可信的富文本，仍应优先使用 DOMPurify。本仓库笔记为
 * 单用户本地内容，该层已显著降低自 XSS 风险。
 */

const FORBIDDEN_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'audio',
  'video',
  'svg',
  'math',
];

const TAG_RE = new RegExp(
  `<\\s*(${FORBIDDEN_TAGS.join('|')})\\b[^>]*>[\\s\\S]*?<\\/\\s*\\1\\s*>`,
  'gi',
);
const VOID_RE = new RegExp(`<\\s*(${FORBIDDEN_TAGS.join('|')})\\b[^>]*\\/?>`, 'gi');
const EVENT_RE = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_URL_RE =
  /\s(?:href|src)\s*=\s*("|')(javascript:|vbscript:|data:(?!image\/(?:png|jpeg|gif|webp)))[^"']*\1/gi;

/** 净化 HTML 字符串，移除/中和主要 XSS 向量，安全用于 dangerouslySetInnerHTML。纯函数。 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let out = html.replace(TAG_RE, '').replace(VOID_RE, '');
  out = out.replace(EVENT_RE, '');
  out = out.replace(DANGEROUS_URL_RE, '');
  return out;
}
