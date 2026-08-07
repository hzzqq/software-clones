/**
 * 文本统计：字符数、单词数、行数、字节数（UTF-8）。
 * 纯函数、无副作用、可单测。不修改入参。
 */

export interface TextStats {
  /** 字符总数（含空白）。 */
  characters: number;
  /** 不含空白字符的数量。 */
  charactersNoSpaces: number;
  /** 单词数（按空白切分，连续空白合并）。 */
  words: number;
  /** 行数（按 \n 切分，至少 1 行）。 */
  lines: number;
  /** UTF-8 编码字节数。 */
  bytes: number;
  /** 最长一行的字符数。 */
  longestLine: number;
}

/**
 * 统计文本各项指标。
 * - 空白判定：正则 \s（含空格、Tab、换行等）。
 * - 单词：按空白切分后过滤空串计数。
 * - 字节：使用 TextEncoder（UTF-8）。
 */
export function textStats(text: string): TextStats {
  const characters = text.length;
  const withoutSpaces = text.replace(/\s/g, '');
  const charactersNoSpaces = withoutSpaces.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const linesArr = text.split(/\r\n|\r|\n/);
  const lines = linesArr.length;
  const bytes = new TextEncoder().encode(text).length;
  const longestLine = linesArr.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    characters,
    charactersNoSpaces,
    words,
    lines,
    bytes,
    longestLine,
  };
}
