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

/** 语言定义（与 utils/highlight.ts 的 id 一致）。 */
export interface LanguageOption {
  id: string;
  label: string;
}

/** 片段创建 / 编辑表单数据。 */
export interface SnippetFormValues {
  title: string;
  language: string;
  code: string;
  tags: string;
}
