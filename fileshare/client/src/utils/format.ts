/**
 * 人类可读的格式化工具（含单测，见 format.test.ts）。
 */

/**
 * 把字节数格式化为人类可读字符串，支持 B / KB / MB / GB。
 * 规则：< 1024 显示整数 B；>= 1KB 保留 1 位小数（去掉尾随 .0）。
 *
 * @param bytes 字节数（非负整数）
 * @returns 例如 "512 B"、"1.0 KB"、"1.5 MB"、"2.0 GB"
 */
export function formatBytes(bytes: number): string {
  const n = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (n < 1024) {
    return `${Math.round(n)} B`;
  }
  const units: string[] = ['KB', 'MB', 'GB'];
  let value: number = n / 1024;
  let unitIndex: number = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const text: string = value.toFixed(1);
  return `${text} ${units[unitIndex]}`;
}

/**
 * 把 ISO 时间字符串格式化为本地 "YYYY-MM-DD HH:mm"。
 *
 * @param iso ISO 8601 时间字符串
 * @returns 例如 "2026-03-25 14:05"；解析失败时返回 "—"
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const pad = (v: number): string => String(v).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
