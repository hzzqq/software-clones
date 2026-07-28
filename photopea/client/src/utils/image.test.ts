import { describe, it, expect } from 'vitest';
import { clamp, clampNumber, grayscale, invert, brightness, sepia, uid, applyFilter, contrast, saturate, getFilterLabel, FILTER_LABELS, formatPercent, blendOver, rgbToHsl, hslToRgb, hueRotate } from './image';
import type { FilterKind } from '../types';

function makeData(): Uint8ClampedArray {
  // 2 个像素：红 (255,0,0) 与 绿 (0,255,0)
  return new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
}

describe('image utils', () => {
  it('clamp 限制上下界', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(20, 0, 10)).toBe(10);
  });

  it('clampNumber 夹界且非有限值回退 fallback', () => {
    expect(clampNumber(5, 1, 8, 1)).toBe(5);
    expect(clampNumber(-2, 1, 8, 1)).toBe(1);
    expect(clampNumber(99, 1, 8, 1)).toBe(8);
    expect(clampNumber(NaN, 1, 8, 1)).toBe(1);
    expect(clampNumber(Number('abc'), 1, 8, 1)).toBe(1);
  });

  it('grayscale 取 RGB 均值并三通道一致', () => {
    const d = makeData();
    grayscale(d);
    expect(Math.round(d[0])).toBe(76); // 255*0.299 ≈ 76.2
    expect(d[0]).toBe(d[1]);
    expect(d[1]).toBe(d[2]);
  });

  it('invert 翻转通道', () => {
    const d = makeData();
    invert(d);
    expect(d[0]).toBe(0); // 255 -> 0
    expect(d[1]).toBe(255); // 0 -> 255
    expect(d[2]).toBe(255);
  });

  it('brightness 按系数缩放', () => {
    const d = makeData();
    brightness(d, 0.5);
    expect(d[0]).toBe(128); // 255*0.5=127.5 -> 128
    d.fill(0);
    brightness(d, 2);
    expect(d[0]).toBe(0); // 0 不变
  });

  it('applyFilter 分发到对应滤镜', () => {
    const d = makeData();
    applyFilter(d, 'invert');
    expect(d[0]).toBe(0);
  });

  it('sepia 复古棕调', () => {
    const d = makeData();
    sepia(d);
    // 红(255,0,0): R≈100 G≈89 B≈69
    expect(Math.round(d[0])).toBe(100);
    expect(Math.round(d[1])).toBe(89);
    expect(Math.round(d[2])).toBe(69);
  });

  it('uid 返回非空字符串', () => {
    expect(typeof uid()).toBe('string');
    expect(uid().length).toBeGreaterThan(0);
  });

  it('contrast 按系数调整中灰对比', () => {
    const d = makeData();
    contrast(d, 2);
    // 像素1 (255,0,0): R=(255-128)*2+128=382->255; G=(0-128)*2+128=-128->0
    expect(d[0]).toBe(255);
    expect(d[1]).toBe(0);
    expect(d[2]).toBe(0);
    d.fill(0);
    contrast(d, 2);
    // (0,0,0): (0-128)*2+128=-128->0
    expect(d[0]).toBe(0);
    d.fill(128);
    contrast(d, 2);
    // (128,128,128): 128 保持不变
    expect(d[0]).toBe(128);
  });

  it('applyFilter 分发到对比度滤镜', () => {
    const d = makeData();
    applyFilter(d, 'contrast', 2);
    expect(d[0]).toBe(255);
  });

  it('saturate sat=0 退化为灰度', () => {
    const d = makeData();
    saturate(d, 0);
    expect(d[0]).toBe(d[1]);
    expect(d[1]).toBe(d[2]);
  });

  it('saturate sat=1 不变', () => {
    const d = makeData();
    const before = [...d];
    saturate(d, 1);
    expect(Array.from(d)).toEqual(before);
  });

  it('saturate sat=2 提升饱和度（红色通道触顶 255，绿通道归 0）', () => {
    const d = makeData();
    saturate(d, 2);
    expect(d[0]).toBe(255); // 红通道 (255-76.2)*2+76.2 超出上限被夹到 255
    expect(d[1]).toBe(0);
  });

  it('applyFilter 分发到饱和度滤镜', () => {
    const d = makeData();
    applyFilter(d, 'saturate', 0);
    expect(d[0]).toBe(d[1]);
  });
});

