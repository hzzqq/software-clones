// Excalidraw 手绘白板 —— 服务端类型（场景持久化）

export type ISODate = string;

export interface Scene {
  id: number;
  name: string;
  data: string; // JSON 序列化的画布元素数组
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface CreateSceneInput {
  name?: string;
  data: string;
}

export interface UpdateSceneInput {
  name?: string;
  data?: string;
}
