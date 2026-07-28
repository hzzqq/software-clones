import yaml from 'js-yaml';

/**
 * Pure, framework-agnostic computation helpers for the it-tools suite.
 * Extracted from the tool components so the algorithms can be unit-tested
 * in isolation (vitest). Each function is a verbatim, behaviour-preserving
 * copy of the logic previously inlined in the matching `tools/*` component.
 */

// ---------------------------------------------------------------------------
// Base64 (UTF-8 safe)
// ---------------------------------------------------------------------------
export function base64Encode(text: string): string {
  const bytes: Uint8Array = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export function base64Decode(b64: string): string {
  if (!b64 || !b64.trim()) {
    throw new Error('Base64 输入为空');
  }
  let binary: string;
  try {
    binary = atob(b64.trim());
  } catch {
    throw new Error('无效的 Base64 字符串');
  }
  const bytes: Uint8Array = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// JSON formatting
// ---------------------------------------------------------------------------
/** Pretty-print a JSON string (throws on invalid JSON). */
export function formatJson(text: string): string {
  return JSON.stringify(JSON.parse(text), null, 2);
}

/** Minify a JSON string (throws on invalid JSON). */
export function minifyJson(text: string): string {
  return JSON.stringify(JSON.parse(text));
}

// ---------------------------------------------------------------------------
// JSON validation (live, position-aware)
// ---------------------------------------------------------------------------
/** Returns true iff `text` is syntactically valid JSON. */
export function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/** Result of a position-aware JSON parse. */
export interface JsonParseResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  /** 1-based line of the error, when the engine reports a position. */
  line?: number;
  /** 1-based column of the error, when the engine reports a position. */
  column?: number;
}

/**
 * Parse JSON and, on failure, attempt to surface the 1-based line/column of
 * the offending character. V8/SpiderMonkey report `... at position N`, where N
 * is a UTF-16 code-unit offset — the same unit JS string indexing uses, so the
 * derived coordinates line up with what the user sees in the editor.
 */
export function parseJson(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    const message: string = e instanceof Error ? e.message : String(e);
    const posMatch: RegExpMatchArray | null = /position (\d+)/.exec(message);
    let line: number | undefined;
    let column: number | undefined;
    if (posMatch) {
      const pos: number = Number(posMatch[1]);
      let ln = 1;
      let col = 1;
      const len = Math.min(pos, text.length);
      for (let i = 0; i < len; i++) {
        if (text[i] === '\n') {
          ln++;
          col = 1;
        } else {
          col++;
        }
      }
      line = ln;
      column = col;
    }
    return { ok: false, error: message, line, column };
  }
}

// ---------------------------------------------------------------------------
// YAML <-> JSON
// ---------------------------------------------------------------------------
export function jsonToYaml(jsonText: string): string {
  return yaml.dump(JSON.parse(jsonText), { indent: 2, lineWidth: -1 });
}

export function yamlToJson(yamlText: string): string {
  return JSON.stringify(yaml.load(yamlText), null, 2);
}

/** Result of a non-throwing YAML/JSON conversion. */
export interface ConvertResult {
  ok: boolean;
  value?: string;
  error?: string;
}

/**
 * 非抛出版本：JSON -> YAML。非法 JSON 时返回 { ok:false } 而非抛出，
 * 供 UI 做即时校验与友好错误提示（与 JsonTool 的 parseJson 一致）。
 */
