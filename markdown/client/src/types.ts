// Markdown 本地笔记 —— 前端类型（与服务端一致）
export interface Note {
  id: number;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
