// 图层命名 / 克隆辅助（纯函数，可在 node 下单元测试）

/**
 * 生成不重名的副本图层名。
 * 规则：基础名 + " 副本"；若已存在则在末尾追加序号（副本 2、副本 3 …）。
 */
export function duplicateLayerName(name: string, existing: string[]): string {
  const base = `${name} 副本`;
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}
