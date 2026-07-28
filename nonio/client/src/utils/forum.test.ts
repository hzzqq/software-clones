import { describe, it, expect } from 'vitest';
import { parseTags, slugify, buildCommentTree, countComments, searchPosts, excerpt, topPosts, summarizePosts, filterPostsByChannel, formatRelativeTime, formatDateTime, sortPosts, parseIdParam, formatCompactNumber } from './forum';
import type { Comment, Post } from '../types';

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

describe('searchPosts', () => {
  const posts: Post[] = [
    { id: 1, channelId: 1, channelName: 'a', title: 'Lofi 入门', body: '放松音乐', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: '', updatedAt: '' },
    { id: 2, channelId: 2, channelName: 'b', title: 'React 技巧', body: 'hooks 精讲', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: '', updatedAt: '' },
    { id: 3, channelId: 1, channelName: 'a', title: 'Lofi 进阶', body: 'sleep beats', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: '', updatedAt: '' },
  ];
  it('query 与 channel 都为空时返回全部', () => {
    expect(searchPosts('', null, posts)).toHaveLength(3);
  });
  it('按频道过滤', () => {
    expect(searchPosts('', 1, posts).map((p) => p.id)).toEqual([1, 3]);
  });
  it('按关键字过滤（标题/正文，忽略大小写）', () => {
    expect(searchPosts('LOFI', null, posts).map((p) => p.id)).toEqual([1, 3]);
    expect(searchPosts('hooks', null, posts).map((p) => p.id)).toEqual([2]);
  });
  it('频道 + 关键字叠加生效', () => {
    expect(searchPosts('lofi', 1, posts).map((p) => p.id)).toEqual([1, 3]);
  });
});

describe('excerpt', () => {
  it('去除 Markdown 标记并折叠空白', () => {
    const md = '# 标题\n\n这是 **加粗** 和 `代码` 与 [链接](http://x.com)。\n\n- 列表项';
    expect(excerpt(md, 200)).toBe('标题 这是 加粗 和 代码 与 链接。 列表项');
  });
  it('短文本原样返回（仅去标记）', () => {
    expect(excerpt('# 你好 world')).toBe('你好 world');
  });
  it('超长文本截断并加省略号', () => {
    const long = '一'.repeat(300);
    const out = excerpt(long, 180);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBe(181);
  });
  it('空串返回空串', () => {
    expect(excerpt('')).toBe('');
  });
});

describe('topPosts', () => {
  const posts: Post[] = [
    { id: 1, channelId: 1, channelName: 'a', title: 'A', body: '', authorName: '', tags: [], likes: 5, commentCount: 2, createdAt: '', updatedAt: '' },
    { id: 2, channelId: 1, channelName: 'a', title: 'B', body: '', authorName: '', tags: [], likes: 20, commentCount: 8, createdAt: '', updatedAt: '' },
    { id: 3, channelId: 1, channelName: 'a', title: 'C', body: '', authorName: '', tags: [], likes: 12, commentCount: 1, createdAt: '', updatedAt: '' },
    { id: 4, channelId: 1, channelName: 'a', title: 'D', body: '', authorName: '', tags: [], likes: 3, commentCount: 30, createdAt: '', updatedAt: '' },
  ];
  it('默认按点赞取前 N', () => {
    expect(topPosts(posts, 3).map((p) => p.id)).toEqual([2, 3, 1]);
  });
  it('按评论数排序', () => {
    expect(topPosts(posts, 2, 'comments').map((p) => p.id)).toEqual([4, 2]);
  });
  it('n 大于列表长度时返回全部', () => {
    expect(topPosts(posts, 99)).toHaveLength(4);
  });
  it('空列表返回空数组', () => {
    expect(topPosts([], 3)).toEqual([]);
  });
  it('不修改入参', () => {
    const before = posts.map((p) => p.id);
    topPosts(posts, 3);
    expect(posts.map((p) => p.id)).toEqual(before);
  });
});

