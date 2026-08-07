import { describe, it, expect } from 'vitest';
import { parseInline, parseMarkdown, safeHref, markdownToPlainText } from '../src/utils/markdown';

describe('safeHref', () => {
  it('allows http / https / mailto', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
    expect(safeHref('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('allows relative paths and anchors', () => {
    expect(safeHref('/boards/1')).toBe('/boards/1');
    expect(safeHref('#section')).toBe('#section');
    expect(safeHref('page.html')).toBe('page.html');
  });

  it('rejects javascript / data / vbscript schemes', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('JaVaScRiPt:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHref('vbscript:msgbox(1)')).toBeNull();
  });

  it('rejects control-character and entity obfuscation', () => {
    expect(safeHref('java\u0000script:alert(1)')).toBeNull();
    expect(safeHref('  java\tscript:alert(1)  ')).toBeNull();
    expect(safeHref('&#106;avascript:alert(1)')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(safeHref('')).toBeNull();
    expect(safeHref('   ')).toBeNull();
  });
});

describe('parseInline', () => {
  it('returns an empty array for empty input', () => {
    expect(parseInline('')).toEqual([]);
  });

  it('keeps plain text as a single token', () => {
    expect(parseInline('hello world')).toEqual([{ type: 'text', value: 'hello world' }]);
  });

  it('parses bold, italic, code and strikethrough', () => {
    expect(parseInline('a **b** c')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'bold', value: 'b' },
      { type: 'text', value: ' c' },
    ]);
    expect(parseInline('*i*')).toEqual([{ type: 'italic', value: 'i' }]);
    expect(parseInline('__b__')).toEqual([{ type: 'bold', value: 'b' }]);
    expect(parseInline('`x = 1`')).toEqual([{ type: 'code', value: 'x = 1' }]);
    expect(parseInline('~~gone~~')).toEqual([{ type: 'strike', value: 'gone' }]);
  });

  it('parses links and keeps the label', () => {
    expect(parseInline('[docs](https://a.com)')).toEqual([
      { type: 'link', value: 'docs', href: 'https://a.com' },
    ]);
  });

  it('degrades unsafe links to plain text', () => {
    expect(parseInline('[click](javascript:alert(1))')).toEqual([
      { type: 'text', value: '[click](javascript:alert(1)' },
      { type: 'text', value: ')' },
    ]);
  });

  it('never emits raw HTML — tags stay as text', () => {
    const tokens = parseInline('<script>alert(1)</script>');
    expect(tokens).toEqual([{ type: 'text', value: '<script>alert(1)</script>' }]);
  });
});

describe('parseMarkdown', () => {
  it('returns an empty array for blank input', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('   \n  \n')).toEqual([]);
  });

  it('parses headings with their level', () => {
    const blocks = parseMarkdown('# Title\n### Sub');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(blocks[1]).toMatchObject({ type: 'heading', level: 3 });
  });

  it('groups consecutive lines into one paragraph and splits on blank lines', () => {
    const blocks = parseMarkdown('line a\nline b\n\nline c');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'paragraph' });
    expect(blocks[1]).toMatchObject({ type: 'paragraph' });
  });

  it('parses unordered and ordered lists separately', () => {
    const blocks = parseMarkdown('- a\n- b\n\n1. x\n2. y');
    expect(blocks[0]).toMatchObject({ type: 'list', ordered: false });
    expect(blocks[1]).toMatchObject({ type: 'list', ordered: true });
    expect((blocks[0] as { items: unknown[] }).items).toHaveLength(2);
  });

  it('parses fenced code blocks verbatim', () => {
    const blocks = parseMarkdown('```ts\nconst a = **1**;\n```');
    expect(blocks[0]).toEqual({ type: 'code', lang: 'ts', value: 'const a = **1**;' });
  });

  it('closes an unterminated fence at end of input', () => {
    const blocks = parseMarkdown('```\nabc');
    expect(blocks[0]).toEqual({ type: 'code', lang: '', value: 'abc' });
  });

  it('merges consecutive quote lines', () => {
    const blocks = parseMarkdown('> a\n> b');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'quote' });
  });

  it('parses horizontal rules', () => {
    expect(parseMarkdown('---')[0]).toEqual({ type: 'hr' });
    expect(parseMarkdown('***')[0]).toEqual({ type: 'hr' });
  });

  it('normalises CRLF line endings', () => {
    expect(parseMarkdown('# A\r\n\r\nB')).toHaveLength(2);
  });
});

describe('markdownToPlainText', () => {
  it('returns an empty string for blank input', () => {
    expect(markdownToPlainText('')).toBe('');
  });

  it('strips markers and collapses whitespace', () => {
    expect(markdownToPlainText('# Title\n\n**bold** and *it*')).toBe('Title bold and it');
  });

  it('flattens list items', () => {
    expect(markdownToPlainText('- a\n- b')).toBe('a b');
  });

  it('truncates at max length with an ellipsis', () => {
    const out = markdownToPlainText('abcdefghij', 4);
    expect(out).toBe('abcd…');
  });

  it('does not truncate when max is 0', () => {
    expect(markdownToPlainText('abcdefghij', 0)).toBe('abcdefghij');
  });
});
