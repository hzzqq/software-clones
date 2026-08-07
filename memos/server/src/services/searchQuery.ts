import { Visibility } from '../types';

/**
 * 检索查询语法解析器。
 *
 * 支持的语法（可任意组合，彼此之间是「且」的关系）：
 *   会议纪要            普通关键词，正文子串匹配（多个关键词之间是「且」）
 *   "季度 复盘"         带引号的短语，整体作为一个关键词（内部空格不再拆分）
 *   -草稿 / -"待办"     以减号开头表示排除，命中即剔除
 *   #工作               标签过滤（多个标签之间是「且」）
 *   is:pinned           仅置顶；is:unpinned 仅非置顶
 *   is:archived         仅归档；is:active 仅活跃
 *   vis:public          可见性（public / protected / private）
 *   after:2026-01-01    创建时间「不早于」该日（含当天 00:00）
 *   before:2026-02-01   创建时间「早于」该日（不含当天）
 *   on:2026-01-15       仅该自然日
 *
 * 解析器是纯函数、零依赖，服务端用它拼 SQL，客户端用它渲染「条件回显」，
 * 保证两端对同一条查询的理解完全一致。
 */

/** 可见性取值集合，供解析 `vis:` 时校验。 */
const VISIBILITIES: readonly Visibility[] = ['public', 'protected', 'private'];

export interface ParsedQuery {
  /** 必须全部命中的正文关键词（已转小写、去空）。 */
  terms: string[];
  /** 命中任一即排除的关键词（已转小写、去空）。 */
  exclude: string[];
  /** 必须全部带有的标签（已转小写、去 # 前缀）。 */
  tags: string[];
  /** true 仅置顶 / false 仅非置顶 / null 不限制。 */
  pinned: boolean | null;
  /** true 仅归档 / false 仅活跃 / null 不限制（由调用方决定默认值）。 */
  archived: boolean | null;
  /** 可见性过滤；null 表示不限制。 */
  visibility: Visibility | null;
  /** 创建时间下界（含），格式 YYYY-MM-DD；null 表示不限制。 */
  after: string | null;
  /** 创建时间上界（不含），格式 YYYY-MM-DD；null 表示不限制。 */
  before: string | null;
  /** 无法识别的 `key:value` 片段，原样保留以便前端提示用户。 */
  unknown: string[];
  /** 是否不含任何有效条件（等价于「不筛选」）。 */
  isEmpty: boolean;
}

/** 全部条件为空的解析结果，供调用方作为初值复用。 */
export function emptyQuery(): ParsedQuery {
  return {
    terms: [],
    exclude: [],
    tags: [],
    pinned: null,
    archived: null,
    visibility: null,
    after: null,
    before: null,
    unknown: [],
    isEmpty: true,
  };
}

/** 校验 YYYY-MM-DD 且确实是存在的日期（排除 2026-02-30 这类）。 */
export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
  );
}

