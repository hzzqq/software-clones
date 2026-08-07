/**
 * ULID 生成器（Crockford Base32，26 字符，可按时间排序）。
 * - 前 10 个字符：48 位毫秒时间戳（UTC 毫秒）。
 * - 后 16 个字符：80 位随机数。
 * 纯函数、无 DOM 依赖，可在浏览器与 Node（vitest）中运行。
 */

/** Crockford Base32 字母表：去除易混淆的 I、L、O、U。 */
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length; // 32
const TIME_LEN = 10;
const RAND_LEN = 16;
/** 48 位时间戳上限（2^48 - 1）。 */
const TIME_MAX = 281474976710655;

/** ULID 校验正则：仅允许 Crockford 字母表中的 26 个字符。 */
export const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

/** 随机数源类型：返回长度为 length 的字节数组。 */
export type RandomSource = (length: number) => Uint8Array;

/** 默认随机数源：优先使用 Web Crypto，缺失时回退到 Math.random。 */
const defaultRandom: RandomSource = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  const g = globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto && typeof g.crypto.getRandomValues === 'function') {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

/** 将毫秒时间戳编码为 len 位 Crockford Base32 字符串。 */
export function encodeTime(now: number, len = TIME_LEN): string {
  if (!Number.isFinite(now) || now < 0 || now > TIME_MAX) {
    throw new Error(`时间戳超出范围（需 0 ~ ${TIME_MAX}）`);
  }
  let str = '';
  let value = Math.floor(now);
  for (let i = len - 1; i >= 0; i--) {
    const mod = value % ENCODING_LEN;
    str = ENCODING[mod] + str;
    value = (value - mod) / ENCODING_LEN;
  }
  return str;
}

/** 将随机数源输出编码为 len 位 Crockford Base32 字符串。 */
export function encodeRandom(len = RAND_LEN, random: RandomSource = defaultRandom): string {
  const bytes = random(len);
  let str = '';
  for (let i = 0; i < len; i++) {
    str += ENCODING[bytes[i] % ENCODING_LEN];
  }
  return str;
}

/** 生成单个 ULID（可选 now 与随机源，便于测试）。 */
export function generateUlid(now: number = Date.now(), random: RandomSource = defaultRandom): string {
  return encodeTime(now, TIME_LEN) + encodeRandom(RAND_LEN, random);
}

/** 生成 count 个 ULID（默认 1 个）。 */
export function generateUlids(count: number, now: number = Date.now()): string[] {
  const n = Math.max(1, Math.floor(count));
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(generateUlid(now));
  return out;
}

/** 从 ULID 中解析出嵌入的毫秒时间戳。 */
export function ulidTime(value: string): number | null {
  if (!isValidUlid(value)) return null;
  let time = 0;
  for (let i = 0; i < TIME_LEN; i++) {
    const idx = ENCODING.indexOf(value[i].toUpperCase());
    if (idx < 0) return null;
    time = time * ENCODING_LEN + idx;
  }
  return time;
}

/** 校验字符串是否为合法 ULID。 */
export function isValidUlid(value: string): boolean {
  return typeof value === 'string' && ULID_RE.test(value);
}
