import { describe, expect, it } from 'vitest';
import {
  applyMdAction,
  buildTable,
  countLines,
  offsetOfLine,
  insertBlock,
  insertCodeBlock,
  insertLink,
  lineEndOf,
  lineStartOf,
  matchShortcut,
  MD_ACTIONS,
  normalizeSelection,
  toggleLinePrefix,
  toggleWrap,
  type KeyLike,
} from './mdEdit';

const key = (over: Partial<KeyLike>): KeyLike => ({
  key: 'b',
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
});

describe('normalizeSelection', () => {
  it('倒置选区被交换', () => {
    expect(normalizeSelection('hello', { start: 4, end: 1 })).toEqual({ start: 1, end: 4 });
  });

  it('越界选区被钳制到文本范围', () => {
    expect(normalizeSelection('abc', { start: -5, end: 99 })).toEqual({ start: 0, end: 3 });
  });
});

describe('lineStartOf / lineEndOf', () => {
  it('定位中间行的行首与行尾', () => {
    const text = 'aa\nbbb\ncc';
    expect(lineStartOf(text, 4)).toBe(3);
    expect(lineEndOf(text, 4)).toBe(6);
  });

  it('首行行首为 0，末行行尾为文本长度', () => {
    const text = 'aa\nbb';
    expect(lineStartOf(text, 1)).toBe(0);
    expect(lineEndOf(text, 4)).toBe(5);
  });
});

describe('offsetOfLine / countLines', () => {
  it('返回指定行的起始下标', () => {
    const text = 'aa\nbbb\ncc';
    expect(offsetOfLine(text, 0)).toBe(0);
    expect(offsetOfLine(text, 1)).toBe(3);
    expect(offsetOfLine(text, 2)).toBe(7);
  });

  it('行号越界时钳制到最后一行起点', () => {
    expect(offsetOfLine('aa\nbb', 99)).toBe(3);
    expect(offsetOfLine('aa\nbb', -3)).toBe(0);
  });

  it('统计行数（空串为 1 行）', () => {
    expect(countLines('')).toBe(1);
    expect(countLines('a\nb\nc')).toBe(3);
  });
});

describe('toggleWrap', () => {
  it('包裹选中文本并保持内容被选中', () => {
    const r = toggleWrap('hello world', { start: 0, end: 5 }, '**');
    expect(r.text).toBe('**hello** world');
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe('hello');
  });

  it('再次执行会撤销包裹（选区在标记内侧）', () => {
    const r = toggleWrap('**hello** world', { start: 2, end: 7 }, '**');
    expect(r.text).toBe('hello world');
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe('hello');
  });

  it('选区自身含标记时也能撤销', () => {
    const r = toggleWrap('**hello** world', { start: 0, end: 9 }, '**');
    expect(r.text).toBe('hello world');
  });

  it('空选区插入一对标记并把光标放中间', () => {
    const r = toggleWrap('ab', { start: 1, end: 1 }, '~~');
    expect(r.text).toBe('a~~~~b');
    expect(r.selectionStart).toBe(3);
    expect(r.selectionEnd).toBe(3);
  });

  it('行内代码使用单反引号', () => {
    const r = toggleWrap('run npm test', { start: 4, end: 12 }, '`');
    expect(r.text).toBe('run `npm test`');
  });

  it('不修改入参字符串', () => {
    const input = 'hello';
    toggleWrap(input, { start: 0, end: 5 }, '**');
    expect(input).toBe('hello');
  });
});

describe('toggleLinePrefix', () => {
  it('为单行加上一级标题', () => {
    const r = toggleLinePrefix('标题', { start: 0, end: 0 }, 'h1');
    expect(r.text).toBe('# 标题');
  });

  it('再次执行移除标题标记', () => {
    const r = toggleLinePrefix('# 标题', { start: 2, end: 2 }, 'h1');
    expect(r.text).toBe('标题');
  });

  it('从二级标题切到一级标题会替换而非叠加', () => {
    const r = toggleLinePrefix('## 标题', { start: 0, end: 0 }, 'h1');
    expect(r.text).toBe('# 标题');
  });

  it('多行选区统一加无序列表标记', () => {
    const text = 'a\nb\nc';
    const r = toggleLinePrefix(text, { start: 0, end: 5 }, 'ul');
    expect(r.text).toBe('- a\n- b\n- c');
  });

  it('有序列表按顺序编号', () => {
    const r = toggleLinePrefix('a\nb\nc', { start: 0, end: 5 }, 'ol');
    expect(r.text).toBe('1. a\n2. b\n3. c');
  });

  it('空行在列表化时保持为空行', () => {
    const r = toggleLinePrefix('a\n\nb', { start: 0, end: 4 }, 'ul');
    expect(r.text).toBe('- a\n\n- b');
  });

  it('无序列表可切换为任务列表', () => {
    const r = toggleLinePrefix('- a', { start: 0, end: 3 }, 'task');
    expect(r.text).toBe('- [ ] a');
  });

  it('引用可整段切换与撤销', () => {
    const on = toggleLinePrefix('a\nb', { start: 0, end: 3 }, 'quote');
    expect(on.text).toBe('> a\n> b');
    const off = toggleLinePrefix(on.text, { start: 0, end: on.text.length }, 'quote');
    expect(off.text).toBe('a\nb');
  });

  it('部分命中时统一补齐（而非撤销）', () => {
    const r = toggleLinePrefix('- a\nb', { start: 0, end: 5 }, 'ul');
    expect(r.text).toBe('- a\n- b');
  });
});

