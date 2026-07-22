// Markdown 本地笔记（Obsidian 系）—— 服务端类型

export type ISODate = string;

export interface Note {
  id: number;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  pinned: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface CreateNoteInput {
  title?: string;
  content: string;
  folder?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  folder?: string;
  tags?: string[];
  pinned?: boolean;
}
