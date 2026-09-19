/** 节点类型。 */
export type NodeKind = 'note' | 'group' | 'image';

/** 连接点方位。 */
export type EdgeSide = 'top' | 'right' | 'bottom' | 'left';

/** 画布（Canvas）。 */
export interface Canvas {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** 画布节点。 */
export interface CanvasNode {
  id: number;
  canvasId: number;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 连线。 */
export interface CanvasEdge {
  id: number;
  canvasId: number;
  fromId: number;
  toId: number;
  fromSide: EdgeSide;
  toSide: EdgeSide;
}

/** 画布完整数据（含节点与连线），供前端一次性加载渲染。 */
export interface CanvasFull extends Canvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
