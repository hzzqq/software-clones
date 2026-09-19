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

/** 便签表单数据（编辑弹窗使用）。 */
export interface NoteFormValues {
  title: string;
  body: string;
  color: string;
  isPinned: boolean;
  labels: string;
  items: { text: string; done: boolean }[];
}

/** 便签视图。 */
export type NoteView = 'active' | 'archived' | 'trash';

/** keep 支持的颜色及其展示色。 */
export const NOTE_COLORS: Record<string, { bg: string; border: string }> = {
  default: { bg: '#ffffff', border: '#e5e7eb' },
  red: { bg: '#fde7e9', border: '#f6c5cb' },
  orange: { bg: '#fde7d3', border: '#f6cba0' },
  yellow: { bg: '#fdf4cf', border: '#f2e08a' },
  green: { bg: '#e3f5d9', border: '#bfe3a8' },
  teal: { bg: '#d6f3f0', border: '#a6dbd4' },
  blue: { bg: '#d9e8fd', border: '#a8c8f6' },
  purple: { bg: '#e8dcfd', border: '#cbb0f6' },
  pink: { bg: '#fde0ef', border: '#f6b3d9' },
  brown: { bg: '#ede0d6', border: '#d6bfa6' },
  gray: { bg: '#eceff1', border: '#cfd6db' },
};

export const NOTE_COLOR_OPTIONS = Object.keys(NOTE_COLORS);
