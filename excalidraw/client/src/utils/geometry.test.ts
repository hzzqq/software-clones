import { describe, it, expect } from 'vitest';
import { normalizeRect, distance, hitTest, elementBounds, uid, serializeScene, snapPoint } from './geometry';
import type { CanvasElement } from '../types';

describe('normalizeRect', () => {
  it('负宽高归正', () => {
    expect(normalizeRect(100, 100, -40, -20)).toEqual({ x: 60, y: 80, w: 40, h: 20 });
  });
  it('正宽高不变', () => {
    expect(normalizeRect(10, 20, 30, 40)).toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });
});

describe('distance', () => {
  it('欧氏距离', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('elementBounds', () => {
  it('矩形包围盒', () => {
    expect(elementBounds({ id: '1', type: 'rect', stroke: '#000', strokeWidth: 2, x: 0, y: 0, w: 50, h: 30 } as CanvasElement)).toEqual({
      minX: 0, minY: 0, maxX: 50, maxY: 30, w: 50, h: 30,
    });
  });
  it('钢笔点集包围盒', () => {
    const pen = { id: '2', type: 'pen', stroke: '#000', strokeWidth: 2, x: 0, y: 0, w: 0, h: 0, points: [{ x: 0, y: 0 }, { x: 10, y: 20 }] } as CanvasElement;
    expect(elementBounds(pen)).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 20, w: 10, h: 20 });
  });
});

describe('hitTest', () => {
  const rect = { id: '1', type: 'rect', stroke: '#000', strokeWidth: 2, x: 0, y: 0, w: 50, h: 30 } as CanvasElement;
  it('内部命中', () => {
    expect(hitTest(rect, { x: 25, y: 15 })).toBe(true);
  });
  it('外部不命中', () => {
    expect(hitTest(rect, { x: 200, y: 200 })).toBe(false);
  });
});

describe('uid', () => {
  it('生成不同 id', () => {
    expect(uid()).not.toBe(uid());
  });
});

describe('serializeScene', () => {
  const els: CanvasElement[] = [
    { id: 'a', type: 'rect', stroke: '#000', strokeWidth: 2, x: 1, y: 2, w: 3, h: 4 },
  ];
  it('序列化为 JSON 且可还原', () => {
    const json = serializeScene(els);
    expect(JSON.parse(json)).toEqual(els);
  });
  it('空场景为 "[]"', () => {
    expect(serializeScene([])).toBe('[]');
  });
});

describe('snapPoint', () => {
  it('对齐到网格', () => {
    expect(snapPoint({ x: 23, y: 37 }, 20)).toEqual({ x: 20, y: 40 });
  });
  it('gridSize<=0 不吸附', () => {
    expect(snapPoint({ x: 23, y: 37 }, 0)).toEqual({ x: 23, y: 37 });
  });
});
