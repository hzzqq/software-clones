import type { CanvasElement, Point } from '../types';

/** 将可能为负的 w/h 归一成左上角 + 正尺寸。 */
export function normalizeRect(x: number, y: number, w: number, h: number) {
  return {
    x: w < 0 ? x + w : x,
    y: h < 0 ? y + h : y,
    w: Math.abs(w),
    h: Math.abs(h),
  };
}

/** 两点距离。 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 计算元素的包围盒（含钢笔点集）。 */
export function elementBounds(el: CanvasElement) {
  if (el.type === 'pen' && el.points && el.points.length) {
    const xs = el.points.map((p) => p.x);
    const ys = el.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      minX,
      minY,
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
      w: Math.max(...xs) - minX,
      h: Math.max(...ys) - minY,
    };
  }
  const n = normalizeRect(el.x, el.y, el.w, el.h);
  return { minX: n.x, minY: n.y, maxX: n.x + n.w, maxY: n.y + n.h, w: n.w, h: n.h };
}

/** 命中测试：点是否落在元素内（用于 select 工具）。 */
export function hitTest(el: CanvasElement, pt: Point): boolean {
  const b = elementBounds(el);
  const pad = 6;
  if (el.type === 'pen') {
    // 任意线段距离 < pad 即命中
    const pts = el.points ?? [];
    for (let i = 1; i < pts.length; i++) {
      if (distanceToSegment(pt, pts[i - 1], pts[i]) <= pad) return true;
    }
    return false;
  }
  return pt.x >= b.minX - pad && pt.x <= b.maxX + pad && pt.y >= b.minY - pad && pt.y <= b.maxY + pad;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** 生成唯一 id。 */
export function uid(): string {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 将场景元素序列化为可保存/导出的 JSON 字符串。 */
export function serializeScene(elements: CanvasElement[]): string {
  return JSON.stringify(elements);
}

/** 将点对齐到网格（gridSize 为步长；<=0 表示不吸附，原样返回）。 */
export function snapPoint(p: Point, gridSize: number): Point {
  if (gridSize <= 0) return p;
  return { x: Math.round(p.x / gridSize) * gridSize, y: Math.round(p.y / gridSize) * gridSize };
}

/** 计算所有图形的并集包围盒（内容边界）；空列表返回 null。 */
export function boundingBox(els: CanvasElement[]): { x: number; y: number; width: number; height: number } | null {
  if (!els.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of els) {
    const b = elementBounds(el);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 返回元素包围盒的中心点坐标。 */
export function getCenter(el: CanvasElement): Point {
  const b = elementBounds(el);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

/** 将单点顺时针旋转 degrees（屏幕坐标系，y 轴向下；正角度即视觉顺时针）绕 center。 */
function rotatePoint(p: Point, degrees: number, center: Point): Point {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** 返回绕 center 顺时针旋转 degrees 后的「新」元素（不修改入参）。
 *  钢笔：旋转全部 points（x/y 同步更新为首个点）；
 *  矩形/椭圆/箭头：旋转两个对角锚点并重新计算左上角与正尺寸（w/h 互换等保持几何正确）。 */
export function rotateElement(el: CanvasElement, degrees: number, center: Point): CanvasElement {
  if (el.type === 'pen' && el.points) {
    const pts = el.points.map((p) => rotatePoint(p, degrees, center));
    const first = pts[0];
    return { ...el, x: first.x, y: first.y, points: pts };
  }
  const a = rotatePoint({ x: el.x, y: el.y }, degrees, center);
  const b = rotatePoint({ x: el.x + el.w, y: el.y + el.h }, degrees, center);
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  return { ...el, x: minX, y: minY, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

/** 返回平移后的新元素（不修改入参；钢笔点集同步平移）。 */
export function translateElement(el: CanvasElement, dx: number, dy: number): CanvasElement {
  const moved: CanvasElement = { ...el, x: el.x + dx, y: el.y + dy };
  if (moved.type === 'pen' && moved.points) {
    moved.points = moved.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  }
  return moved;
}
