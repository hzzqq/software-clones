import type { Comment, CommentNode, Post } from '../types';

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
 * 同时：① 按 createdAt 升序排序（根与每一层子节点）；
 *       ② 检测并打断循环 parent 引用（A→B→A），避免渲染时无限递归。
 */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map<number, CommentNode>();
  const parentOf = new Map<number, number>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    if (c.parentId != null) parentOf.set(c.id, c.parentId);
    nodes.set(c.id, { ...c, children: [] });
  }

  // 从 id 沿 parent 链向上走：若遇到 target 或遇到既有环，返回 true（应打断）。
  const reaches = (id: number, target: number): boolean => {
    const seen = new Set<number>();
    let cur: number | undefined = id;
    while (cur != null) {
      if (cur === target) return true;
      if (seen.has(cur)) return true; // 父链中已存在环 → 打断
      seen.add(cur);
      cur = parentOf.get(cur);
    }
    return false;
  };

  for (const c of comments) {
    const node = nodes.get(c.id)!;
    if (c.parentId != null && nodes.has(c.parentId) && !reaches(c.parentId, c.id)) {
      nodes.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByTime = (list: CommentNode[]) => {
    list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    for (const n of list) sortByTime(n.children);
  };
  sortByTime(roots);
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

/** 按频道 + 关键字（标题/正文）过滤帖子；空白关键字匹配全部。 */
export function searchPosts(query: string, channelId: number | null, posts: Post[]): Post[] {
  const needle = query.trim().toLowerCase();
  return posts.filter((p) => {
    if (channelId != null && p.channelId !== channelId) return false;
    if (needle && !`${p.title} ${p.body}`.toLowerCase().includes(needle)) return false;
    return true;
  });
}
