import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('keeps safe formatting tags', () => {
    expect(sanitizeHtml('<p>hello <b>world</b></p>')).toBe('<p>hello <b>world</b></p>');
  });

  it('removes script blocks entirely', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
  });

  it('removes style blocks entirely', () => {
    expect(sanitizeHtml('<style>body{display:none}</style><p>x</p>')).toBe('<p>x</p>');
  });

  it('removes iframe/object/embed', () => {
    expect(sanitizeHtml('<iframe src="https://evil.example"></iframe><p>ok</p>')).toBe(
      '<p>ok</p>'
    );
    expect(sanitizeHtml('<object data="x"></object><p>ok</p>')).toBe('<p>ok</p>');
  });

  it('removes event handler attributes', () => {
    expect(sanitizeHtml('<p onclick="alert(1)">x</p>')).toBe('<p>x</p>');
    expect(sanitizeHtml('<img src="x" onerror="alert(1)" />')).toBe('<img src="x">');
  });

  it('neutralizes javascript: urls in href/src', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a rel="noopener noreferrer">x</a>'
    );
    expect(sanitizeHtml('<img src="javascript:alert(1)">')).toBe('<img>');
    expect(sanitizeHtml('<img src="data:text/html;base64,xxx">')).toBe('<img>');
  });

  it('keeps http(s) links and adds noopener rel', () => {
    expect(sanitizeHtml('<a href="https://example.com">x</a>')).toBe(
      '<a href="https://example.com" rel="noopener noreferrer">x</a>'
    );
  });

  it('strips unknown tags but keeps their text', () => {
    expect(sanitizeHtml('<custom>text</custom>')).toBe('text');
  });

  it('strips unknown attributes', () => {
    expect(sanitizeHtml('<p id="x" class="y" data-z="1">ok</p>')).toBe('<p>ok</p>');
  });

  it('keeps img with safe attributes', () => {
    expect(sanitizeHtml('<img src="https://x.com/a.png" alt="pic" width="100">')).toBe(
      '<img src="https://x.com/a.png" alt="pic" width="100">'
    );
  });

  it('removes html comments', () => {
    expect(sanitizeHtml('<p>a</p><!-- secret --><p>b</p>')).toBe('<p>a</p><p>b</p>');
  });

  it('handles non-string input', () => {
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });

  it('handles nested dangerous content inside allowed tags', () => {
    const input = '<div><script>bad()</script><p>safe</p></div>';
    expect(sanitizeHtml(input)).toBe('<div><p>safe</p></div>');
  });
});
