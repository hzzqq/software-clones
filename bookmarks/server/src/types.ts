/** 书签分类。 */
export interface Category {
  id: number;
  name: string;
  /** 该分类下的书签数量（未分类书签不计入任何分类）。 */
  bookmarkCount: number;
  createdAt: string;
}

/** 书签。 */
export interface Bookmark {
  id: number;
  /** 归一化后的展示地址（可直接打开）。 */
  url: string;
  title: string;
  description: string;
  categoryId: number | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 创建书签的输入。 */
export interface BookmarkInput {
  url: string;
  title: string;
  description?: string;
  categoryId?: number | null;
}
