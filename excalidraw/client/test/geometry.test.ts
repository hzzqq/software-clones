import { describe, it, expect } from 'vitest';
import type { CanvasElement } from '../src/types';
import { rotateElement, getCenter, scaleElement } from '../src/utils/geometry';

function makePen(): CanvasElement {
  return {
    id: 'p1',
    type: 'pen',
    stroke: '#000',
    strokeWidth: 2,
    x: 10,
    y: 0,
    w: 0,
    h: 0,
    points: [
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ],
  };
}

function makeRect(): CanvasElement {
  return {
    id: 'r1',
    type: 'rect',
    stroke: '#000',
    strokeWidth: 2,
    x: 0,
    y: 0,
    w: 10,
    h: 20,
  };
}

describe('rotateElement', () => {
  it('90° 顺时针旋转已知点（绕原点）：(10,0)->(0,10), (10,10)->(-10,10)', () => {
    const el = makePen();
    const rotated = rotateElement(el, 90, { x: 0, y: 0 });
    expect(rotated.points?.[0].x).toBeCloseTo(0);
    expect(rotated.points?.[0].y).toBeCloseTo(10);
    expect(rotated.points?.[1].x).toBeCloseTo(-10);
    expect(rotated.points?.[1].y).toBeCloseTo(10);
    // x/y 同步更新为首点
    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(10);
  });

  it('90° 顺时针旋转已知点（绕中心 (5,5)）：(5,0)->(10,5)', () => {
    const el: CanvasElement = { ...makePen(), points: [{ x: 5, y: 0 }], x: 5, y: 0 };
    const rotated = rotateElement(el, 90, { x: 5, y: 5 });
    expect(rotated.points?.[0].x).toBeCloseTo(10);
    expect(rotated.points?.[0].y).toBeCloseTo(5);
  });

  it('0° 旋转等价于恒等变换（深浅结构均不变）', () => {
    const el = makeRect();
    const rotated = rotateElement(el, 0, getCenter(el));
    expect(rotated).toEqual(el);
  });

  it('不修改入参（纯函数）：旋转后原元素 points/x/y 不变', () => {
    const el = makePen();
    const snapshot = JSON.parse(JSON.stringify(el)) as CanvasElement;
    rotateElement(el, 90, { x: 0, y: 0 });
    expect(el).toEqual(snapshot);
  });

  it('矩形绕自身中心旋转 90° 后 w/h 互换（10×20 -> 20×10）', () => {
    const el = makeRect();
    const rotated = rotateElement(el, 90, getCenter(el));
    expect(rotated.w).toBeCloseTo(20);
    expect(rotated.h).toBeCloseTo(10);
  });
});

describe('scaleElement', () => {
  it('绕原点放大 2 倍：矩形 10×20 -> 20×40', () => {
    const el = makeRect();
    const scaled = scaleElement(el, 2, { x: 0, y: 0 });
    expect(scaled.x).toBeCloseTo(0);
    expect(scaled.y).toBeCloseTo(0);
    expect(scaled.w).toBeCloseTo(20);
    expect(scaled.h).toBeCloseTo(40);
  });

  it('绕原点缩小 0.5 倍：矩形 10×20 -> 5×10', () => {
    const el = makeRect();
    const scaled = scaleElement(el, 0.5, { x: 0, y: 0 });
    expect(scaled.x).toBeCloseTo(0);
    expect(scaled.y).toBeCloseTo(0);
    expect(scaled.w).toBeCloseTo(5);
    expect(scaled.h).toBeCloseTo(10);
  });

  it('factor=1 恒等变换（深浅结构均不变）', () => {
    const el = makeRect();
    const scaled = scaleElement(el, 1, getCenter(el));
    expect(scaled).toEqual(el);
  });

  it('钢笔绕自身中心放大 2 倍：点集同步缩放且 x/y 更新为首点', () => {
    const el = makePen(); // points (10,0),(10,10)，中心 (10,5)
    const c = getCenter(el);
    expect(c).toEqual({ x: 10, y: 5 });
    const scaled = scaleElement(el, 2, c);
    // (10,0) -> (10, -5)；(10,10) -> (10, 15)
    expect(scaled.points?.[0].x).toBeCloseTo(10);
    expect(scaled.points?.[0].y).toBeCloseTo(-5);
    expect(scaled.points?.[1].x).toBeCloseTo(10);
    expect(scaled.points?.[1].y).toBeCloseTo(15);
    expect(scaled.x).toBeCloseTo(scaled.points?.[0].x);
    expect(scaled.y).toBeCloseTo(scaled.points?.[0].y);
  });

  it('不修改入参（纯函数）：缩放后原元素 points/x/y/w/h 不变', () => {
    const el = makePen();
    const snapshot = JSON.parse(JSON.stringify(el)) as CanvasElement;
    scaleElement(el, 2, { x: 0, y: 0 });
    expect(el).toEqual(snapshot);
  });
});