describe('insertLink', () => {
  it('有选区时选中文本成为链接文字，光标落在 URL 上', () => {
    const r = insertLink('点我', { start: 0, end: 2 }, false);
    expect(r.text).toBe('[点我](https://)');
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe('https://');
  });

  it('空选区插入占位链接并选中链接文字', () => {
    const r = insertLink('', { start: 0, end: 0 }, false);
    expect(r.text).toBe('[链接文字](https://)');
    expect(r.text.slice(r.selectionStart, r.selectionEnd)).toBe('链接文字');
  });

  it('图片模式带感叹号前缀', () => {
    const r = insertLink('', { start: 0, end: 0 }, true);
    expect(r.text).toBe('![图片描述](https://)');
  });
});

describe('insertBlock / insertCodeBlock / buildTable', () => {
  it('插入块级内容时自动补齐前后换行', () => {
    const r = insertBlock('abc', { start: 3, end: 3 }, '---');
    expect(r.text).toBe('abc\n---');
  });

  it('文本中间插入时前后都补换行', () => {
    const r = insertBlock('ab', { start: 1, end: 1 }, '---');
    expect(r.text).toBe('a\n---\nb');
  });

  it('代码块包裹选中内容且光标落在语言标识位置', () => {
    const r = insertCodeBlock('print(1)', { start: 0, end: 8 });
    expect(r.text).toBe('```\nprint(1)\n```');
    expect(r.selectionStart).toBe(3);
  });

  it('表格骨架含表头与分隔行', () => {
    const t = buildTable(2, 3);
    const lines = t.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe('| --- | --- | --- |');
  });

  it('表格列数被钳制在合理范围内', () => {
    expect(buildTable(1, 0).split('\n')[1]).toBe('| --- |');
    expect(buildTable(1, 99).split('\n')[1].split('---')).toHaveLength(11);
  });
});

describe('matchShortcut', () => {
  it('Ctrl+B 命中加粗', () => {
    expect(matchShortcut(key({ key: 'b', ctrlKey: true }))).toBe('bold');
  });

  it('Meta+I 命中斜体（macOS）', () => {
    expect(matchShortcut(key({ key: 'i', metaKey: true }))).toBe('italic');
  });

  it('Ctrl+Shift+X 命中删除线，且大小写不敏感', () => {
    expect(matchShortcut(key({ key: 'X', ctrlKey: true, shiftKey: true }))).toBe('strike');
  });

  it('Ctrl+E 与 Ctrl+Shift+E 区分行内代码与代码块', () => {
    expect(matchShortcut(key({ key: 'e', ctrlKey: true }))).toBe('code');
    expect(matchShortcut(key({ key: 'e', ctrlKey: true, shiftKey: true }))).toBe('codeblock');
  });

  it('Ctrl+K 命中链接，Ctrl+1 命中一级标题', () => {
    expect(matchShortcut(key({ key: 'k', ctrlKey: true }))).toBe('link');
    expect(matchShortcut(key({ key: '1', ctrlKey: true }))).toBe('h1');
  });

  it('无修饰键或带 Alt 一律不匹配', () => {
    expect(matchShortcut(key({ key: 'b' }))).toBeNull();
    expect(matchShortcut(key({ key: 'b', ctrlKey: true, altKey: true }))).toBeNull();
  });

  it('未登记的按键返回 null', () => {
    expect(matchShortcut(key({ key: 'z', ctrlKey: true }))).toBeNull();
  });
});

describe('MD_ACTIONS 元数据', () => {
  it('动作 id 唯一', () => {
    const ids = MD_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('登记了快捷键的动作都能被 matchShortcut 反查到', () => {
    for (const a of MD_ACTIONS) {
      if (!a.key) continue;
      expect(matchShortcut(key({ key: a.key, ctrlKey: true, shiftKey: a.shift }))).toBe(a.id);
    }
  });
});

describe('applyMdAction 分发', () => {
  it('bold 走包裹逻辑', () => {
    expect(applyMdAction('x', { start: 0, end: 1 }, 'bold').text).toBe('**x**');
  });

  it('h2 走行首标记逻辑', () => {
    expect(applyMdAction('x', { start: 0, end: 0 }, 'h2').text).toBe('## x');
  });

  it('table 插入表格骨架', () => {
    expect(applyMdAction('', { start: 0, end: 0 }, 'table').text).toContain('| --- |');
  });

  it('hr 插入分隔线', () => {
    expect(applyMdAction('', { start: 0, end: 0 }, 'hr').text).toBe('---');
  });

  it('结果选区始终落在新文本长度范围内', () => {
    for (const a of MD_ACTIONS) {
      const r = applyMdAction('hello world', { start: 0, end: 5 }, a.id);
      expect(r.selectionStart).toBeGreaterThanOrEqual(0);
      expect(r.selectionEnd).toBeLessThanOrEqual(r.text.length);
      expect(r.selectionStart).toBeLessThanOrEqual(r.selectionEnd);
    }
  });
});
