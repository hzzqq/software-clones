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

/** 原地复古棕调（sepia）。 */
export function sepia(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    data[i] = clamp(r * 0.393 + g * 0.769 + b * 0.189, 0, 255);
    data[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168, 0, 255);
    data[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131, 0, 255);
  }
}

/** 原地对比度调节，factor=1 不变，>1 增强，<1 减弱。 */
export function contrast(data: Uint8ClampedArray, factor: number): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp((data[i] - 128) * factor + 128, 0, 255);
    data[i + 1] = clamp((data[i + 1] - 128) * factor + 128, 0, 255);
    data[i + 2] = clamp((data[i + 2] - 128) * factor + 128, 0, 255);
  }
}

/** 原地饱和度调节，sat=0 变灰度，=1 不变，>1 增强、<1 减弱。 */
export function saturate(data: Uint8ClampedArray, sat: number): void {
  for (let i = 0; i < data.length; i += 4) {
    const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = clamp(g + (data[i] - g) * sat, 0, 255);
    data[i + 1] = clamp(g + (data[i + 1] - g) * sat, 0, 255);
    data[i + 2] = clamp(g + (data[i + 2] - g) * sat, 0, 255);
  }
}

/** 统一入口：按类型应用滤镜。 */
export function applyFilter(
  data: Uint8ClampedArray,
  kind: 'grayscale' | 'invert' | 'brightness' | 'sepia' | 'contrast' | 'saturate',
  factor = 1
): void {
  if (kind === 'grayscale') grayscale(data);
  else if (kind === 'invert') invert(data);
  else if (kind === 'sepia') sepia(data);
  else if (kind === 'contrast') contrast(data, factor);
  else if (kind === 'saturate') saturate(data, factor);
  else brightness(data, factor);
}
