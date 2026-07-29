// 纯函数图像处理工具（不依赖 canvas，可在 node 下单元测试）
import type { FilterKind } from '../types';

/** 生成短随机 id。 */
export const uid = (): string => Math.random().toString(36).slice(2, 10);

/** 将数值限制在 [min, max] 区间内。 */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** 将数值夹入 [min, max]；非有限值（NaN/Infinity/undefined）回退 fallback。用于表单输入兜底，防止越界/非法值进入渲染与导出。 */
export function clampNumber(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

/** 将透明度值夹到 [0,1] 区间，NaN 视为 0；不修改入参。 */
export function clampOpacity(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
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
  kind: 'grayscale' | 'invert' | 'brightness' | 'sepia' | 'contrast' | 'saturate' | 'hue',
  factor = 1
): void {
  if (kind === 'grayscale') grayscale(data);
  else if (kind === 'invert') invert(data);
  else if (kind === 'sepia') sepia(data);
  else if (kind === 'contrast') contrast(data, factor);
  else if (kind === 'saturate') saturate(data, factor);
  else if (kind === 'hue') hueRotate(data, factor);
  else brightness(data, factor);
}

/** RGB(0-255) → HSL，h/s/l 均落在 [0,1]。灰阶（s=0）的 hue 未定义，约定为 0。 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, s, l];
}

/** HSL（h/s/l 均 [0,1]）→ RGB(0-255)。 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = clamp(Math.round(l * 255), 0, 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const r = clamp(Math.round(hue2rgb(h + 1 / 3) * 255), 0, 255);
  const g = clamp(Math.round(hue2rgb(h) * 255), 0, 255);
  const b = clamp(Math.round(hue2rgb(h - 1 / 3) * 255), 0, 255);
  return [r, g, b];
}

/**
 * 原地色相旋转（degrees 任意实数，自动归一到 [0,360)）。
 * 对每个像素做 RGB→HSL→（位移 H）→RGB；仅旋转色相，不改动饱和度/明度/alpha，
 * 因此灰阶（s=0）与透明像素不会被染色。degrees=0 视为无操作直接返回。
 * 该纯函数便于在 node 下做确定性单元测试（如红→绿 +120°、红→蓝 +240°）。
 */
export function hueRotate(data: Uint8ClampedArray, degrees: number): void {
  const d = ((degrees % 360) + 360) % 360;
  if (d === 0) return;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const [r, g, b] = hslToRgb((h + d / 360) % 1, s, l);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

/** 滤镜中文标签映射。 */
export const FILTER_LABELS: Record<FilterKind, string> = {
  grayscale: '灰度',
  invert: '反色',
  brightness: '亮度',
  sepia: '复古',
  contrast: '对比度',
  saturate: '饱和度',
  hue: '色相',
};

/** 返回滤镜的中文标签（未知 kind 退化为原名，避免界面显示空白）。 */
export function getFilterLabel(kind: FilterKind): string {
  return FILTER_LABELS[kind] ?? kind;
}

/** 将 0-1 比例格式化为百分比文本（如 0.5 → "50%"），自动夹到 [0,1]。 */
export function formatPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

/** 一个像素的 RGBA 分量（各分量 0-255）。 */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * 标准 source-over 透明合成（"上下层合并"的逐像素数学）。
 *
 * - 同时考虑「图层不透明度」(topOpacity/bottomOpacity，0-1) 与「像素自身 alpha」(a/255)，
 *   因此完全透明像素 (a=0) 不会污染下层，半透明像素会按权重混合。
 * - 使用预乘 alpha 公式，避免直接对 straight-alpha 做线性插值导致的暗边/亮边伪影
 *   （典型隐性 bug：out.r = top.r*ta + bottom.r*ba 这种写法在半透明时会偏暗）。
 * - 任一图层完全透明（有效 alpha 为 0）时退化为另一图层本身（含其 alpha），不出现 NaN。
 * - 顶层完全不透明时结果即顶层颜色，与浏览器 canvas 的 drawImage 表现一致。
 *
 * 该函数是「向下合并图层」功能的核心，单独抽出便于在 node 下做确定性单元测试。
 */
export function blendOver(top: Rgba, topOpacity: number, bottom: Rgba, bottomOpacity: number): Rgba {
  const ta = (top.a / 255) * clampOpacity(topOpacity);
  const ba = (bottom.a / 255) * clampOpacity(bottomOpacity);
  const outA = ta + ba * (1 - ta);
  if (outA <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  const r = (top.r * ta + bottom.r * ba * (1 - ta)) / outA;
  const g = (top.g * ta + bottom.g * ba * (1 - ta)) / outA;
  const b = (top.b * ta + bottom.b * ba * (1 - ta)) / outA;
  return {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
    a: clamp(Math.round(outA * 255), 0, 255),
  };
}

/** 去掉 1 位小数末尾无意义的 .0（如 2.0 → "2"，1.5 → "1.5"）。 */
function trimZero(v: number): string {
  const s = v.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/**
 * 将字节数格式化为可读文本：<1024 → "x B"；<1024² → "x.x KB"；
 * <1024³ → "x.x MB"；否则 "x.x GB"。保留 1 位小数并去掉末尾 .0。
 * 负数 / 非有限值（NaN、Infinity）统一视为 0，不修改入参。
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${trimZero(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${trimZero(bytes / (1024 * 1024))} MB`;
  return `${trimZero(bytes / (1024 * 1024 * 1024))} GB`;
}

/**
 * RGB(0-255) → #rrggbb。通道越界/非有限值按 0 处理并 clamp 到 [0,255]，
 * 保证任何渲染来源的颜色都能安全落入合法 CSS 颜色区间。
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number): string => {
    const n = Math.max(0, Math.min(255, Math.round(Number.isFinite(v) ? v : 0)));
    return n.toString(16).padStart(2, '0');
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * #rgb / #rrggbb → [r,g,b]。非法输入（非字符串、长度不符、非 hex）返回 null，
 * 调用方据此跳过渲染而非抛错，避免图层颜色解析导致白屏。
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h.split('').map((ch) => ch + ch).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
