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
  /** 在制品（WIP）上限，0 表示不限制。 */
  wipLimit: number;
  createdAt: string;
}

/** 卡片检查清单条目（子任务）。 */
export interface ChecklistItem {
  id: number;
  cardId: number;
  text: string;
  /** 0 未完成 / 1 已完成，与服务端整型语义一致。 */
  done: number;
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
  /** 指派人姓名，空串表示未指派。 */
  assignee: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  tagIds: number[];
  checklist: ChecklistItem[];
  /** 该卡片的评论条数（由服务端在载荷中一次性带出，避免逐卡请求）。 */
  commentCount: number;
}

/**
 * 卡片活动类型。系统自动事件与用户评论共用一条时间线，
 * 取值与服务端 `ACTIVITY_KINDS` 一一对应。
 */
export type ActivityKind =
  | 'created'
  | 'moved'
  | 'renamed'
  | 'due'
  | 'priority'
  | 'assignee'
  | 'completed'
  | 'batch'
  | 'comment';

/** 卡片时间线上的一条记录（系统事件或用户评论）。 */
export interface Activity {
  id: number;
  cardId: number;
  kind: ActivityKind;
  detail: string;
  author: string;
  createdAt: string;
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
