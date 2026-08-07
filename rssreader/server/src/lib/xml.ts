/**
 * 手写轻量 XML 解析器（零依赖，仅用于 RSS 2.0 / Atom 订阅源）。
 *
 * 设计取舍：
 *  - 不引入完整 XML DOM，用「标签级正则提取」足以覆盖绝大多数订阅源；
 *  - 严格处理 CDATA：CDATA 内的实体（如 &amp;）保持原样，不二次解码；
 *  - 对 <![CDATA[ ... ]]>、标准实体与数字实体（&#123; / &#x1F;）做解码；
 *  - 所有函数为纯函数，便于单测。
 */

export interface ParsedItem {
  title: string;
  link: string;
  description: string;
  content: string;
  author: string;
  pubDate: string;
  guid: string;
}

export interface ParsedFeed {
  title: string;
  link: string;
  description: string;
  items: ParsedItem[];
}

/** 数字码点安全转字符（过滤非法/控制字符，避免脏数据）。 */
function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
  try {
    const ch = String.fromCodePoint(code);
    // 过滤 C0 控制字符（除 \t \n \r）与代理区。
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(ch)) return '';
    return ch;
  } catch {
    return '';
  }
}

/**
 * 解码 XML 文本：实体 → 字符，但 CDATA 段内容原样保留。
 * 实现：先把 CDATA 内容替换为占位符，实体解码后再还原。
 */
export function decodeXmlText(raw: string): string {
  const cdata: string[] = [];
  const protectedText = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_m, body: string) => {
    cdata.push(body);
    return `\u0000CDATA${cdata.length - 1}\u0000`;
  });
  const decoded = protectedText
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) =>
      safeFromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_m, dec: string) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
  return decoded.replace(/\u0000CDATA(\d+)\u0000/g, (_m, idx: string) => cdata[Number(idx)] ?? '');
}

/** 提取第一个 <tag ...>...</tag> 的原始内部内容（不含标签本身）。 */
export function extractFirstTag(xml: string, tagName: string): string {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

/** 提取所有 <tag ...>...</tag> 的原始内部内容。 */
export function extractAllTags(xml: string, tagName: string): string[] {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/** 提取某个标签的第一个属性值（如 <link href="..."/> → href）。 */
export function extractAttr(xml: string, tagName: string, attrName: string): string {
  const re = new RegExp(
    `<${tagName}\\b[^>]*\\s${attrName}\\s*=\\s*["']([^"']*)["']`,
    'i'
  );
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

/** 解码 + 压缩空白。 */
function cleanText(raw: string): string {
  return decodeXmlText(raw).replace(/\s+/g, ' ').trim();
}

/** 把常见 RSS 日期串规范为 ISO；无法解析返回 ''。 */
export function toIsoDate(raw: string): string {
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return '';
  return new Date(t).toISOString();
}

/** 解析单个 <item>（RSS）或 <entry>（Atom）块。 */
export function parseItem(xml: string): ParsedItem {
  const title = cleanText(extractFirstTag(xml, 'title'));
  // RSS 用 <link>...</link>，Atom 用 <link href="..."/>（优先取 href 属性）。
  const link =
    cleanText(extractFirstTag(xml, 'link')) || extractAttr(xml, 'link', 'href');
  const description = cleanText(extractFirstTag(xml, 'description'));
  const contentEncoded = cleanText(extractFirstTag(xml, 'content:encoded'));
  const contentAtom = cleanText(extractFirstTag(xml, 'content'));
  const content = contentEncoded || contentAtom || description;
  const author = cleanText(
    extractFirstTag(xml, 'author') || extractFirstTag(xml, 'dc:creator')
  );
  const pubDate = toIsoDate(
    cleanText(extractFirstTag(xml, 'pubDate') || extractFirstTag(xml, 'published') || extractFirstTag(xml, 'updated'))
  );
  const guid =
    cleanText(extractFirstTag(xml, 'guid')) ||
    cleanText(extractFirstTag(xml, 'id')) ||
    link;
  return { title, link, description, content, author, pubDate, guid };
}

/**
 * 解析 RSS 2.0 或 Atom 订阅源 XML。
 *  - 根为 <rss>/<rdf:RDF>：取 <channel> 下的 <title>/<link>/<description> 与全部 <item>；
 *  - 根为 <feed>（Atom）：取 <title>/<link href>/<subtitle> 与全部 <entry>。
 * 解析失败（无任何结构）时返回空 ParsedFeed，由调用方判定。
 */
export function parseRss(xml: string): ParsedFeed {
  const source = String(xml ?? '');
  const isAtom = /<feed\b/i.test(source) && !/<rss\b/i.test(source);

  let title = '';
  let link = '';
  let description = '';
  let items: ParsedItem[] = [];

  if (isAtom) {
    title = cleanText(extractFirstTag(source, 'title'));
    link = extractAttr(source, 'link', 'href');
    description = cleanText(extractFirstTag(source, 'subtitle'));
    items = extractAllTags(source, 'entry').map(parseItem);
  } else {
    const channel = extractFirstTag(source, 'channel');
    const scope = channel || source;
    title = cleanText(extractFirstTag(scope, 'title'));
    link = cleanText(extractFirstTag(scope, 'link')) || extractAttr(scope, 'link', 'href');
    description = cleanText(extractFirstTag(scope, 'description'));
    items = extractAllTags(scope, 'item').map(parseItem);
  }

  return { title, link, description, items };
}
