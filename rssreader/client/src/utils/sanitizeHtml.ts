/**
 * 轻量 HTML 清洗器（防 XSS，纯正则实现，零依赖，可在 Node 单测）。
 *
 * 策略（纵深防御的最后一道闸，用于渲染来自 RSS 订阅源的文章正文）：
 *  1. 删除注释与「整块危险元素」（script/style/iframe/object/embed/form 等）；
 *  2. 删除所有事件处理器属性（on*）；
 *  3. 中和 javascript:/vbscript:/data: 协议（href/src）；
 *  4. 只允许白名单标签，未知标签剥壳但保留其内部文本；
 *  5. 只允许白名单属性，其余属性一律丢弃。
 */

const BLOCK_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'link',
  'meta',
  'base',
  'svg',
  'math',
  'video',
  'audio',
  'source',
  'canvas',
  'noscript',
  'template',
];

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'strong',
  'em',
  'i',
  'u',
  's',
  'del',
  'ins',
  'small',
  'sub',
  'sup',
  'mark',
  'p',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'code',
  'img',
  'figure',
  'figcaption',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
]);

const ALLOWED_ATTRS = new Set([
  'href',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'colspan',
  'rowspan',
  'align',
  'target',
  'rel',
]);

const BLOCK_RE = new RegExp(
  `<(${BLOCK_TAGS.join('|')})\\b[^>]*>[\\s\\S]*?<\\/\\1>|<(${BLOCK_TAGS.join(
    '|'
  )})\\b[^>]*\\/?>`,
  'gi'
);

const EVENT_ATTR_RE = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

const DANGEROUS_URL_RE = /\s(href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;

const ATTR_RE = /([a-zA-Z-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g;

function cleanUrlValue(val: string): string {
  const v = val.replace(/^["']|["']$/g, '').trim();
  if (/^(javascript|vbscript|data):/i.test(v)) return '';
  return v;
}

/**
 * 清洗 HTML：返回仅含白名单标签/属性的安全片段。
 * 输入非字符串时返回 ''。
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return '';
  let out = html;
  // 1. 删除注释。
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  // 2. 删除整块危险元素（含内容）。
  out = out.replace(BLOCK_RE, '');
  // 3. 删除事件处理器属性。
  out = out.replace(EVENT_ATTR_RE, '');
  // 4. 中和危险协议。
  out = out.replace(DANGEROUS_URL_RE, (_m, attr: string, val: string) => {
    const cleaned = cleanUrlValue(val);
    if (cleaned === '') return '';
    return ` ${attr}="${cleaned}"`;
  });
  // 5. 标签白名单 + 属性白名单。
  out = out.replace(TAG_RE, (_whole, slash: string, tag: string, rest: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) {
      // 未知标签：剥壳保留内容（自闭合标签直接移除）。
      return rest.includes('/') ? '' : '';
    }
    // 闭合标签不加任何属性。
    if (slash === '/') {
      return `</${t}>`;
    }
    const kept: string[] = [];
    let am: RegExpExecArray | null;
    ATTR_RE.lastIndex = 0;
    while ((am = ATTR_RE.exec(rest)) !== null) {
      const name = am[1].toLowerCase();
      if (ALLOWED_ATTRS.has(name)) {
        kept.push(`${am[1]}="${am[2].replace(/^["']|["']$/g, '')}"`);
      }
    }
    // 链接一律加 noopener（target=_blank 时的安全惯例）。
    if (t === 'a' && !kept.some((k) => k.startsWith('rel='))) {
      kept.push('rel="noopener noreferrer"');
    }
    const attrs = kept.length ? ` ${kept.join(' ')}` : '';
    return `<${t}${attrs}>`;
  });
  return out;
}
