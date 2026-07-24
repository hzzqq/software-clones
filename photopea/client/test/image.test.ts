// 纯函数图像处理工具测试（vitest，无需 canvas 环境）
import { describe, it, expect } from 'vitest';
import { clampOpacity, formatBytes } from '../src/utils/image';

describe('clampOpacity', () => {
  it('区间 [0,1] 内的值保持不变', () => {
    expect(clampOpacity(0)).toBe(0);
    expect(clampOpacity(0.5)).toBe(0.5);
    expect(clampOpacity(1)).toBe(1);
  });

  it('小于 0 的值夹到 0', () => {
    expect(clampOpacity(-0.3)).toBe(0);
    expect(clampOpacity(-1)).toBe(0);
  });

  it('大于 1 的值夹到 1', () => {
    expect(clampOpacity(1.8)).toBe(1);
    expect(clampOpacity(10)).toBe(1);
  });

  it('NaN 视为 0', () => {
    expect(clampOpacity(NaN)).toBe(0);
  });

  it('不修改入参', () => {
    const input = 5;
    clampOpacity(input);
    expect(input).toBe(5);
  });
});

describe('formatBytes', () => {
  it('0 → "0 B"', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('不足 1KB 直接以 B 显示', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('不足 1MB 以 KB 显示并保留 1 位小数', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('跨 MB 区间正确换算', () => {
    expect(formatBytes(2500000)).toBe('2.4 MB');
  });

  it('负数与 NaN 退化为 "0 B" 且不修改入参', () => {
    const neg = -42;
    expect(formatBytes(neg)).toBe('0 B');
    expect(neg).toBe(-42);
    expect(formatBytes(NaN)).toBe('0 B');
    expect(formatBytes(Infinity)).toBe('0 B');
  });

  it('GB 区间显示保留 1 位小数', () => {
    expect(formatBytes(1024 * 1024 * 1024 * 3)).toBe('3 GB');
  });
});
