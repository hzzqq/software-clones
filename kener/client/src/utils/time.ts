/**
 * 将时间格式化为中文相对时间（原生 Date 实现，无第三方依赖）。
 *
 * - 非法 / 缺失输入（''、null、undefined、无法解析的字符串）一律返回空串，
 *   调用方据此决定渲染占位，避免把 "Invalid Date" 暴露给用户（隐性 bug）。
 * - 传入 `now` 便于单元测试做确定性断言；缺省使用当前时间。
 *
 * 分段：
 *   < 1 分钟  → 刚刚
 *   < 60 分钟 → X 分钟前
 *   < 24 小时 → X 小时前
 *   < 7 天    → X 天前
 *   >= 7 天   → YYYY-MM-DD 绝对日期
 */
export function formatRelativeTime(
  input: string | number | Date | null | undefined,
  now: number = Date.now()
): string {
  if (input === null || input === undefined || input === '') return '';
  const t = new Date(input);
  const millis = t.getTime();
  if (Number.isNaN(millis)) return '';
  const diffMs = now - millis;
  if (!Number.isFinite(diffMs) || diffMs < 0) return formatAbs(t);
  if (diffMs < 60_000) return '刚刚';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return formatAbs(t);
}

function formatAbs(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
