/**
 * 日期键工具：统一使用本地时区的 `YYYY-MM-DD` 字符串作为“一天”的标识。
 */

/** 把 Date 转成本地时区的 YYYY-MM-DD。 */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 今天的日期键。 */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** 解析 YYYY-MM-DD 为本地时区 Date（当日 00:00）。 */
export function parseDateKey(key: string): Date {
  const parts = key.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(y, m - 1, d);
}

/** 日期键加减天数。 */
export function addDays(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

/** 校验日期键格式与真实性（如 2025-02-30 非法）。 */
export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = parseDateKey(key);
  return toDateKey(d) === key;
}

/** 计算两个日期键相差的天数（b - a）。 */
export function diffDays(a: string, b: string): number {
  const ta = parseDateKey(a).getTime();
  const tb = parseDateKey(b).getTime();
  return Math.round((tb - ta) / 86400000);
}

/**
 * ISO 8601 周键：`YYYY-Www`（周一为一周开始）。
 * 例如 2025-08-01（周五）属于 2025-W31。
 */
export function isoWeekKey(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7; // 周一=1 … 周日=7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum); // 移到本周四
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** 周键加减周数（delta 可为负）。 */
export function shiftWeekKey(weekKey: string, delta: number): string {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) throw new Error(`无效的周键: ${weekKey}`);
  const year = Number(m[1]);
  const week = Number(m[2]);
  // ISO 第 1 周的周一：1 月 4 日所在周的周一。
  const jan4 = new Date(year, 0, 4);
  const dayNum = jan4.getDay() || 7; // 周日=7
  const week1Monday = new Date(year, 0, 4 - (dayNum - 1));
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (week - 1) * 7 + delta * 7);
  return isoWeekKey(toDateKey(monday));
}
