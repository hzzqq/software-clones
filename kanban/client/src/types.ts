/** Shared domain types for the Kanban app (camelCase DTOs). */

export interface Board {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: number;
  boardId: number;
  title: string;
  position: number;
  createdAt: string;
}

export interface Card {
  id: number;
  listId: number;
  title: string;
  description: string;
  dueDate: string | null;
  priority: number;
  completed: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  tagIds: number[];
}

export interface Tag {
  id: number;
  boardId: number;
  name: string;
  color: string;
}

export interface BoardDetail {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  lists: List[];
  cards: Card[];
  tags: Tag[];
}

export const PRIORITY_LABELS: Record<number, string> = {
  0: '低',
  1: '中',
  2: '高',
  3: '紧急',
};
