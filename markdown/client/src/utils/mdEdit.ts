/**
 * Markdown 编辑操作纯函数（cycle 262）。
 *
 * 工具栏按钮与快捷键最终都归一到 `applyMdAction(text, selection, actionId)`：
 * 输入「当前全文 + 选区」，输出「新全文 + 新选区」，不触碰 DOM，
 * 便于单元测试，也让 UI 层只负责把结果写回 textarea 并回位光标。
 *
 * 设计约定：
 * - 所有函数均为纯函数，绝不修改入参。
 * - 选区越界/倒置会先被 `normalizeSelection` 归一，调用方无需预处理。
 * - 「切换」语义：再次对已应用的格式执行同一操作会撤销该格式（与主流编辑器一致）。
 */

/** 文本选区（与 textarea 的 selectionStart / selectionEnd 对应）。 */
export interface SelectionRange {
  start: number;
  end: number;
}

/** 一次编辑操作的结果：新文本 + 新选区。 */
export interface EditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** 支持的编辑动作标识。 */
export type MdActionId =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'codeblock'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'ul'
  | 'ol'
  | 'task'
  | 'quote'
  | 'link'
  | 'image'
  | 'table'
  | 'hr';

/** 工具栏 / 快捷键元数据。 */
export interface MdAction {
  id: MdActionId;
  /** 中文标签（工具栏 Tooltip）。 */
  label: string;
  /** 展示用快捷键文案；无快捷键则为空串。 */
  shortcut: string;
  /** 匹配用主键（小写）；无快捷键则为 null。 */
  key: string | null;
  /** 是否要求 Shift。 */
  shift: boolean;
}

/**
 * 全部编辑动作的元数据表。UI 依此渲染工具栏，键盘依此匹配快捷键。
 * 快捷键均要求 Ctrl（Windows/Linux）或 Meta（macOS）。
 */
export const MD_ACTIONS: MdAction[] = [
  { id: 'bold', label: '加粗', shortcut: 'Ctrl+B', key: 'b', shift: false },
  { id: 'italic', label: '斜体', shortcut: 'Ctrl+I', key: 'i', shift: false },
  { id: 'strike', label: '删除线', shortcut: 'Ctrl+Shift+X', key: 'x', shift: true },
  { id: 'code', label: '行内代码', shortcut: 'Ctrl+E', key: 'e', shift: false },
  { id: 'codeblock', label: '代码块', shortcut: 'Ctrl+Shift+E', key: 'e', shift: true },
  { id: 'h1', label: '一级标题', shortcut: 'Ctrl+1', key: '1', shift: false },
  { id: 'h2', label: '二级标题', shortcut: 'Ctrl+2', key: '2', shift: false },
  { id: 'h3', label: '三级标题', shortcut: 'Ctrl+3', key: '3', shift: false },
  { id: 'ul', label: '无序列表', shortcut: 'Ctrl+Shift+U', key: 'u', shift: true },
  { id: 'ol', label: '有序列表', shortcut: 'Ctrl+Shift+O', key: 'o', shift: true },
  { id: 'task', label: '任务列表', shortcut: 'Ctrl+Shift+Y', key: 'y', shift: true },
  { id: 'quote', label: '引用', shortcut: 'Ctrl+Shift+Q', key: 'q', shift: true },
  { id: 'link', label: '链接', shortcut: 'Ctrl+K', key: 'k', shift: false },
  { id: 'image', label: '图片', shortcut: '', key: null, shift: false },
  { id: 'table', label: '插入表格', shortcut: 'Ctrl+Shift+M', key: 'm', shift: true },
  { id: 'hr', label: '分隔线', shortcut: '', key: null, shift: false },
];

/** 键盘事件中与快捷键匹配相关的最小字段（便于在 node 环境测试）。 */
export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * 将键盘事件映射为编辑动作；无匹配返回 null。
 * - Ctrl 与 Meta 等价（兼容 macOS）。
 * - 带 Alt 的组合一律不匹配，避免与输入法 / 系统快捷键冲突。
 * - 大小写不敏感（Shift+X 在浏览器中 key 为 'X'）。
 */
export function matchShortcut(e: KeyLike): MdActionId | null {
  if (e.altKey) return null;
  if (!e.ctrlKey && !e.metaKey) return null;
  const key = (e.key ?? '').toLowerCase();
  if (!key) return null;
  for (const action of MD_ACTIONS) {
    if (action.key === null) continue;
    if (action.key === key && action.shift === e.shiftKey) return action.id;
  }
  return null;
}

