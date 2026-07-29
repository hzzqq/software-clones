// 图层命名 / 克隆辅助（纯函数，可在 node 下单元测试）

import { clampOpacity } from './image';

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

/** 撤销 / 重做快照里记录的图层元数据（不含像素，像素由 dataURL 单独保存）。 */
export interface LayerMeta {
  name: string;
  opacity: number;
  visible: boolean;
}

/**
 * 把快照中的图层元数据按索引写回到现有图层对象（不触碰 canvas 像素）。
 * 用于撤销 / 重做时完整还原图层，避免「撤销删除图层」后名称 / 不透明度 / 可见性
 * 被重置为默认值（图层 N / 1 / 可见）这一隐性数据丢失 bug。
 * - 仅按索引覆盖前 min(layers, metas) 个图层，多余 meta 或图层被安全忽略；
 * - opacity 经 clampOpacity 夹到 [0,1]，非法值退化为 0，避免渲染出 NaN 透明度。
 */
export function applyLayerMeta(
  layers: Array<{ name: string; opacity: number; visible: boolean }>,
  metas: Array<LayerMeta>
): void {
  const n = Math.min(layers.length, metas.length);
  for (let i = 0; i < n; i++) {
    const m = metas[i];
    layers[i].name = m.name;
    layers[i].opacity = clampOpacity(m.opacity);
    layers[i].visible = m.visible;
  }
}