/** 日期加一天，用于把 `on:X` 转成 [X, X+1) 的半开区间。 */
export function nextDay(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = probe.getUTCFullYear();
  const mm = String(probe.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(probe.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * 把查询串切成 token：空白分隔，但保留双引号内的整体（含空格）。
 * 未闭合的引号按到末尾处理，避免用户少打一个引号就整条查询失效。
 */
export function tokenizeQuery(input: string): string[] {
  const text: string = input ?? '';
  const tokens: string[] = [];
  let buf = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch: string = text[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && /\s/.test(ch)) {
      if (buf) {
        tokens.push(buf);
        buf = '';
      }
      continue;
    }
    buf += ch;
  }
  if (buf) tokens.push(buf);
  return tokens;
}

/** 记录一个正向条件是否已生效，用于最终计算 isEmpty。 */
function markNotEmpty(parsed: ParsedQuery): void {
  parsed.isEmpty = false;
}

/**
 * 解析查询串。任何无法识别的内容都会退化成普通关键词或进入 `unknown`，
 * 绝不抛异常——搜索框里的半成品输入是常态，不能因此中断检索。
 */
export function parseSearchQuery(input: string | null | undefined): ParsedQuery {
  const parsed: ParsedQuery = emptyQuery();
  const tokens: string[] = tokenizeQuery((input ?? '').trim());

  for (const token of tokens) {
    if (!token) continue;

    // 排除项：-关键词。单独一个 '-' 视为普通字符。
    if (token.startsWith('-') && token.length > 1) {
      const body: string = token.slice(1).trim().toLowerCase();
      if (body) {
        parsed.exclude.push(body);
        markNotEmpty(parsed);
      }
      continue;
    }

    // 标签：#标签名。单独一个 '#' 视为普通字符。
    if (token.startsWith('#') && token.length > 1) {
      const tag: string = token.slice(1).trim().toLowerCase();
      if (tag) {
        parsed.tags.push(tag);
        markNotEmpty(parsed);
      }
      continue;
    }

    const colon: number = token.indexOf(':');
    if (colon > 0 && colon < token.length - 1) {
      const key: string = token.slice(0, colon).toLowerCase();
      const value: string = token.slice(colon + 1).toLowerCase();

      if (key === 'is') {
        if (value === 'pinned') parsed.pinned = true;
        else if (value === 'unpinned') parsed.pinned = false;
        else if (value === 'archived') parsed.archived = true;
        else if (value === 'active') parsed.archived = false;
        else {
          parsed.unknown.push(token);
          continue;
        }
        markNotEmpty(parsed);
        continue;
      }

      if (key === 'vis' || key === 'visibility') {
        if ((VISIBILITIES as readonly string[]).includes(value)) {
          parsed.visibility = value as Visibility;
          markNotEmpty(parsed);
        } else {
          parsed.unknown.push(token);
        }
        continue;
      }

      if (key === 'after' || key === 'since') {
        if (isDateKey(value)) {
          parsed.after = value;
          markNotEmpty(parsed);
        } else {
          parsed.unknown.push(token);
        }
        continue;
      }

      if (key === 'before' || key === 'until') {
        if (isDateKey(value)) {
          parsed.before = value;
          markNotEmpty(parsed);
        } else {
          parsed.unknown.push(token);
        }
        continue;
      }

      if (key === 'on' || key === 'date') {
        if (isDateKey(value)) {
          // on:X 等价于 [X, X+1)，与 after/before 共用同一套区间语义。
          parsed.after = value;
          parsed.before = nextDay(value);
          markNotEmpty(parsed);
        } else {
          parsed.unknown.push(token);
        }
        continue;
      }

      if (key === 'tag') {
        const tag: string = value.replace(/^#/, '').trim();
        if (tag) {
          parsed.tags.push(tag);
          markNotEmpty(parsed);
        }
        continue;
      }

      // 未知前缀：记下来供前端提示，同时仍当作关键词，避免用户白搜一次。
      parsed.unknown.push(token);
      parsed.terms.push(token.toLowerCase());
      markNotEmpty(parsed);
      continue;
    }

    parsed.terms.push(token.toLowerCase());
    markNotEmpty(parsed);
  }

  // after 晚于 before 时区间为空，这里不静默吞掉，交给调用方按空结果处理；
  // 但要保证 after/before 本身仍是合法日期，SQL 拼接才不会出错。
  return parsed;
}

/**
 * 把解析结果还原成人类可读的条件描述，用于前端「条件回显」。
 * 返回的每一项都是一句独立说明，顺序稳定，便于渲染成 Chip 列表。
 */
export function describeQuery(parsed: ParsedQuery): string[] {
  const out: string[] = [];
  for (const t of parsed.terms) out.push(`包含「${t}」`);
  for (const t of parsed.exclude) out.push(`排除「${t}」`);
  for (const t of parsed.tags) out.push(`标签 #${t}`);
  if (parsed.pinned === true) out.push('仅置顶');
  if (parsed.pinned === false) out.push('仅非置顶');
  if (parsed.archived === true) out.push('仅归档');
  if (parsed.archived === false) out.push('仅活跃');
  if (parsed.visibility) out.push(`可见性 ${parsed.visibility}`);
  if (parsed.after && parsed.before && nextDay(parsed.after) === parsed.before) {
    out.push(`${parsed.after} 当天`);
  } else {
    if (parsed.after) out.push(`${parsed.after} 及之后`);
    if (parsed.before) out.push(`${parsed.before} 之前`);
  }
  return out;
}
