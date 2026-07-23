import { describe, it, expect } from 'vitest';
import { clamp, grayscale, invert, brightness, sepia, uid, applyFilter, contrast, saturate, getFilterLabel, FILTER_LABELS, formatPercent } from './image';
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

describe('getFilterLabel', () => {
  const kinds: FilterKind[] = ['grayscale', 'invert', 'brightness', 'sepia', 'contrast', 'saturate'];
  it('全部 kind 都有中文标签', () => {
    for (const k of kinds) {
      expect(FILTER_LABELS[k]).toBeTruthy();
      expect(getFilterLabel(k)).toBe(FILTER_LABELS[k]);
    }
  });
  it('标签覆盖完整（6 种）', () => {
    expect(Object.keys(FILTER_LABELS)).toHaveLength(6);
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
