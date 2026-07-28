/**
 * 把路由 / 字符串参数解析为数字 id。
 * 非法、缺失、NaN、非整数或 <=0 一律返回 null，避免组件以 NaN 发起错误的
 * API 请求（此前 `Number(id)` 对坏路由参数得到 NaN，会触发无意义的失败请求）。
 */
export function parseIdParam(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw.trim() === '') return null;
  const n: number = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
