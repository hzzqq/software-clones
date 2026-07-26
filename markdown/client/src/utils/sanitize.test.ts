import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('移除 <script> 标签及其内容', () => {
    const out = sanitizeHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).toContain('<p>hi</p>');
  });

  it('剥离 on* 事件处理属性', () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)" onload="x()">');
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/onload/i);
    expect(out).toContain('<img');
  });

  it('中和 javascript: 协议链接', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('click');
  });

  it('中和非图片的 data: URL', () => {
    const out = sanitizeHtml('<a href="data:text/html,<script>1</script>">x</a>');
    expect(out).not.toContain('data:text/html');
  });

  it('保留合法 https 链接', () => {
    const out = sanitizeHtml('<a href="https://example.com">ok</a>');
    expect(out).toContain('href="https://example.com"');
  });

  it('放行常见位图 data:image 图片', () => {
    const out = sanitizeHtml('<img src="data:image/png;base64,AAA">');
    expect(out).toContain('src="data:image/png;base64,AAA"');
  });

  it('保留普通格式化标签', () => {
    expect(sanitizeHtml('<strong>bold</strong>')).toBe('<strong>bold</strong>');
  });

  it('空输入返回空串', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});
