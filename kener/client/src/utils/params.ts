/**
 * 从路由参数安全解析正整数 id。
 * 空 / null / 非数字 / 非整数 / 非正数一律返回 null，
 * 避免把 NaN 或负数悄悄传给 API（此前 `Number(id)` 对非法参数会原样传 NaN）。
 */
export function parseIdParam(raw: string | undefined | null): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
