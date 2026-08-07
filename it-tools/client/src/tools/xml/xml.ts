/**
 * XML 美化（缩进格式化）。基于纯字符串处理，不依赖 DOM，
 * 因此在浏览器与 Node（vitest，无 DOMParser）中均可运行。
 * - 去除标签之间的空白；
 * - 在相邻标签间插入换行；
 * - 按开/闭标签深度缩进。
 * 纯函数、可单测。
 */

/**
 * 美化 XML 字符串。
 * @param xml 原始 XML 文本
 * @param indentSize 每层缩进空格数（默认 2）
 */
export function formatXml(xml: string, indentSize = 2): string {
  const src = String(xml ?? '');
  if (!src.trim()) return '';
  const pad = ' '.repeat(Math.max(1, indentSize));

  // 1) 先去掉标签之间的空白，再在相邻标签间插入换行。
  let working = src.replace(/>\s*</g, '><');
  working = working.replace(/></g, '>\n<');

  const lines = working.split('\n');
  let depth = 0;
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // 是否为「纯闭合标签」（</...>）。
    const isClosing = /^<\/\w/.test(line);
    // 是否为「自闭合 / 声明 / 注释 / CDATA / DOCTYPE」等不需要缩进增量的标签。
    const isSelfContained =
      /\/>$/.test(line) || // 自闭合 <br/>
      /^<\?/.test(line) || // 声明 <?xml ...?>
      /^<!--/.test(line) || // 注释
      /^<!\[CDATA\[/.test(line) || // CDATA
      /^<!/.test(line); // DOCTYPE / 处理指令

    if (isClosing) {
      depth = Math.max(0, depth - 1);
    }

    out.push(pad.repeat(depth) + line);

    // 仅对「独立开标签」（且非自包含）增加缩进深度。
    if (!isClosing && !isSelfContained) {
      depth += 1;
    }
  }

  return out.join('\n');
}

/** 轻量校验：括号是否（数量上）平衡。不保证语义正确，仅用于快速友好提示。 */
export function looksLikeXml(xml: string): boolean {
  const open = (String(xml).match(/<[a-zA-Z!/?][^>]*[^\/]>|<[a-zA-Z!/?][^>]*>/g) || []).length;
  const close = (String(xml).match(/<\/[a-zA-Z][^>]*>|<[a-zA-Z!/?][^>]*\/>/g) || []).length;
  return open > 0 || close > 0;
}