describe('filterPostsByChannel', () => {
  const posts: Post[] = [
    { id: 1, channelId: 1, channelName: 'a', title: 'Lofi 入门', body: '', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: '', updatedAt: '' },
    { id: 2, channelId: 2, channelName: 'b', title: 'React 技巧', body: '', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: '', updatedAt: '' },
    { id: 3, channelId: 1, channelName: 'a', title: 'Lofi 进阶', body: '', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: '', updatedAt: '' },
  ];
  it('匹配指定频道', () => {
    expect(filterPostsByChannel(posts, 1).map((p) => p.id)).toEqual([1, 3]);
    expect(filterPostsByChannel(posts, 2).map((p) => p.id)).toEqual([2]);
  });
  it('字符串形式的频道 id 与数字等价', () => {
    expect(filterPostsByChannel(posts, '1').map((p) => p.id)).toEqual([1, 3]);
  });
  it('无匹配时返回空数组', () => {
    expect(filterPostsByChannel(posts, 99)).toEqual([]);
  });
  it('null / 空串 / 0 返回全部', () => {
    expect(filterPostsByChannel(posts, null)).toHaveLength(3);
    expect(filterPostsByChannel(posts, '')).toHaveLength(3);
    expect(filterPostsByChannel(posts, 0)).toHaveLength(3);
  });
  it('不修改入参', () => {
    const before = posts.map((p) => p.id);
    const out = filterPostsByChannel(posts, 1);
    expect(posts.map((p) => p.id)).toEqual(before);
    expect(out).not.toBe(posts); // 返回的是新数组
  });
});

describe('summarizePosts', () => {
  const posts: Post[] = [
    { id: 1, channelId: 1, channelName: 'a', title: 'A', body: '', authorName: '', tags: [], likes: 5, commentCount: 2, createdAt: '', updatedAt: '' },
    { id: 2, channelId: 2, channelName: 'b', title: 'B', body: '', authorName: '', tags: [], likes: 20, commentCount: 8, createdAt: '', updatedAt: '' },
    { id: 3, channelId: 1, channelName: 'a', title: 'C', body: '', authorName: '', tags: [], likes: 12, commentCount: 1, createdAt: '', updatedAt: '' },
  ];
  it('统计总数、总点赞、总评论、频道数', () => {
    expect(summarizePosts(posts)).toEqual({ total: 3, totalLikes: 37, totalComments: 11, channels: 2 });
  });
  it('空列表返回全零', () => {
    expect(summarizePosts([])).toEqual({ total: 0, totalLikes: 0, totalComments: 0, channels: 0 });
  });
  it('缺省点赞/评论视为 0', () => {
    const messy: Post[] = [
      { id: 1, channelId: 1, channelName: 'a', title: 'x', body: '', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: '', updatedAt: '' },
      { id: 2, channelId: 3, channelName: 'c', title: 'y', body: '', authorName: '', tags: [], likes: 4, commentCount: 0, createdAt: '', updatedAt: '' },
    ];
    expect(summarizePosts(messy)).toEqual({ total: 2, totalLikes: 4, totalComments: 0, channels: 2 });
  });
  it('不修改入参', () => {
    const before = posts.map((p) => p.id);
    summarizePosts(posts);
    expect(posts.map((p) => p.id)).toEqual(before);
  });
});

