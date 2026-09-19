/** 便签内的勾选清单项。 */
export interface NoteItem {
  id: number;
  noteId: number;
  text: string;
  done: boolean;
  sortOrder: number;
}

/** 便签（含标签与 checklist）。 */
export interface Note {
  id: number;
  title: string;
  body: string;
  color: string;
  isPinned: boolean;
  isArchived: boolean;
  isTrash: boolean;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  items: NoteItem[];
}

/** 标签汇总（含使用次数）。 */
export interface NoteLabel {
  id: number;
  name: string;
  count: number;
}

/** 创建 / 更新便签的输入。 */
export interface NoteInput {
  title?: string;
  body?: string;
  color?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isTrash?: boolean;
  labels?: string[];
  items?: NoteItemInput[];
}

/** checklist 项的输入（新建/更新）。 */
export interface NoteItemInput {
  id?: number;
  text: string;
  done?: boolean;
  sortOrder?: number;
}
