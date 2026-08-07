/** 代码片段。 */
export interface Snippet {
  id: number;
  title: string;
  language: string;
  code: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** 标签汇总（含使用次数）。 */
export interface Tag {
  id: number;
  name: string;
  count: number;
}

/** 创建 / 更新片段的输入。 */
export interface SnippetInput {
  title: string;
  language: string;
  code: string;
  tags: string[];
}
