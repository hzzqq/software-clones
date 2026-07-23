import { describe, it, expect } from 'vitest';
import { parseTags, countWords, deriveTitle, countCodeBlocks, estimateReadingTime, extractHeadings, extractLinks, sortNotes, filterNotesByFolder, summarizeNotes } from './markdown';
import type { Note } from '../types';

describe('parseTags', () => {
  it('提取去重标签', () => {
    expect(parseTags('#todo #bug #todo')).toEqual(['todo', 'bug']);
  });
  it('空文本返回空', () => {
    expect(parseTags('no tags here')).toEqual([]);
  });
});

describe('countWords', () => {
  it('忽略 markdown 符号，中文按字符计', () => {
    // 标题/这是/粗体/文字 共 8 个汉字，按字符计数（中文无空格分词）
    expect(countWords('# 标题\n\n这是 **粗体** 文字')).toBe(8);
  });
  it('空文本为 0', () => {
    expect(countWords('   ')).toBe(0);
  });
  it('中文按字符计数（不再被算成 1 个词）', () => {
    expect(countWords('中文测试一下')).toBe(6);
    // 中文 + 英文混排
    expect(countWords('这是一段 text 示例')).toBe(7);
  });
});

describe('estimateReadingTime', () => {
  it('250 字约 1 分钟，至少 1 分钟', () => {
    expect(estimateReadingTime('字'.repeat(250))).toBe(1);
    expect(estimateReadingTime('字'.repeat(10))).toBe(1);
    expect(estimateReadingTime('字'.repeat(750))).toBe(3);
  });
});

describe('deriveTitle', () => {
  it('优先取首个标题', () => {
    expect(deriveTitle('# 我的笔记\n正文')).toBe('我的笔记');
  });
  it('退化为首行', () => {
    expect(deriveTitle('首行就是标题\n更多')).toBe('首行就是标题');
  });
  it('都为空时回退', () => {
    expect(deriveTitle('\n\n')).toBe('无标题笔记');
  });
});

describe('countCodeBlocks', () => {
  it('成对计数', () => {
    expect(countCodeBlocks('```js\nx\n```\n```py\ny\n```')).toBe(2);
  });
});

describe('extractHeadings', () => {
  const md = '# 标题一\n正文\n## 子标题\n```\n# 不是标题\n```\n### 三级';
  const hs = extractHeadings(md);
  it('跳过代码块内的 #', () => {
    expect(hs.map((h) => h.text)).toEqual(['标题一', '子标题', '三级']);
  });
  it('记录层级', () => {
    expect(hs.map((h) => h.level)).toEqual([1, 2, 3]);
  });
  it('生成唯一锚点 id', () => {
    const ids = hs.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('sortNotes', () => {
  const mk = (id: number, pinned: boolean, updatedAt: string): Note => ({
    id, title: `n${id}`, content: '', folder: '', tags: [], pinned, createdAt: '', updatedAt,
  });
  const notes = [mk(1, false, '2026-01-01'), mk(2, true, '2026-03-01'), mk(3, false, '2026-02-01')];
  const sorted = sortNotes(notes);
  it('置顶优先', () => {
    expect(sorted[0].id).toBe(2);
  });
  it('非置顶按更新时间倒序', () => {
    expect(sorted.map((n) => n.id)).toEqual([2, 3, 1]);
  });
  it('不修改原数组', () => {
    expect(notes).toHaveLength(3);
  });
});

describe('filterNotesByFolder', () => {
  const mk = (id: number, folder: string): Note => ({
    id, title: `n${id}`, content: '', folder, tags: [], pinned: false, createdAt: '', updatedAt: '',
  });
  const notes = [mk(1, '工作'), mk(2, '工作'), mk(3, '生活'), mk(4, '')];
  it('空文件夹返回全部', () => {
    expect(filterNotesByFolder(notes, '')).toHaveLength(4);
    expect(filterNotesByFolder(notes, 'all')).toHaveLength(4);
  });
  it('精确匹配文件夹', () => {
    expect(filterNotesByFolder(notes, '工作').map((n) => n.id)).toEqual([1, 2]);
  });
  it('空格被裁剪', () => {
    expect(filterNotesByFolder(notes, '  工作  ').map((n) => n.id)).toEqual([1, 2]);
  });
  it('未分类归入空字符串', () => {
    expect(filterNotesByFolder(notes, '').filter((n) => n.folder === '')).toHaveLength(1);
  });
  it('不存在的文件夹返回空', () => {
    expect(filterNotesByFolder(notes, '不存在')).toHaveLength(0);
  });
  it('不修改原数组', () => {
    filterNotesByFolder(notes, '工作');
    expect(notes).toHaveLength(4);
  });
});

describe('extractLinks', () => {
  it('提取普通链接（文本+地址）', () => {
    const md = '看 [官网](https://example.com) 和 [文档](https://docs.example.com/a)';
    expect(extractLinks(md)).toEqual([
      { text: '官网', url: 'https://example.com' },
      { text: '文档', url: 'https://docs.example.com/a' },
    ]);
  });
  it('跳过图片链接', () => {
    const md = '![图](https://img.example.com/x.png) 与 [链](https://example.com)';
    expect(extractLinks(md)).toEqual([{ text: '链', url: 'https://example.com' }]);
  });
  it('跳过代码块内的链接', () => {
    const md = '```\n[隐藏](https://hidden.example.com)\n```\n[可见](https://visible.example.com)';
    expect(extractLinks(md)).toEqual([{ text: '可见', url: 'https://visible.example.com' }]);
  });
  it('按 url 去重', () => {
    const md = '[a](https://dup.example.com) 和 [b](https://dup.example.com)';
    expect(extractLinks(md)).toHaveLength(1);
  });
  it('无链接返回空数组', () => {
    expect(extractLinks('没有链接的纯文本')).toEqual([]);
  });
});

describe('summarizeNotes', () => {
  const notes: Note[] = [
    { id: 1, title: 'a', content: '你好 world foo', folder: '', tags: ['Todo', 'todo'], pinned: false, createdAt: '', updatedAt: '' },
    { id: 2, title: 'b', content: '', folder: 'work', tags: ['阅读'], pinned: false, createdAt: '', updatedAt: '' },
    { id: 3, title: 'c', content: '中文测试 123', folder: '', tags: [], pinned: false, createdAt: '', updatedAt: '' },
  ];
  it('统计总数、总字数、标签总数（去重归一）', () => {
    // note1 你好 world foo = 2(中文)+2(英文词) = 4；note3 中文测试 123 = 4(中文)+1(数字词) = 5 → 合计 9
    // note1 ['Todo','todo'] 归一去重为 1，note2 ['阅读'] 为 1 → 标签总数 2
    expect(summarizeNotes(notes)).toEqual({ total: 3, totalWords: 9, tagTotal: 2 });
  });
  it('空列表返回全零', () => {
    expect(summarizeNotes([])).toEqual({ total: 0, totalWords: 0, tagTotal: 0 });
  });
  it('缺省 tags 时标签数为 0', () => {
    const n: Note[] = [{ id: 1, title: 'x', content: 'hello', folder: '', tags: [], pinned: false, createdAt: '', updatedAt: '' }];
    expect(summarizeNotes(n)).toEqual({ total: 1, totalWords: 1, tagTotal: 0 });
  });
  it('不修改入参', () => {
    const before = notes.map((n) => n.id);
    summarizeNotes(notes);
    expect(notes.map((n) => n.id)).toEqual(before);
  });
});
