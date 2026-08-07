/**
 * 导出与打印工具（cycle 264）。
 *
 * 纯函数部分（文件名清洗、独立 HTML 文档拼装）可单测；
 * DOM 部分（触发下载、隐藏 iframe 打印）做了环境守卫，SSR / node 下静默返回。
 *
 * 安全性：HTML 导出复用预览用的 `sanitizeHtml`（由调用方在传入 bodyHtml 前完成），
 * 本模块只负责把已净化的片段包进带内联样式的完整文档，不再引入新的注入面。
 */

/** 导出 HTML 使用的内联样式表（同时含打印规则，保证纸质排版可读）。 */
export const EXPORT_STYLESHEET = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0 auto;
  padding: 40px 24px 64px;
  max-width: 820px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #1f2328;
  background: #ffffff;
}
h1, h2, h3, h4, h5, h6 { line-height: 1.3; margin: 1.6em 0 0.6em; font-weight: 650; }
h1 { font-size: 1.9em; border-bottom: 1px solid #d8dee4; padding-bottom: .3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #eaeef2; padding-bottom: .25em; }
h3 { font-size: 1.25em; }
p { margin: 0.85em 0; }
a { color: #0969da; text-decoration: none; }
a:hover { text-decoration: underline; }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: #f1f3f5; padding: .15em .4em; border-radius: 4px; font-size: .9em;
}
pre {
  background: #f6f8fa; padding: 14px 16px; border-radius: 8px;
  overflow-x: auto; border: 1px solid #eaeef2;
}
pre code { background: transparent; padding: 0; font-size: .875em; }
blockquote {
  margin: 1em 0; padding: .2em 1em; color: #59636e;
  border-left: 4px solid #d0d7de; background: #f8fafc;
}
ul, ol { padding-left: 1.6em; }
li { margin: .25em 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #d0d7de; padding: 6px 12px; text-align: left; }
th { background: #f6f8fa; font-weight: 600; }
img { max-width: 100%; }
hr { border: none; border-top: 1px solid #d0d7de; margin: 2em 0; }
.md-export-meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
@media print {
  body { padding: 0; max-width: none; font-size: 12pt; }
  a { color: #000; text-decoration: underline; }
  pre, blockquote, table, img { break-inside: avoid; page-break-inside: avoid; }
  h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
  .md-export-meta { display: none; }
}
`.trim();

/** HTML 文本节点转义（用于把标题安全写入 <title>）。 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 把已净化的正文 HTML 包装成可独立打开 / 打印的完整文档（样式内联，零外部依赖）。
 * `meta` 为可选的副标题行（如导出时间、字数），打印时自动隐藏。
 */
export function buildExportHtml(title: string, bodyHtml: string, meta = ''): string {
  const safeTitle = escapeHtml(title.trim() || '无标题笔记');
  const metaLine = meta ? `<div class="md-export-meta">${escapeHtml(meta)}</div>` : '';
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${safeTitle}</title>`,
    `<style>${EXPORT_STYLESHEET}</style>`,
    '</head>',
    '<body>',
    metaLine,
    bodyHtml,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/**
 * 由笔记标题生成安全文件名：剔除路径分隔符与 Windows 非法字符，
 * 折叠空白为下划线，限制长度，空标题回退为 'note'。
 */
export function safeFileName(title: string, ext: string): string {
  const cleanExt = ext.replace(/^\./, '');
  const base = (title || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, 80);
  return `${base || 'note'}.${cleanExt}`;
}

/**
 * 触发浏览器下载一段文本内容。非浏览器环境（无 document）静默返回 false。
 * 使用 Blob + ObjectURL，导出后立即回收 URL，避免内存泄漏。
 */
export function downloadTextFile(filename: string, content: string, mime: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 延迟回收，兼容部分浏览器在同步 revoke 后取消下载的行为。
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/**
 * 用隐藏 iframe 打印一份独立 HTML 文档（可在打印对话框里另存为 PDF）。
 * 相比 window.open 不会被弹窗拦截，也不会把应用自身的样式带进打印结果。
 * 非浏览器环境静默返回 false。
 */
export function printHtmlDocument(html: string): boolean {
  if (typeof document === 'undefined') return false;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(frame);
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = (): void => {
    window.setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 1000);
  };
  // 等待图片/字体就绪后再唤起打印，避免空白页。
  win.addEventListener('afterprint', cleanup);
  window.setTimeout(() => {
    win.focus();
    win.print();
    // 部分浏览器不触发 afterprint，兜底清理。
    window.setTimeout(cleanup, 3000);
  }, 120);
  return true;
}
