import { describe, it, expect } from 'vitest';
import { normalizeRect, distance, hitTest, elementBounds, uid, serializeScene, snapPoint, boundingBox, getCenter, getSelectionBox, translateElement, clampStrokeWidth } from './geometry';
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

describe('boundingBox', () => {
  const r1 = { id: '1', type: 'rect', stroke: '#000', strokeWidth: 2, x: 0, y: 0, w: 50, h: 30 } as CanvasElement;
  const r2 = { id: '2', type: 'rect', stroke: '#000', strokeWidth: 2, x: 100, y: 40, w: 20, h: 20 } as CanvasElement;
  it('并集包围盒', () => {
    expect(boundingBox([r1, r2])).toEqual({ x: 0, y: 0, width: 120, height: 60 });
  });
  it('单个图形即其自身包围盒', () => {
    expect(boundingBox([r1])).toEqual({ x: 0, y: 0, width: 50, height: 30 });
  });
  it('空列表返回 null', () => {
    expect(boundingBox([])).toBeNull();
  });
});

describe('getCenter', () => {
  const rect = { id: '1', type: 'rect', stroke: '#000', strokeWidth: 2, x: 0, y: 0, w: 50, h: 30 } as CanvasElement;
  it('矩形中心', () => {
    expect(getCenter(rect)).toEqual({ x: 25, y: 15 });
  });
  it('负坐标矩形中心', () => {
    const r = { id: '2', type: 'rect', stroke: '#000', strokeWidth: 2, x: -10, y: -20, w: 20, h: 40 } as CanvasElement;
    expect(getCenter(r)).toEqual({ x: 0, y: 0 });
  });
});

describe('getSelectionBox', () => {
  it('矩形高亮盒 = 归一化包围盒', () => {
    const r = { id: '1', type: 'rect', stroke: '#000', strokeWidth: 2, x: 10, y: 20, w: -50, h: 30 } as CanvasElement;
    expect(getSelectionBox(r)).toEqual({ x: -40, y: 20, width: 50, height: 30 });
  });
  it('钢笔高亮盒覆盖完整笔触（而非起点 0×0 空盒）', () => {
    const pen = { id: '2', type: 'pen', stroke: '#000', strokeWidth: 2, x: 5, y: 5, w: 0, h: 0, points: [{ x: 5, y: 5 }, { x: 60, y: 90 }] } as CanvasElement;
    expect(getSelectionBox(pen)).toEqual({ x: 5, y: 5, width: 55, height: 85 });
  });
});

describe('translateElement', () => {
  const rect = { id: '1', type: 'rect', stroke: '#000', strokeWidth: 2, x: 10, y: 20, w: 50, h: 30 } as CanvasElement;
  it('偏移 x/y', () => {
    const t = translateElement(rect, 5, -5);
    expect(t.x).toBe(15);
    expect(t.y).toBe(15);
    expect(t.w).toBe(50);
    expect(t.h).toBe(30);
  });
  it('钢笔点集同步平移', () => {
    const pen = { id: '2', type: 'pen', stroke: '#000', strokeWidth: 2, x: 0, y: 0, w: 0, h: 0, points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] } as CanvasElement;
    const t = translateElement(pen, 10, 20);
    expect(t.points).toEqual([{ x: 11, y: 22 }, { x: 13, y: 24 }]);
  });
  it('不修改入参', () => {
    translateElement(rect, 1, 1);
    expect(rect.x).toBe(10);
    expect(rect.y).toBe(20);
  });
});

describe('clampStrokeWidth', () => {
  it('正常范围内原样', () => {
    expect(clampStrokeWidth(2)).toBe(2);
    expect(clampStrokeWidth(8)).toBe(8);
    expect(clampStrokeWidth('4')).toBe(4);
  });
  it('超出 [1,40] 夹回边界', () => {
    expect(clampStrokeWidth(0)).toBe(1);
    expect(clampStrokeWidth(-5)).toBe(1);
    expect(clampStrokeWidth(999)).toBe(40);
  });
  it('非法/NaN 回退 fallback', () => {
    expect(clampStrokeWidth(NaN)).toBe(2);
    expect(clampStrokeWidth('abc')).toBe(2);
    expect(clampStrokeWidth(undefined)).toBe(2);
  });
  it('支持自定义 min/max/fallback', () => {
    expect(clampStrokeWidth(0.5, 1, 10, 3)).toBe(1);
    expect(clampStrokeWidth(20, 1, 10, 3)).toBe(10);
    expect(clampStrokeWidth(NaN, 1, 10, 5)).toBe(5);
  });
});
