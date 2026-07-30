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

/**
 * 命中测试：点是否落在元素内（用于 select 工具）。
 * 矩形/文字走包围盒（AABB）；钢笔、箭头走「到线段距离 <= pad」的精确判定；
 * 椭圆走椭圆方程（含 pad 膨胀），避免点中椭圆四角或对角线箭头远端的空白区却误选
 * （此前箭头/椭圆共用 AABB，点击包围盒内任意位置都会命中，是隐性选择 bug）。
 */
export function hitTest(el: CanvasElement, pt: Point): boolean {
  const pad = 6;
  if (el.type === 'pen') {
    // 任意线段距离 < pad 即命中
    const pts = el.points ?? [];
    for (let i = 1; i < pts.length; i++) {
      if (distanceToSegment(pt, pts[i - 1], pts[i]) <= pad) return true;
    }
    return false;
  }
  if (el.type === 'arrow') {
    // 箭头的几何形状是线段，用「到线段距离」判定，而非其矩形包围盒
    return distanceToSegment(pt, { x: el.x, y: el.y }, { x: el.x + el.w, y: el.y + el.h }) <= pad;
  }
  if (el.type === 'ellipse') {
    const b = elementBounds(el);
    const rx = b.w / 2 + pad;
    const ry = b.h / 2 + pad;
    if (rx <= 0 || ry <= 0) return false;
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const nx = (pt.x - cx) / rx;
    const ny = (pt.y - cy) / ry;
    return nx * nx + ny * ny <= 1;
  }
  const b = elementBounds(el);
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

/**
 * 夹回线宽到 [min,max]（默认 [1,40]）；非法 / NaN / 非有限值回退 fallback（默认 2）。
 * 用于画笔 / 形状描边配置，避免负或极端线宽导致描边渲染异常（与 photopea 同类边界防御）。
 */
export function clampStrokeWidth(w: unknown, min = 1, max = 40, fallback = 2): number {
  const n = Number(w);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
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

/**
 * 返回用于「选中高亮」的显示包围盒（左上角 + 正尺寸）。
 * 关键：钢笔元素 w/h 恒为 0、真实形状由 points 决定，因此必须走 elementBounds，
 * 否则会得到起点处的 0×0 空盒，导致选中框只画在一个点上（隐性渲染 bug）。
 */
export function getSelectionBox(el: CanvasElement): { x: number; y: number; width: number; height: number } {
  const b = elementBounds(el);
  return { x: b.minX, y: b.minY, width: b.w, height: b.h };
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

/** 将单点绕 center 缩放 factor（factor>1 放大，<1 缩小，=1 恒等）。 */
function scalePoint(p: Point, factor: number, center: Point): Point {
  return {
    x: center.x + (p.x - center.x) * factor,
    y: center.y + (p.y - center.y) * factor,
  };
}

/** 返回绕 center 缩放 factor 后的「新」元素（不修改入参）。
 *  factor>1 放大、<1 缩小、=1 恒等。
 *  钢笔：缩放全部 points（x/y 同步更新为首个点）；
 *  矩形/椭圆/箭头/文字：缩放包围盒后重新计算左上角与正尺寸（w/h 保持几何正确）。 */
export function scaleElement(el: CanvasElement, factor: number, center: Point): CanvasElement {
  if (el.type === 'pen' && el.points) {
    const pts = el.points.map((p) => scalePoint(p, factor, center));
    const first = pts[0];
    return { ...el, x: first.x, y: first.y, points: pts };
  }
  const b = elementBounds(el);
  const minX = center.x + (b.minX - center.x) * factor;
  const minY = center.y + (b.minY - center.y) * factor;
  const maxX = center.x + (b.maxX - center.x) * factor;
  const maxY = center.y + (b.maxY - center.y) * factor;
  return {
    ...el,
    x: Math.min(minX, maxX),
    y: Math.min(minY, maxY),
    w: Math.abs(maxX - minX),
    h: Math.abs(maxY - minY),
  };
}

/**
 * 拖拽交互：保持抓取点（pointer - offset）跟随鼠标，返回「新」元素（不修改入参）。
 * 内部复用 translateElement，因此对钢笔元素也会同步平移全部 points，
 * 否则会出现「选框移动、墨迹不动」的隐性 bug（拖拽路径此前只改 x/y）。
 * offset 为按下时记录的 pointer - el 原点偏移。 */
export function dragElement(el: CanvasElement, pointer: Point, offset: Point): CanvasElement {
  const dx = pointer.x - offset.x - el.x;
  const dy = pointer.y - offset.y - el.y;
  return translateElement(el, dx, dy);
}

/**
 * 统计场景内各类型元素的数量分布，供图层面板/概览展示「矩形 3 · 椭圆 2」。
 * 对非有限或缺失 type 的元素归入 'unknown'，保证统计键始终为字符串。
 */
export function countElementsByType(els: CanvasElement[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const el of els) {
    const t = typeof el?.type === 'string' && el.type.length > 0 ? el.type : 'unknown';
    counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}

/**
 * 元素面积（包围盒宽×高，取绝对值，避免负尺寸导致负面积）。
 * 用于选中信息栏展示元素占用面积；对 w/h 缺失或非有限值返回 0。
 */
export function elementArea(el: CanvasElement): number {
  const w = Number.isFinite(el?.w) ? el.w : 0;
  const h = Number.isFinite(el?.h) ? el.h : 0;
  return Math.abs(w) * Math.abs(h);
}

/**
 * 计算折线总长度（相邻点之间的欧氏距离之和）。
 * - 点少于 2 个 → 返回 0（无路径）。
 * - 任意点缺失或非有限坐标视为 (0,0) 处理，避免抛错。
 * 用于钢笔元素「路径长度」展示。入参非数组返回 0。
 */
export function polylineLength(points: Point[] | null | undefined): number {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const ax = Number.isFinite(a?.x) ? a.x : 0;
    const ay = Number.isFinite(a?.y) ? a.y : 0;
    const bx = Number.isFinite(b?.x) ? b.x : 0;
    const by = Number.isFinite(b?.y) ? b.y : 0;
    total += Math.hypot(bx - ax, by - ay);
  }
  return total;
}
