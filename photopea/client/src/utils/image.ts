// 纯函数图像处理工具（不依赖 canvas，可在 node 下单元测试）

/** 生成短随机 id。 */
export const uid = (): string => Math.random().toString(36).slice(2, 10);

/** 将数值限制在 [min, max] 区间内。 */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** 原地灰度化：按 Rec.601 luma 权重取均值。 */
export function grayscale(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = avg;
  }
}

/** 原地反色。 */
export function invert(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
}

/** 原地亮度调节，factor=1 不变，>1 变亮，<1 变暗。 */
export function brightness(data: Uint8ClampedArray, factor: number): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] * factor, 0, 255);
    data[i + 1] = clamp(data[i + 1] * factor, 0, 255);
    data[i + 2] = clamp(data[i + 2] * factor, 0, 255);
  }
}

/** 统一入口：按类型应用滤镜。 */
export function applyFilter(
  data: Uint8ClampedArray,
  kind: 'grayscale' | 'invert' | 'brightness',
  factor = 1
): void {
  if (kind === 'grayscale') grayscale(data);
  else if (kind === 'invert') invert(data);
  else brightness(data, factor);
}