describe('hueRotate / rgbToHsl / hslToRgb', () => {
  it('rgbToHsl 红(255,0,0) → h=0,s=1,l=0.5', () => {
    const [h, s, l] = rgbToHsl(255, 0, 0);
    expect(h).toBeCloseTo(0, 5);
    expect(s).toBeCloseTo(1, 5);
    expect(l).toBeCloseTo(0.5, 5);
  });

  it('rgbToHsl/hslToRgb 往返一致（红、绿、蓝、白、黑边界色精确）', () => {
    for (const [r, g, b] of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255], [0, 0, 0]]) {
      const [h, s, l] = rgbToHsl(r, g, b);
      const [rr, gg, bb] = hslToRgb(h, s, l);
      expect(rr).toBe(r);
      expect(gg).toBe(g);
      expect(bb).toBe(b);
    }
  });

  it('hueRotate +120° 红→绿，+240° 红→蓝', () => {
    const red = new Uint8ClampedArray([255, 0, 0, 255]);
    const g = red.slice();
    hueRotate(g, 120);
    expect(g[0]).toBe(0);
    expect(g[1]).toBe(255);
    expect(g[2]).toBe(0);

    const b = red.slice();
    hueRotate(b, 240);
    expect(b[0]).toBe(0);
    expect(b[1]).toBe(0);
    expect(b[2]).toBe(255);
  });

  it('hueRotate 360° 整圈回到原色，alpha 不变', () => {
    const d = new Uint8ClampedArray([123, 45, 200, 77]);
    const before = [...d];
    hueRotate(d, 360);
    expect(Array.from(d)).toEqual(before);
  });

  it('hueRotate 0° 为无操作（直接返回，不改动像素）', () => {
    const d = new Uint8ClampedArray([10, 20, 30, 40]);
    const before = [...d];
    hueRotate(d, 0);
    expect(Array.from(d)).toEqual(before);
  });

  it('hueRotate 不染色灰阶（s=0 像素旋转后不变）', () => {
    const d = new Uint8ClampedArray([128, 128, 128, 255]);
    const before = [...d];
    hueRotate(d, 90);
    expect(Array.from(d)).toEqual(before);
  });

  it('applyFilter 分发到色相滤镜', () => {
    const d = makeData();
    applyFilter(d, 'hue', 120);
    expect(d[0]).toBe(0); // 红(255,0,0) → 绿(0,255,0)
    expect(d[1]).toBe(255);
    expect(d[2]).toBe(0);
  });
});

describe('getFilterLabel', () => {
  const kinds: FilterKind[] = ['grayscale', 'invert', 'brightness', 'sepia', 'contrast', 'saturate'];
  it('全部 kind 都有中文标签', () => {
    for (const k of kinds) {
      expect(FILTER_LABELS[k]).toBeTruthy();
      expect(getFilterLabel(k)).toBe(FILTER_LABELS[k]);
    }
  });
  it('标签覆盖完整（7 种）', () => {
    expect(Object.keys(FILTER_LABELS)).toHaveLength(7);
  });
});

describe('formatPercent', () => {
  it('0-1 比例转百分比', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1)).toBe('100%');
  });
  it('四舍五入', () => {
    expect(formatPercent(0.333)).toBe('33%');
    expect(formatPercent(0.666)).toBe('67%');
  });
  it('越界自动夹取', () => {
    expect(formatPercent(-0.5)).toBe('0%');
    expect(formatPercent(2)).toBe('100%');
  });
});

describe('blendOver', () => {
  const RED: any = { r: 255, g: 0, b: 0, a: 255 };
  const BLUE: any = { r: 0, g: 0, b: 255, a: 255 };
  const WHITE: any = { r: 255, g: 255, b: 255, a: 255 };
  const TRANSPARENT: any = { r: 0, g: 0, b: 0, a: 0 };

  it('顶层完全不透明 → 结果即顶层颜色', () => {
    expect(blendOver(RED, 1, BLUE, 1)).toEqual(RED);
    expect(blendOver(RED, 1, TRANSPARENT, 1)).toEqual(RED);
  });

  it('顶层完全透明（像素 alpha=0）→ 退化为底层，不产生脏色', () => {
    expect(blendOver(TRANSPARENT, 1, BLUE, 1)).toEqual(BLUE);
    expect(blendOver(TRANSPARENT, 0, BLUE, 1)).toEqual(BLUE);
  });

  it('顶层 opacity=0 → 等同于不存在，结果与底层一致', () => {
    expect(blendOver(RED, 0, BLUE, 1)).toEqual(BLUE);
  });

  it('两层都透明 → 完全透明黑，不出现 NaN', () => {
    expect(blendOver(TRANSPARENT, 1, TRANSPARENT, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('半透明顶层按权重混合（预乘 alpha，不偏暗）', () => {
    // 红(255)以 0.5 覆盖白(255)：R 仍为 255；G/B = 127.5 → 四舍五入 128
    const r = blendOver(RED, 0.5, WHITE, 1);
    expect(r.r).toBe(255);
    expect(r.g).toBe(128); // 0*0.5 + 255*0.5 = 127.5 → 128
    expect(r.b).toBe(128);
    expect(r.a).toBe(255);
  });

  it('半透明顶层覆盖透明底 → alpha 与颜色同步衰减', () => {
    const r = blendOver(RED, 0.5, TRANSPARENT, 1);
    expect(r.a).toBe(128); // 255*0.5 = 127.5 → 128
    expect(r.r).toBe(255);
    expect(r.g).toBe(0);
    expect(r.b).toBe(0);
  });

  it('底层半透明、顶层不透明 → 有效 alpha 取重叠后饱和', () => {
    const r = blendOver(RED, 1, BLUE, 0.5);
    expect(r.a).toBe(255);
    expect(r.r).toBe(255); // 顶层不透明盖住底层
  });

  it('非法 opacity 被夹到 [0,1]（负值/Nan 视为 0，顶层消失），不抛错', () => {
    // topOpacity=-1 → 夹为 0 → 顶层完全消失 → 结果即底层
    expect(blendOver(RED, -1, BLUE, 2)).toEqual(BLUE);
    // topOpacity=NaN → 夹为 0 → 结果即底层
    expect(blendOver(RED, Number.NaN, BLUE, 1)).toEqual(BLUE);
  });
});
