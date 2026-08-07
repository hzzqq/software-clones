/**
 * 极简手写语法高亮器（零第三方依赖）。
 *
 * 安全模型：先分词、后转义 —— 对原文做正则分词，每个 token 与中间的普通文本
 * 都经 `escapeHtml` 转义后再拼入 HTML，因此输出给 `dangerouslySetInnerHTML`
 * 的内容绝不可能注入未转义的 `<script>` 等标签。
 *
 * 覆盖：注释 / 字符串 / 数字 / 关键字（按语言关键词集）/ HTML 标签。
 */

/** 语言定义：id 与 server/src/languages.ts 保持一致，keywords 为关键词集。 */
export interface LanguageDef {
  id: string;
  label: string;
  keywords: string[];
}

const JS_KEYWORDS = [
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'from', 'function', 'get', 'if', 'import', 'in',
  'instanceof', 'let', 'new', 'null', 'of', 'return', 'set', 'static',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined',
  'var', 'void', 'while', 'with', 'yield',
];

const TS_KEYWORDS = [
  ...JS_KEYWORDS,
  'abstract', 'any', 'as', 'boolean', 'declare', 'enum', 'implements',
  'infer', 'interface', 'keyof', 'namespace', 'never', 'number', 'object',
  'private', 'protected', 'public', 'readonly', 'satisfies', 'string',
  'type', 'unknown',
];

const PYTHON_KEYWORDS = [
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from',
  'global', 'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not',
  'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
  'self', 'print',
];

const JAVA_KEYWORDS = [
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null',
  'String', 'System', 'out', 'println',
];

const GO_KEYWORDS = [
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
  'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
  'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type',
  'var', 'true', 'false', 'nil', 'error', 'string', 'int', 'bool', 'len',
  'make', 'new', 'append', 'fmt', 'Println',
];

const BASH_KEYWORDS = [
  'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'until', 'do', 'done',
  'case', 'esac', 'function', 'in', 'select', 'time', 'echo', 'printf',
  'export', 'local', 'read', 'return', 'break', 'continue', 'exit', 'source',
  'cd', 'pwd', 'set', 'unset', 'declare', 'alias', 'true', 'false', 'sudo',
  'grep', 'awk', 'sed', 'curl', 'wget', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'cat',
];

const SQL_KEYWORDS = [
  'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set',
  'delete', 'create', 'table', 'alter', 'drop', 'index', 'view', 'join',
  'inner', 'left', 'right', 'full', 'outer', 'on', 'as', 'and', 'or', 'not',
  'null', 'is', 'like', 'in', 'between', 'group', 'by', 'order', 'having',
  'limit', 'offset', 'distinct', 'union', 'all', 'primary', 'key', 'foreign',
  'references', 'constraint', 'default', 'unique', 'check', 'case', 'when',
  'then', 'else', 'end', 'exists', 'asc', 'desc', 'count', 'sum', 'avg', 'min', 'max',
];

const JSON_KEYWORDS = ['true', 'false', 'null'];

const HTML_KEYWORDS = [
  'doctype', 'html', 'head', 'body', 'meta', 'title', 'link', 'script',
  'style', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr',
  'td', 'th', 'form', 'input', 'button', 'select', 'option', 'textarea',
  'nav', 'header', 'footer', 'section', 'article', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'br', 'hr', 'strong', 'em', 'class', 'id', 'href', 'src',
  'alt', 'type', 'value', 'name', 'placeholder',
];

const CSS_KEYWORDS = [
  'important', 'inherit', 'initial', 'unset', 'auto', 'none', 'block',
  'inline', 'flex', 'grid', 'relative', 'absolute', 'fixed', 'sticky',
  'hidden', 'visible', 'solid', 'dashed', 'dotted', 'pointer', 'center',
  'left', 'right', 'top', 'bottom', 'bold', 'normal', 'italic', 'nowrap',
  'wrap', 'repeat', 'cover', 'contain', 'transparent', 'currentColor',
];

