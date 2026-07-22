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
// YAML <-> JSON
// ---------------------------------------------------------------------------
export function jsonToYaml(jsonText: string): string {
  return yaml.dump(JSON.parse(jsonText), { indent: 2, lineWidth: -1 });
}

export function yamlToJson(yamlText: string): string {
  return JSON.stringify(yaml.load(yamlText), null, 2);
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