describe('sortPosts', () => {
  const posts: Post[] = [
    { id: 1, channelId: 1, channelName: 'a', title: 'A', body: '', authorName: '', tags: [], likes: 5, commentCount: 2, createdAt: '2026-01-01', updatedAt: '' },
    { id: 2, channelId: 1, channelName: 'a', title: 'B', body: '', authorName: '', tags: [], likes: 20, commentCount: 8, createdAt: '2026-03-01', updatedAt: '' },
    { id: 3, channelId: 1, channelName: 'a', title: 'C', body: '', authorName: '', tags: [], likes: 12, commentCount: 1, createdAt: '2026-02-01', updatedAt: '' },
  ];
  it('newest 按发布时间倒序', () => {
    expect(sortPosts(posts, 'newest').map((p) => p.id)).toEqual([2, 3, 1]);
  });
  it('likes 按点赞数倒序', () => {
    expect(sortPosts(posts, 'likes').map((p) => p.id)).toEqual([2, 3, 1]);
  });
  it('comments 按评论数倒序', () => {
    expect(sortPosts(posts, 'comments').map((p) => p.id)).toEqual([2, 1, 3]);
  });
  it('非法/空 createdAt 视为最早且排序稳定', () => {
    const messy: Post[] = [
      { id: 1, channelId: 1, channelName: 'a', title: 'A', body: '', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: 'not-a-date', updatedAt: '' },
      { id: 2, channelId: 1, channelName: 'a', title: 'B', body: '', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: '', updatedAt: '' },
      { id: 3, channelId: 1, channelName: 'a', title: 'C', body: '', authorName: '', tags: [], likes: 0, commentCount: 0, createdAt: '2026-02-01', updatedAt: '' },
    ];
    // 不应出现 NaN：合法日期排在前，非法/空排最后
    expect(sortPosts(messy, 'newest').map((p) => p.id)).toEqual([3, 1, 2]);
  });
  it('不修改入参', () => {
    const before = posts.map((p) => p.id);
    sortPosts(posts, 'likes');
    expect(posts.map((p) => p.id)).toEqual(before);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-03-01T12:00:00Z');
  it('1 分钟内显示「刚刚」', () => {
    expect(formatRelativeTime(new Date('2026-03-01T11:59:30Z'), now)).toBe('刚刚');
  });
  it('分钟级', () => {
    expect(formatRelativeTime(new Date('2026-03-01T11:30:00Z'), now)).toBe('30 分钟前');
  });
  it('小时级', () => {
    expect(formatRelativeTime(new Date('2026-03-01T09:00:00Z'), now)).toBe('3 小时前');
  });
  it('天级', () => {
    expect(formatRelativeTime(new Date('2026-02-27T12:00:00Z'), now)).toBe('2 天前');
  });
  it('周级', () => {
    expect(formatRelativeTime(new Date('2026-02-15T12:00:00Z'), now)).toBe('2 周前');
  });
  it('超过约 5 周退化为绝对日期', () => {
    expect(formatRelativeTime(new Date('2026-01-01T12:00:00Z'), now)).toBe('1 月 1 日');
  });
  it('接受字符串与时间戳', () => {
    expect(formatRelativeTime('2026-03-01T11:00:00Z', now)).toBe('1 小时前');
    expect(formatRelativeTime(now.getTime() - 120000, now)).toBe('2 分钟前');
  });
  it('非法输入或未来时间返回空串（避免展示 Invalid Date）', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
    expect(formatRelativeTime(new Date('2026-03-02T00:00:00Z'), now)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('格式化为 YYYY-MM-DD HH:mm', () => {
    expect(formatDateTime(new Date('2026-03-01T09:05:00'))).toBe('2026-03-01 09:05');
    expect(formatDateTime('2026-12-25T23:09:00')).toBe('2026-12-25 23:09');
  });
  it('补零：个位月/日/时/分保留两位', () => {
    expect(formatDateTime(new Date('2026-01-02T03:04:00'))).toBe('2026-01-02 03:04');
  });
  it('接受时间戳', () => {
    expect(formatDateTime(new Date('2026-03-01T09:05:00').getTime())).toBe('2026-03-01 09:05');
  });
  it('非法 / 空输入回退「时间未知」，避免 Invalid Date', () => {
    expect(formatDateTime('not-a-date')).toBe('时间未知');
    expect(formatDateTime('')).toBe('时间未知');
    expect(formatDateTime(NaN)).toBe('时间未知');
  });
});

describe('formatCompactNumber', () => {
  it('< 1000 原样返回', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(42)).toBe('42');
    expect(formatCompactNumber(999)).toBe('999');
  });
  it('千分位用 k 后缀并去 .0', () => {
    expect(formatCompactNumber(1000)).toBe('1k');
    expect(formatCompactNumber(1200)).toBe('1.2k');
    expect(formatCompactNumber(1500)).toBe('1.5k');
    expect(formatCompactNumber(12340)).toBe('12.3k');
  });
  it('百万 / 十亿用 M / B 后缀', () => {
    expect(formatCompactNumber(1000000)).toBe('1M');
    expect(formatCompactNumber(2500000)).toBe('2.5M');
    expect(formatCompactNumber(1200000000)).toBe('1.2B');
  });
  it('≥ 100 的千位取整去小数', () => {
    expect(formatCompactNumber(123456)).toBe('123k');
  });
  it('负数保留符号，非有限数回退 0', () => {
    expect(formatCompactNumber(-1500)).toBe('-1.5k');
    expect(formatCompactNumber(NaN)).toBe('0');
    expect(formatCompactNumber(Infinity)).toBe('0');
  });
});

describe('parseIdParam', () => {
  it('合法数字字符串解析为 id', () => {
    expect(parseIdParam('42')).toBe(42);
    expect(parseIdParam('7')).toBe(7);
  });
  it('缺失 / 空串 / 空白 返回 null', () => {
    expect(parseIdParam(undefined)).toBeNull();
    expect(parseIdParam(null)).toBeNull();
    expect(parseIdParam('')).toBeNull();
    expect(parseIdParam('   ')).toBeNull();
  });
  it('非数字 / NaN 返回 null（避免以 NaN 发起请求）', () => {
    expect(parseIdParam('abc')).toBeNull();
    expect(parseIdParam('12.5')).toBeNull();
    expect(parseIdParam('0')).toBeNull();
    expect(parseIdParam('-3')).toBeNull();
  });
});
