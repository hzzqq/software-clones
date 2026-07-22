// Photopea 克隆 —— 前端类型

export type Tool = 'select' | 'brush' | 'eraser' | 'rect' | 'ellipse' | 'line' | 'text';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  canvas: HTMLCanvasElement;
}

export type FilterKind = 'grayscale' | 'invert' | 'brightness';

export interface Design {
  id: number;
  name: string;
  thumbnail: string;
  data: string;
  created_at: string;
  updated_at: string;
}