/** 归一化选区：钳制到 [0, text.length] 并保证 start <= end。 */
export function normalizeSelection(text: string, sel: SelectionRange): SelectionRange {
  const max = text.length;
  const a = Math.min(Math.max(Number.isFinite(sel.start) ? sel.start : 0, 0), max);
  const b = Math.min(Math.max(Number.isFinite(sel.end) ? sel.end : 0, 0), max);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

/** 返回 pos 所在行的行首下标。 */
export function lineStartOf(text: string, pos: number): number {
  const idx = text.lastIndexOf('\n', Math.max(0, pos - 1));
  return idx === -1 ? 0 : idx + 1;
}

/** 返回 pos 所在行的行尾下标（不含换行符）。 */
export function lineEndOf(text: string, pos: number): number {
  const idx = text.indexOf('\n', pos);
  return idx === -1 ? text.length : idx;
}

/**
 * 返回第 `line` 行（0 基）的起始字符下标。
 * 行号越界时钳制到 [0, 最后一行]，便于「大纲点击 → 编辑区定位」直接使用。
 */
export function offsetOfLine(text: string, line: number): number {
  if (line <= 0) return 0;
  let offset = 0;
  let remaining = line;
  while (remaining > 0) {
    const idx = text.indexOf('\n', offset);
    if (idx === -1) return offset;
    offset = idx + 1;
    remaining -= 1;
  }
  return offset;
}

/** 统计文本行数（空串记为 1 行，与编辑器显示一致）。 */
export function countLines(text: string): number {
  return text.split('\n').length;
}

/**
 * 切换成对包裹标记（加粗 `**` / 斜体 `*` / 删除线 `~~` / 行内代码 `` ` ``）。
 * - 选区外侧或自身已被同一标记包裹 → 撤销包裹；
 * - 选区为空 → 插入一对标记并把光标放在中间；
 * - 其余情况 → 包裹选区并保持内容被选中。
 */
export function toggleWrap(text: string, sel: SelectionRange, marker: string): EditResult {
  const { start, end } = normalizeSelection(text, sel);
  const len = marker.length;
  const selected = text.slice(start, end);

  if (start >= len && text.slice(start - len, start) === marker && text.slice(end, end + len) === marker) {
    const next = text.slice(0, start - len) + selected + text.slice(end + len);
    return { text: next, selectionStart: start - len, selectionEnd: end - len };
  }

  if (selected.length >= len * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(len, selected.length - len);
    const next = text.slice(0, start) + inner + text.slice(end);
    return { text: next, selectionStart: start, selectionEnd: start + inner.length };
  }

  if (start === end) {
    const next = text.slice(0, start) + marker + marker + text.slice(end);
    return { text: next, selectionStart: start + len, selectionEnd: start + len };
  }

  const next = text.slice(0, start) + marker + selected + marker + text.slice(end);
  return { text: next, selectionStart: start + len, selectionEnd: start + len + selected.length };
}

/** 行首标记规格：如何生成、如何判定已应用、应用前需剥离哪些互斥标记。 */
interface LinePrefixSpec {
  make: (ordinal: number) => string;
  test: RegExp;
  clean: RegExp;
}

/** 列表类互斥标记（无序 / 有序 / 任务）统一剥离规则。 */
const LIST_CLEAN = /^(?:[-*+]|\d+\.)[ \t]+(?:\[[ xX]\][ \t]+)?/;

const LINE_SPECS: Record<'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'task' | 'quote', LinePrefixSpec> = {
  h1: { make: () => '# ', test: /^#[ \t]+/, clean: /^#{1,6}[ \t]+/ },
  h2: { make: () => '## ', test: /^##[ \t]+/, clean: /^#{1,6}[ \t]+/ },
  h3: { make: () => '### ', test: /^###[ \t]+/, clean: /^#{1,6}[ \t]+/ },
  ul: { make: () => '- ', test: /^[-*+][ \t]+(?!\[[ xX]\])/, clean: LIST_CLEAN },
  ol: { make: (n) => `${n}. `, test: /^\d+\.[ \t]+/, clean: LIST_CLEAN },
  task: { make: () => '- [ ] ', test: /^[-*+][ \t]+\[[ xX]\][ \t]+/, clean: LIST_CLEAN },
  quote: { make: () => '> ', test: /^>[ \t]?/, clean: /^>[ \t]?/ },
};

/**
 * 切换整段行首标记（标题 / 列表 / 引用）。
 * 作用范围为选区覆盖到的所有整行；空行保持原样。
 * 若范围内所有非空行都已应用该标记 → 全部移除，否则统一应用（并先剥离互斥标记）。
 */
export function toggleLinePrefix(
  text: string,
  sel: SelectionRange,
  kind: 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'task' | 'quote',
): EditResult {
  const spec = LINE_SPECS[kind];
  const { start, end } = normalizeSelection(text, sel);
  const blockStart = lineStartOf(text, start);
  const blockEnd = lineEndOf(text, end);
  const lines = text.slice(blockStart, blockEnd).split('\n');

  const nonEmpty = lines.filter((l) => l.trim() !== '');
  const allApplied = nonEmpty.length > 0 && nonEmpty.every((l) => spec.test.test(l));

  let ordinal = 0;
  const out = lines.map((line) => {
    if (line.trim() === '') return line;
    if (allApplied) return line.replace(spec.test, '');
    ordinal += 1;
    return spec.make(ordinal) + line.replace(spec.clean, '');
  });

  const block = out.join('\n');
  const next = text.slice(0, blockStart) + block + text.slice(blockEnd);
  return { text: next, selectionStart: blockStart, selectionEnd: blockStart + block.length };
}

/**
 * 在光标处插入独立块级内容（代码块 / 表格 / 分隔线）。
 * 自动补齐前后换行，保证块级语法不会粘连到相邻文字上。
 * `selectOffset` / `selectLength` 用于把光标精确落在块内的可编辑位置。
 */
export function insertBlock(
  text: string,
  sel: SelectionRange,
  block: string,
  selectOffset = 0,
  selectLength = 0,
): EditResult {
  const { start, end } = normalizeSelection(text, sel);
  const needLeading = start > 0 && text[start - 1] !== '\n';
  const needTrailing = end < text.length && text[end] !== '\n';
  const prefix = needLeading ? '\n' : '';
  const suffix = needTrailing ? '\n' : '';
  const payload = prefix + block + suffix;
  const next = text.slice(0, start) + payload + text.slice(end);
  const base = start + prefix.length;
  return {
    text: next,
    selectionStart: base + selectOffset,
    selectionEnd: base + selectOffset + selectLength,
  };
}

/**
 * 插入 / 包裹链接。
 * - 有选区：选中文本作为链接文字，光标选中占位 URL 便于直接粘贴；
 * - 无选区：插入 `[链接文字](https://)` 并选中「链接文字」。
 */
export function insertLink(text: string, sel: SelectionRange, image = false): EditResult {
  const { start, end } = normalizeSelection(text, sel);
  const bang = image ? '!' : '';
  const placeholderUrl = 'https://';
  const selected = text.slice(start, end);

  if (selected) {
    const snippet = `${bang}[${selected}](${placeholderUrl})`;
    const next = text.slice(0, start) + snippet + text.slice(end);
    const urlStart = start + bang.length + 1 + selected.length + 2;
    return { text: next, selectionStart: urlStart, selectionEnd: urlStart + placeholderUrl.length };
  }

  const label = image ? '图片描述' : '链接文字';
  const snippet = `${bang}[${label}](${placeholderUrl})`;
  const next = text.slice(0, start) + snippet + text.slice(end);
  const labelStart = start + bang.length + 1;
  return { text: next, selectionStart: labelStart, selectionEnd: labelStart + label.length };
}

/**
 * 插入围栏代码块。选中内容会被放进代码块里，光标落在语言标识处方便直接输入语言。
 */
export function insertCodeBlock(text: string, sel: SelectionRange): EditResult {
  const { start, end } = normalizeSelection(text, sel);
  const selected = text.slice(start, end);
  const block = '```\n' + selected + '\n```';
  // 语言标识位置 = 首行 ``` 之后（offset 3），默认零长度选区。
  return insertBlock(text, { start, end }, block, 3, 0);
}

/** 生成 rows×cols 的 markdown 表格骨架（含表头分隔行）。 */
export function buildTable(rows = 2, cols = 3): string {
  const safeCols = Math.max(1, Math.min(10, Math.floor(cols)));
  const safeRows = Math.max(1, Math.min(20, Math.floor(rows)));
  const header = `| ${Array.from({ length: safeCols }, (_, i) => `列 ${i + 1}`).join(' | ')} |`;
  const divider = `| ${Array.from({ length: safeCols }, () => '---').join(' | ')} |`;
  const body = Array.from(
    { length: safeRows },
    () => `| ${Array.from({ length: safeCols }, () => '  ').join(' | ')} |`,
  ).join('\n');
  return `${header}\n${divider}\n${body}`;
}

/**
 * 统一动作分发：把工具栏点击 / 快捷键落到具体的文本变换上。
 * 未知动作原样返回（保持文本与选区不变），保证调用方永远拿到合法结果。
 */
export function applyMdAction(text: string, sel: SelectionRange, action: MdActionId): EditResult {
  const norm = normalizeSelection(text, sel);
  switch (action) {
    case 'bold':
      return toggleWrap(text, norm, '**');
    case 'italic':
      return toggleWrap(text, norm, '*');
    case 'strike':
      return toggleWrap(text, norm, '~~');
    case 'code':
      return toggleWrap(text, norm, '`');
    case 'codeblock':
      return insertCodeBlock(text, norm);
    case 'h1':
    case 'h2':
    case 'h3':
    case 'ul':
    case 'ol':
    case 'task':
    case 'quote':
      return toggleLinePrefix(text, norm, action);
    case 'link':
      return insertLink(text, norm, false);
    case 'image':
      return insertLink(text, norm, true);
    case 'table':
      return insertBlock(text, norm, buildTable(2, 3), 2, 3);
    case 'hr':
      return insertBlock(text, norm, '---', 3, 0);
    default:
      return { text, selectionStart: norm.start, selectionEnd: norm.end };
  }
}
