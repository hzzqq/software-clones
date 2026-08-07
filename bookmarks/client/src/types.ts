/** 书签分类。 */
export interface Category {
  id: number;
  name: string;
  bookmarkCount: number;
  createdAt: string;
}

/** 书签。 */
export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string;
  categoryId: number | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 书签创建 / 编辑表单数据。 */
export interface BookmarkFormValues {
  url: string;
  title: string;
  description: string;
  categoryId: number | null;
}

/** 列表 / 网格视图模式。 */
export type ViewMode = 'list' | 'grid';