export function tryJsonToYaml(jsonText: string): ConvertResult {
  try {
    return { ok: true, value: yaml.dump(JSON.parse(jsonText), { indent: 2, lineWidth: -1 }) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * 非抛出版本：YAML -> JSON。非法 YAML 时返回 { ok:false } 而非抛出。
 * 注：js-yaml 对部分歧义文本会解析为字符串而非报错，故 ok 仅代表语法层面无异常。
 */
export function tryYamlToJson(yamlText: string): ConvertResult {
  try {
    return { ok: true, value: JSON.stringify(yaml.load(yamlText), null, 2) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// UUID (v4)
// ---------------------------------------------------------------------------
/** Fallback v4 UUID generator used when `crypto.randomUUID` is unavailable. */
export function generateUuidFallback(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r: number = (Math.random() * 16) | 0;
    const v: number = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_V4_RE.test(value);
}

/** Generate a v4 UUID, preferring the native Web Crypto implementation. */
export function generateUuid(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : generateUuidFallback();
}

// ---------------------------------------------------------------------------
// URL encode / decode
// ---------------------------------------------------------------------------
export function urlEncode(uri: string): string {
  return encodeURI(uri);
}

export function urlEncodeComponent(s: string): string {
  return encodeURIComponent(s);
}

export function urlDecode(s: string): string {
  return decodeURIComponent(s.trim());
}

// ---------------------------------------------------------------------------
// Timestamp <-> ISO date
// ---------------------------------------------------------------------------
/**
 * Convert a Unix timestamp (seconds when <= 10 digits, milliseconds otherwise)
 * to an ISO-8601 UTC string. Throws on invalid input.
 */
export function timestampToIso(ts: string | number): string {
  const str: string = String(ts);
  const n: number = Number(str);
  if (!str.trim() || Number.isNaN(n)) {
    throw new Error('请输入有效的 Unix 时间戳');
  }
  const ms: number = str.trim().length > 10 ? n : n * 1000;
  return new Date(ms).toISOString();
}

/** Convert an ISO date string to a Unix timestamp in seconds. Throws on invalid input. */
export function isoToTimestampSeconds(iso: string): string {
  const d: Date = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error('请输入有效的日期（ISO 8601 或可被 Date 解析）');
  }
  return String(Math.floor(d.getTime() / 1000));
}

// ---------------------------------------------------------------------------
// JSON <-> CSV
// ---------------------------------------------------------------------------
/**
 * Convert a JSON array-of-objects string into CSV text.
 * - `delimiter` defaults to comma (`,`).
 * - With `header=true` the first row contains the union of all keys.
 * - Throws on invalid JSON or when the root is not an array of objects.
 */
export function jsonToCsv(jsonText: string, delimiter = ',', header = true): string {
  const data: unknown = JSON.parse(jsonText);
  if (!Array.isArray(data)) {
    throw new Error('JSON 根节点必须是对象数组');
  }
  const rows = data as Record<string, unknown>[];
  if (rows.length === 0) return '';
  const keys: string[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error('JSON 数组的每个元素必须是对象');
    }
    for (const k of Object.keys(row)) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s: string = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  if (header) lines.push(keys.map((k) => escape(k)).join(delimiter));
  for (const row of rows) {
    lines.push(keys.map((k) => escape(row[k])).join(delimiter));
  }
  return lines.join('\n');
}

/**
 * Parse CSV text back into a JSON array-of-objects string.
 * - The first row is treated as the header unless `header=false`.
 * - Empty cells become `null`; numeric-looking cells are coerced to numbers.
 */
export function csvToJson(csvText: string, delimiter = ',', header = true): string {
  const text: string = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
  if (!text) return '[]';
  const rows: string[][] = text.split('\n').map((line) => parseCsvLine(line, delimiter));
  let keys: string[];
  let startAt: number;
  if (header) {
    keys = rows[0].map((h, i) => (h.trim() || `col${i + 1}`));
    startAt = 1;
  } else {
    keys = rows[0].map((_, i) => `col${i + 1}`);
    startAt = 0;
  }
  const out: Record<string, unknown>[] = [];
  for (let r = startAt; r < rows.length; r++) {
    const obj: Record<string, unknown> = {};
    rows[r].forEach((cell, i) => {
      const key: string = keys[i] ?? `col${i + 1}`;
      const trimmed: string = cell.trim();
      if (trimmed === '') obj[key] = null;
      else if (/^-?\d+(\.\d+)?$/.test(trimmed)) obj[key] = Number(trimmed);
      else obj[key] = trimmed;
    });
    out.push(obj);
  }
  return JSON.stringify(out, null, 2);
}

/** Split a single CSV line respecting quoted fields (RFC 4180-ish). */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch: string = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/**
 * 将较大数字压缩为紧凑可读形式：1500 → "1.5k"，2_500_000 → "2.5M"，< 1000 原样返回。
 * 用于工具抽屉统计等需要节省空间的场景。纯函数。
 */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs < 1000) return String(n);
  const units: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'k'],
  ];
  for (const [base, suffix] of units) {
    if (abs >= base) {
      const v = n / base;
      const text = v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
      return `${text}${suffix}`;
    }
  }
  return String(n);
}
