import { describe, it, expect } from 'vitest';
import { textStats } from './textStats';

describe('textStats', () => {
  it('统计空串', () => {
    const s = textStats('');
    expect(s.characters).toBe(0);
    expect(s.words).toBe(0);
    expect(s.lines).toBe(1);
    expect(s.bytes).toBe(0);
  });

  it('统计含空白与多行文本', () => {
    const text = 'hello world\nfoo bar baz';
    const s = textStats(text);
    expect(s.characters).toBe(23); // 21 字符 + 2 换行? "hello world"=11 + "\n"=1 + "foo bar baz"=11 => 23
    expect(s.charactersNoSpaces).toBe(20); // 去掉 3 个空格
    expect(s.words).toBe(5);
    expect(s.lines).toBe(2);
    expect(s.longestLine).toBe(11);
  });

  it('字节数按 UTF-8 计算（中文 3 字节）', () => {
    const s = textStats('中');
    expect(s.characters).toBe(1);
    expect(s.bytes).toBe(3);
  });

  it('CRLF 视为单行换行', () => {
    const s = textStats('a\r\nb');
    expect(s.lines).toBe(2);
  });
});
