import { describe, it, expect } from 'vitest';
import { parseTags, slugify, buildCommentTree, countComments } from './forum';
import type { Comment } from '../types';

function mkComment(id: number, parentId: number | null): Comment {
  return {
    id,
    postId: 1,
    parentId,
    authorName: 'tester',
    body: 'x',
    likes: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('parseTags', () => {
  it('提取中英文 #标签并去重', () => {
    expect(parseTags('聊聊 #前端 和 #frontend 还有 #前端')).toEqual(['前端', 'frontend']);
  });
  it('没有标签时返回空数组', () => {
    expect(parseTags('普通文本没有标签')).toEqual([]);
  });
});

describe('slugify', () => {
  it('英文转连字符', () => {
    expect(slugify('Tech Share')).toBe('tech-share');
  });
  it('中文保留', () => {
    expect(slugify('技术分享')).toBe('技术分享');
  });
  it('空串回退', () => {
    expect(slugify('   ')).toMatch(/^ch-/);
  });
});

describe('buildCommentTree', () => {
  const flat: Comment[] = [
    mkComment(1, null),
    mkComment(2, 1),
    mkComment(3, 1),
    mkComment(4, 2),
    mkComment(5, 99),
  ];
  const tree = buildCommentTree(flat);
  it('根级数量为 2（含孤儿父节点退化为根）', () => {
    expect(tree.length).toBe(2);
  });
  it('嵌套结构正确', () => {
    const root = tree.find((n) => n.id === 1)!;
    expect(root.children.length).toBe(2);
    expect(root.children[0].children[0].id).toBe(4);
  });
  it('countComments 统计含嵌套', () => {
    expect(countComments(tree)).toBe(5);
  });
  it('按 createdAt 升序排序（根与子层）', () => {
    const ordered: Comment[] = [
      { ...mkComment(1, null), createdAt: '2026-01-03T00:00:00Z' },
      { ...mkComment(2, 1), createdAt: '2026-01-01T00:00:00Z' },
      { ...mkComment(3, 1), createdAt: '2026-01-02T00:00:00Z' },
    ];
    const t = buildCommentTree(ordered);
    expect(t[0].id).toBe(1);
    expect(t[0].children.map((c) => c.id)).toEqual([2, 3]);
  });
  it('打断循环 parent 引用（A↔B 双双退化为根，不无限递归）', () => {
    const cyclic: Comment[] = [mkComment(1, 2), mkComment(2, 1)];
    const t = buildCommentTree(cyclic);
    expect(t.length).toBe(2);
    // 任何一个节点都不应把对方作为子节点（环已被打断）
    expect(t.some((n) => n.children.some((c) => c.id === n.id))).toBe(false);
  });
  it('自引用 parent 退化为根', () => {
    const selfRef: Comment[] = [{ ...mkComment(7, 7) }];
    const t = buildCommentTree(selfRef);
    expect(t.length).toBe(1);
    expect(t[0].children.length).toBe(0);
  });
});
