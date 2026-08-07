import { describe, it, expect } from 'vitest';
import { formatXml, looksLikeXml } from './xml';

describe('formatXml', () => {
  it('缩进嵌套元素', () => {
    const out = formatXml('<root><child>text</child></root>', 2);
    expect(out).toBe('<root>\n  <child>text</child>\n</root>');
  });

  it('保留文本内容的行内（不额外缩进）', () => {
    const out = formatXml('<a><b>x</b><c>y</c></a>', 2);
    expect(out).toBe('<a>\n  <b>x</b>\n  <c>y</c>\n</a>');
  });

  it('处理自闭合标签，深度不增长', () => {
    const out = formatXml('<root><br/><img/></root>', 2);
    expect(out).toBe('<root>\n  <br/>\n  <img/>\n</root>');
  });

  it('处理注释与声明（不增加深度）', () => {
    const out = formatXml('<?xml version="1.0"?><!-- note --><root></root>', 2);
    expect(out).toBe('<?xml version="1.0"?>\n<!-- note -->\n<root>\n</root>');
  });

  it('空输入返回空串', () => {
    expect(formatXml('')).toBe('');
    expect(formatXml('   ')).toBe('');
  });

  it('looksLikeXml 识别含标签文本', () => {
    expect(looksLikeXml('<a/>')).toBe(true);
    expect(looksLikeXml('plain text')).toBe(false);
  });
});