/** 支持的语言清单（顺序即前端下拉展示顺序）。 */
export const LANGUAGES: LanguageDef[] = [
  { id: 'javascript', label: 'JavaScript', keywords: JS_KEYWORDS },
  { id: 'typescript', label: 'TypeScript', keywords: TS_KEYWORDS },
  { id: 'python', label: 'Python', keywords: PYTHON_KEYWORDS },
  { id: 'java', label: 'Java', keywords: JAVA_KEYWORDS },
  { id: 'go', label: 'Go', keywords: GO_KEYWORDS },
  { id: 'bash', label: 'Bash / Shell', keywords: BASH_KEYWORDS },
  { id: 'sql', label: 'SQL', keywords: SQL_KEYWORDS },
  { id: 'json', label: 'JSON', keywords: JSON_KEYWORDS },
  { id: 'html', label: 'HTML', keywords: HTML_KEYWORDS },
  { id: 'css', label: 'CSS', keywords: CSS_KEYWORDS },
  { id: 'text', label: '纯文本', keywords: [] },
];

/** 把任意文本转义为 HTML 安全字符串。 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 匹配捕获组顺序：1=注释 2=字符串 3=数字 4=关键字 5=HTML 标签。 */
const COMMENT_PATTERN = String.raw`(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*|<!--[\s\S]*?-->)`;
const STRING_PATTERN = String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\`(?:[^\`\\]|\\.)*\`)`;
const NUMBER_PATTERN = String.raw`\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b`;
const TAG_PATTERN = String.raw`(<\/?[a-zA-Z][\w-]*(?:\s[^<>]*?)?\/?>)`;

/** 预编译的全局正则，避免每次调用重复构建（keyword 部分按语言动态拼）。 */
const cachedRegexes = new Map<string, RegExp>();

function buildRegex(language: string, keywords: string[]): RegExp {
  const cacheKey = `${language}:${keywords.length}`;
  const cached = cachedRegexes.get(cacheKey);
  if (cached) {
    return cached;
  }
  const keywordPattern = keywords.length
    ? `\\b(${keywords.map(escapeRegExp).join('|')})\\b`
    : '(?!x)x'; // 空关键词集时永不匹配
  const isHtml = language === 'html';
  const source = [COMMENT_PATTERN, STRING_PATTERN, NUMBER_PATTERN, keywordPattern, isHtml ? TAG_PATTERN : '(?!x)x'].join('|');
  const regex = new RegExp(source, 'g');
  cachedRegexes.set(cacheKey, regex);
  return regex;
}

/** 转义正则特殊字符（关键词集来自代码常量，但保持健壮）。 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 高亮代码，返回可直接用于 `dangerouslySetInnerHTML` 的 HTML 字符串。
 * 所有文本均已转义，token 被包进 `<span class="tok-*">`。
 */
export function highlightCode(code: string, language: string): string {
  const def = LANGUAGES.find((l) => l.id === language);
  const keywords = def?.keywords ?? [];
  const regex = buildRegex(language, keywords);

  let html = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    html += escapeHtml(code.slice(lastIndex, match.index));
    const token = match[0];
    const cls = classifyMatch(match);
    html += `<span class="tok-${cls}">${escapeHtml(token)}</span>`;
    lastIndex = match.index + token.length;
    // 防止零宽匹配导致死循环。
    if (match.index === regex.lastIndex) {
      regex.lastIndex += 1;
    }
  }
  html += escapeHtml(code.slice(lastIndex));
  return html;
}

function classifyMatch(match: RegExpExecArray): 'comment' | 'string' | 'number' | 'keyword' | 'tag' {
  if (match[1] !== undefined) return 'comment';
  if (match[2] !== undefined) return 'string';
  if (match[3] !== undefined) return 'number';
  if (match[4] !== undefined) return 'keyword';
  return 'tag';
}

/** 语言 id → 显示名；未知返回原 id。 */
export function languageLabel(id: string): string {
  return LANGUAGES.find((l) => l.id === id)?.label ?? id;
}
