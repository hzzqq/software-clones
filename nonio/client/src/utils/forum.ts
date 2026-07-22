import type { Comment, CommentNode } from '../types';

/**
 * Non.io 论坛纯函数工具：标签解析、评论树构建、slug 生成。
 * 这些函数不依赖 React / 网络，便于单元测试。
 */

/** 从一段文本中提取 #标签（中文/英文/数字，支持 #标签 形式）。 */
export function parseTags(text: string): string[] {
  const matches = text.match(/#([\p{L}\p{N}_-]+)/gu) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const tag = m.slice(1).toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

/** 将字符串转为 URL 友好的 slug。 */
export function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `ch-${Date.now()}`;
}

/**
 * 将扁平评论列表组装为有层级的评论树（parentId 决定层级）。
 * 异常 parent 会退化为根级，保证不丢数据。
 */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of comments) {
    nodes.set(c.id, { ...c, children: [] });
  }
  for (const c of comments) {
    const node = nodes.get(c.id)!;
    if (c.parentId != null && nodes.has(c.parentId)) {
      nodes.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** 统计评论树中的总回复数（含嵌套）。 */
export function countComments(tree: CommentNode[]): number {
  let total = 0;
  for (const node of tree) {
    total += 1 + countComments(node.children);
  }
  return total;
}
