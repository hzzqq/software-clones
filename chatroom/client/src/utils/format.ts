/**
 * 消息时间格式化工具（含单测，见 format.test.ts）。
 */

/**
 * 把 ISO 时间格式化为 "HH:mm"（今天）或 "MM-DD HH:mm"（更早）。
 *
 * @param iso ISO 8601 时间字符串
 * @returns 例如 "14:05" 或 "03-25 14:05"；解析失败返回 "—"
 */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const pad = (v: number): string => String(v).padStart(2, '0');
  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return hm;
  }
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hm}`;
}
