import { describe, expect, it } from 'vitest';
import { buildExportHtml, escapeHtml, EXPORT_STYLESHEET, safeFileName } from './mdExport';

describe('escapeHtml', () => {
  it('转义尖括号与引号', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });

  it('普通文本原样返回', () => {
    expect(escapeHtml('标题')).toBe('标题');
  });
});

describe('buildExportHtml', () => {
  it('生成完整的 HTML 文档骨架', () => {
    const html = buildExportHtml('我的笔记', '<h1>Hi</h1>');
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<title>我的笔记</title>');
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('样式被内联进文档（不依赖外部 CSS）', () => {
    const html = buildExportHtml('t', '<p>x</p>');
    expect(html).toContain('<style>');
    expect(html).toContain('@media print');
    expect(html).not.toContain('<link rel="stylesheet"');
  });

  it('正文 HTML 原样嵌入（净化由调用方完成）', () => {
    expect(buildExportHtml('t', '<p>hello</p>')).toContain('<p>hello</p>');
  });

  it('标题中的特殊字符被转义，避免破坏文档结构', () => {
    const html = buildExportHtml('a<script>b', '<p/>');
    expect(html).toContain('<title>a&lt;script&gt;b</title>');
  });

  it('空标题回退为「无标题笔记」', () => {
    expect(buildExportHtml('   ', '<p/>')).toContain('<title>无标题笔记</title>');
  });

  it('meta 行存在时渲染，缺省时不渲染', () => {
    expect(buildExportHtml('t', '<p/>', '共 12 词')).toContain('md-export-meta');
    expect(buildExportHtml('t', '<p/>')).not.toContain('md-export-meta">');
  });
});

describe('EXPORT_STYLESHEET', () => {
  it('包含打印媒体查询与基础排版规则', () => {
    expect(EXPORT_STYLESHEET).toContain('@media print');
    expect(EXPORT_STYLESHEET).toContain('blockquote');
    expect(EXPORT_STYLESHEET).toContain('table');
  });
});

describe('safeFileName', () => {
  it('空白折叠为下划线并追加扩展名', () => {
    expect(safeFileName('我的 笔记', 'md')).toBe('我的_笔记.md');
  });

  it('剔除路径分隔符与非法字符', () => {
    expect(safeFileName('a/b\\c:d*e?f"g<h>i|j', 'html')).toBe('abcdefghij.html');
  });

  it('空标题回退为 note', () => {
    expect(safeFileName('   ', 'md')).toBe('note.md');
  });

  it('扩展名允许带前导点', () => {
    expect(safeFileName('x', '.html')).toBe('x.html');
  });

  it('超长标题被截断到 80 字符以内', () => {
    const name = safeFileName('a'.repeat(200), 'md');
    expect(name.length).toBe(83);
  });

  it('去除首尾的点与下划线', () => {
    expect(safeFileName('  ..笔记..  ', 'md')).toBe('笔记.md');
  });
});
