/** 页面（Page）。 */
export interface Page {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** 大纲块（Block）。 */
export interface Block {
  id: number;
  pageId: number;
  parentId: number | null;
  content: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** 块间引用（反链）。 */
export interface BlockLink {
  id: number;
  fromBlockId: number;
  toPageId: number | null;
  toBlockId: number | null;
}

/** 带子节点的块树节点（用于前端缩进大纲）。 */
export interface BlockNode extends Block {
  children: BlockNode[];
}

/** 反链条目：指向「谁链接到了当前页/块」。 */
export interface Backlink {
  fromBlockId: number;
  fromBlockContent: string;
  fromPageId: number;
  fromPageTitle: string;
}

/** 搜索结果（页面或块）。 */
export interface SearchResultPage {
  id: number;
  title: string;
  type: 'page';
}

export interface SearchResultBlock {
  id: number;
  content: string;
  pageId: number;
  pageTitle: string;
  type: 'block';
}

export interface SearchResult {
  pages: SearchResultPage[];
  blocks: SearchResultBlock[];
}

/** 创建 / 更新页面的输入。 */
export interface PageInput {
  title: string;
}

/** 创建 / 更新块的输入。 */
export interface BlockInput {
  pageId?: number;
  parentId?: number | null;
  content?: string;
  sortOrder?: number;
}
