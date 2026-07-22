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
