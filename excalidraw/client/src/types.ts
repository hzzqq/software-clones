// Excalidraw 手绘白板 —— 前端类型

export type Tool = 'select' | 'pen' | 'rect' | 'ellipse' | 'arrow' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: Exclude<Tool, 'select'>;
  stroke: string;
  strokeWidth: number;
  // 矩形/椭圆/箭头：包围盒起点与尺寸；钢笔：points 为主，x/y 为起点
  x: number;
  y: number;
  w: number;
  h: number;
  points?: Point[]; // 仅钢笔
  text?: string; // 仅文本
}

export interface Scene {
  id: number;
  name: string;
  data: string;
  createdAt: string;
  updatedAt: string;
}
