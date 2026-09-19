/**
 * 引用解析工具（零依赖）：从块内容中提取
 *  - `[[页面名]]` → 页面引用（按标题定位）
 *  - `((块id))`   → 块引用（按 id 定位）
 * 解析出的引用交由 linkRepo 写入 block_links 表，从而支撑「反链」面板。
 */

export interface ParsedRefs {
  /** 页面标题（已 trim，去重，保持出现顺序）。 */
  pageTitles: string[];
  /** 块 id（数字，去重，保持出现顺序）。 */
  blockIds: number[];
}

const PAGE_LINK_RE = /\[\[([^[\]]+?)\]\]/g;
const BLOCK_LINK_RE = /\(\((\d+)\)\)/g;

/**
 * 解析块内容中的页面/块引用。
 * 纯函数，便于单测；不匹配嵌套过深的非法写法。
 */
export function parseRefs(content: string): ParsedRefs {
  const pageTitles: string[] = [];
  const blockIds: number[] = [];

  if (!content) {
    return { pageTitles, blockIds };
  }

  let m: RegExpExecArray | null;
  PAGE_LINK_RE.lastIndex = 0;
  while ((m = PAGE_LINK_RE.exec(content)) !== null) {
    const title = m[1].trim();
    if (title && !pageTitles.includes(title)) {
      pageTitles.push(title);
    }
  }

  BLOCK_LINK_RE.lastIndex = 0;
  while ((m = BLOCK_LINK_RE.exec(content)) !== null) {
    const id = Number(m[1]);
    if (Number.isInteger(id) && id > 0 && !blockIds.includes(id)) {
      blockIds.push(id);
    }
  }

  return { pageTitles, blockIds };
}
