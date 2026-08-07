import { describe, expect, it } from 'vitest';
import { escapeHtml, highlightCode, LANGUAGES, languageLabel } from './highlight';

describe('escapeHtml', () => {
  it('转义 & < > " \'', () => {
    expect(escapeHtml(`<a href="x" title='y'>A&B</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;A&amp;B&lt;/a&gt;',
    );
  });
});

describe('highlightCode 安全（防 XSS）', () => {
  it('脚本标签被完全转义，无未转义 <script>', () => {
    const html = highlightCode('<script>alert(1)</script>', 'javascript');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('引号 / 尖括号 / 与号均转义', () => {
    const html = highlightCode(`const s = "<b> & 'x'";`, 'javascript');
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
    expect(html).toContain('&quot;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&#39;');
  });
});

describe('highlightCode 分词', () => {
  it('js: 关键字 / 字符串 / 数字', () => {
    const html = highlightCode('const n = 42; // count', 'javascript');
    expect(html).toContain('class="tok-keyword"');
    expect(html).toContain('class="tok-number"');
    expect(html).toContain('class="tok-comment"');
  });

  it('js: 字符串被包成 tok-string', () => {
    const html = highlightCode('const s = "hi";', 'javascript');
    expect(html).toContain('class="tok-string"');
  });

  it('注释内的引号不被当成字符串', () => {
    const html = highlightCode('// "not a string"', 'javascript');
    expect(html).toContain('tok-comment');
    // 注释 token 内部不应再套一层 tok-string
    expect(html.indexOf('tok-comment')).toBeLessThan(html.indexOf('&quot;not a string&quot;'));
    expect(html).not.toContain('tok-string');
  });
});

describe('highlightCode 各语言关键词集', () => {
  const cases: Array<[string, string, string]> = [
    ['javascript', 'function', 'function'],
    ['typescript', 'interface', 'interface'],
    ['python', 'def', 'def'],
    ['java', 'public', 'public'],
    ['go', 'func', 'func'],
    ['bash', 'echo', 'echo'],
    ['sql', 'select', 'select'],
    ['json', 'true', 'true'],
    ['css', 'important', 'important'],
  ];
  it.each(cases)('%s: 关键词 %s 高亮', (_lang, keyword, expected) => {
    const html = highlightCode(`${keyword}`, _lang);
    expect(html).toContain('tok-keyword');
    expect(html).toContain(expected);
  });

  it('html: 标签被包成 tok-tag', () => {
    const html = highlightCode('<div class="x">hi</div>', 'html');
    expect(html).toContain('tok-tag');
  });
});

describe('LANGUAGES 元数据', () => {
  it('包含全部核心语言', () => {
    const ids = LANGUAGES.map((l) => l.id);
    for (const id of ['javascript', 'typescript', 'python', 'java', 'go', 'bash', 'sql', 'json', 'html', 'css', 'text']) {
      expect(ids).toContain(id);
    }
  });

  it('languageLabel 返回显示名', () => {
    expect(languageLabel('python')).toBe('Python');
    expect(languageLabel('unknown')).toBe('unknown');
  });
});
