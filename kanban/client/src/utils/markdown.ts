/**
 * 零依赖的 Markdown 子集解析器。
 *
 * 设计取舍：
 * 1. **安全优先**——解析结果是「结构化 token」而非 HTML 字符串，渲染层用
 *    React 元素 + 文本节点输出，全程不碰 `dangerouslySetInnerHTML`，
 *    因此 `<script>alert(1)</script>` 之类的输入天然只会被当作普通文字显示，
 *    无需引入 DOMPurify 等额外依赖。
 * 2. **链接白名单**——只放行 http/https/mailto 与站内相对地址，
 *    `javascript:` / `data:` / `vbscript:` 等一律降级为纯文本。
 * 3. **子集而非全量**——只覆盖卡片描述/笔记/帖子里真正高频的语法，
 *    避免为了完备性引入一个体积远大于收益的依赖。
 *
 * 已支持：标题、无序/有序列表、引用、围栏代码块、分割线、段落；
 * 行内支持 **粗体**、*斜体*、`行内代码`、~~删除线~~、[文本](链接)。
 * 未支持（按原样输出为文本）：表格、图片、HTML 内联、嵌套列表。
 */

/** 行内片段 token。 */
export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'strike'; value: string }
  | { type: 'link'; value: string; href: string };

/** 块级 token。 */
export type MarkdownBlock =
  | { type: 'heading'; level: number; inline: InlineToken[] }
  | { type: 'paragraph'; inline: InlineToken[] }
  | { type: 'list'; ordered: boolean; items: InlineToken[][] }
  | { type: 'quote'; inline: InlineToken[] }
  | { type: 'code'; lang: string; value: string }
  | { type: 'hr' };

/**
 * 校验并归一化链接地址。
 * 返回 null 表示该地址不可信，调用方应把链接降级为纯文本。
 */
export function safeHref(raw: string): string | null {
  // 去掉首尾空白与控制字符（`java\u0000script:` 这类绕过手法）。
  const s: string = (raw ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!s) return null;
  // HTML 实体编码的协议（&#106;avascript:）一律拒绝，不做解码尝试。
  if (s.includes('&#')) return null;
  if (/^(https?:|mailto:)/i.test(s)) return s;
  // 站内相对地址 / 锚点。
  if (/^[/#?]/.test(s)) return s;
  // 其余带协议前缀的地址（javascript:、data:、vbscript: …）全部拒绝。
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null;
  return s;
}

// 行内语法：反引号代码 → 链接 → 粗体 → 删除线 → 斜体。顺序即优先级。
const INLINE_RE =
  /(`+)([\s\S]*?)\1|\[([^\]]*)\]\(([^)\s]*)\)|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\*([^*\n]+?)\*|_([^_\n]+?)_/g;

/**
 * 解析一行/一段文本中的行内语法，返回顺序排列的 token 列表。
 * 空输入返回空数组；不识别的语法原样保留为 text。
 */
export function parseInline(src: string): InlineToken[] {
  const text: string = src ?? '';
  if (!text) return [];
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  INLINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null = INLINE_RE.exec(text);
  while (m !== null) {
    if (m.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    }
    if (m[2] !== undefined) {
      tokens.push({ type: 'code', value: m[2].trim() });
    } else if (m[3] !== undefined && m[4] !== undefined) {
      const href = safeHref(m[4]);
      const label = m[3] || m[4];
      // 不可信链接降级为纯文本，保留原始 Markdown 以便用户看出问题。
      if (href === null) tokens.push({ type: 'text', value: `[${m[3]}](${m[4]})` });
      else tokens.push({ type: 'link', value: label, href });
    } else if (m[5] !== undefined) {
      tokens.push({ type: 'bold', value: m[5] });
    } else if (m[6] !== undefined) {
      tokens.push({ type: 'bold', value: m[6] });
    } else if (m[7] !== undefined) {
      tokens.push({ type: 'strike', value: m[7] });
    } else if (m[8] !== undefined) {
      tokens.push({ type: 'italic', value: m[8] });
    } else if (m[9] !== undefined) {
      tokens.push({ type: 'italic', value: m[9] });
    }
    lastIndex = m.index + m[0].length;
    m = INLINE_RE.exec(text);
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return tokens;
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const UL_RE = /^[-*+]\s+(.*)$/;
const OL_RE = /^\d+[.)]\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const HR_RE = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const FENCE_RE = /^```\s*([A-Za-z0-9+#-]*)\s*$/;

/**
 * 把 Markdown 源文本解析为块级 token 数组。
 * 空输入 / 纯空白返回空数组，调用方据此渲染占位。
 */
export function parseMarkdown(src: string): MarkdownBlock[] {
  const source: string = (src ?? '').replace(/\r\n?/g, '\n');
  if (!source.trim()) return [];
  const lines: string[] = source.split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', inline: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];

    // 围栏代码块：内容原样保留，直到遇到收尾 ``` 或文本结束。
    const fence = FENCE_RE.exec(line);
    if (fence) {
      flushParagraph();
      const lang: string = fence[1] ?? '';
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, value: body.join('\n') });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    if (HR_RE.test(line)) {
      flushParagraph();
      blocks.push({ type: 'hr' });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        inline: parseInline(heading[2]),
      });
      continue;
    }

    const quote = QUOTE_RE.exec(line);
    if (quote) {
      flushParagraph();
      // 连续的引用行合并为一个块。
      const parts: string[] = [quote[1]];
      while (i + 1 < lines.length) {
        const next = QUOTE_RE.exec(lines[i + 1]);
        if (!next) break;
        parts.push(next[1]);
        i++;
      }
      blocks.push({ type: 'quote', inline: parseInline(parts.join(' ')) });
      continue;
    }

    const ul = UL_RE.exec(line);
    const ol = OL_RE.exec(line);
    if (ul || ol) {
      flushParagraph();
      const ordered: boolean = ol !== null && ul === null;
      const items: InlineToken[][] = [parseInline((ordered ? ol! : ul!)[1])];
      while (i + 1 < lines.length) {
        const nextUl = UL_RE.exec(lines[i + 1]);
        const nextOl = OL_RE.exec(lines[i + 1]);
        const nextOrdered: boolean = nextOl !== null && nextUl === null;
        if ((!nextUl && !nextOl) || nextOrdered !== ordered) break;
        items.push(parseInline((nextOrdered ? nextOl! : nextUl!)[1]));
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    paragraph.push(line.trim());
  }
  flushParagraph();
  return blocks;
}

/**
 * 把 Markdown 压成单行纯文本，用于卡片摘要 / 列表预览。
 * 去掉所有标记符号，多余空白折叠为单个空格；超过 max 字符时截断并追加省略号。
 */
export function markdownToPlainText(src: string, max = 0): string {
  const blocks: MarkdownBlock[] = parseMarkdown(src);
  const parts: string[] = [];
  const inlineText = (tokens: InlineToken[]): string => tokens.map((t) => t.value).join('');
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
      case 'paragraph':
      case 'quote':
        parts.push(inlineText(b.inline));
        break;
      case 'list':
        parts.push(b.items.map(inlineText).join(' '));
        break;
      case 'code':
        parts.push(b.value);
        break;
      case 'hr':
        break;
    }
  }
  const flat: string = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (max > 0 && flat.length > max) return `${flat.slice(0, max)}…`;
  return flat;
}
