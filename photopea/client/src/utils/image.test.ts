import { describe, it, expect } from 'vitest';
import { clamp, grayscale, invert, brightness, sepia, uid, applyFilter } from './image';

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
});
