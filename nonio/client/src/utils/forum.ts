import type { Comment, CommentNode, Post } from '../types';

/**
 * Non.io 论坛纯函数工具：标签解析、评论树构建、slug 生成。
 * 这些函数不依赖 React / 网络，便于单元测试。
 */

/**
 * 把路由 / 字符串参数解析为数字 id。
 * 非法、缺失、NaN、<=0 一律返回 null，避免组件以 NaN 发起错误的 API 请求
 * （此前 `Number(id)` 对坏路由参数得到 NaN，会触发无意义的失败请求）。
 */
export function parseIdParam(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw.trim() === '') return null;
  const n: number = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

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
/** 将日期安全转为时间戳：非法 / 空值回退为 0（最早），避免排序出现 NaN。 */
function safeTime(value: string | undefined): number {
  const t = +new Date(value ?? '');
  return Number.isNaN(t) ? 0 : t;
}

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
    list.sort((a, b) => safeTime(a.createdAt) - safeTime(b.createdAt));
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

/**
 * 去除 Markdown 标记，返回适合展示 / 统计的纯文本。
 *
 * 同一套正则被 `excerpt`（正文预览）与 `postReadingTime`（阅读时长估算）复用，
 * 避免两份近似的清洗逻辑逐步漂移、产生行为不一致。
 *
 * - keepSpacing=false（默认）：行内代码 / 链接 / 图片 / 加粗 / 斜体直接内联替换，
 *   结果更紧凑，用于卡片预览；
 * - keepSpacing=true：在上述标记两侧保留空格，避免相邻中英文被误判为同一「词」，
 *   用于阅读时长的分词统计。
 * 末尾统一折叠多余空白并 trim。纯函数，不修改入参。
 */
export function stripMarkdown(text: string, opts: { keepSpacing?: boolean } = {}): string {
  const keep = opts.keepSpacing === true;
  const inline = keep ? ' $1 ' : '$1';
  const emphasis = keep ? ' $2 ' : '$2';
  const image = keep ? ' ' : '';
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, inline)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, image)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, inline)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, emphasis)
    .replace(/(\*|_)(.*?)\1/g, emphasis)
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 生成帖子正文预览：复用 `stripMarkdown` 去除 Markdown 标记，折叠多余空白，
 * 并截断到 max 个字符（末尾加省略号）。
 */
export function excerpt(text: string, max = 180): string {
  const stripped = stripMarkdown(text);
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max).trimEnd() + '…';
}

/**
 * 取按点赞数或评论数排序的前 N 篇帖子（默认按点赞）。不修改入参。
 * by='comments' 时使用 commentCount 作为排序键。
 */
export function topPosts(posts: Post[], n = 3, by: 'likes' | 'comments' = 'likes'): Post[] {
  const key = (p: Post) => (by === 'comments' ? p.commentCount : p.likes);
  return [...posts].sort((a, b) => key(b) - key(a)).slice(0, n);
}

/**
 * 按频道筛选帖子：返回 channelId 与给定值匹配的帖子。
 * - channelId 为 null / 空串('') / 0 时视为「不过滤」，返回全部；
 * - 入参既可能是 number 也可能是字符串形式的频道 id（如 Select 控件的 value），
 *   统一按字符串比较，保证 '1' 与 1 等价；
 * - 不修改入参（返回新数组）。
 */
export function filterPostsByChannel(
  posts: Post[],
  channelId: number | string | null,
): Post[] {
  // null / '' / 0 视为「全部」
  const norm = channelId == null || channelId === '' || channelId === 0 ? '' : String(channelId);
  if (norm === '') return [...posts];
  return posts.filter((p) => String(p.channelId) === norm);
}

/** 帖子统计概览。 */
export interface PostsSummary {
  total: number;
  totalLikes: number;
  totalComments: number;
  channels: number;
}

/**
 * 估算帖子正文阅读时长（分钟）。
 * 先复用 `stripMarkdown`（keepSpacing=true）粗略去除 Markdown 标记，保证与
 * `excerpt` 使用同一套清洗逻辑；再分别统计：
 * - CJK 字符（中日韩统一表意文字及假名等）：按 ~300 字/分钟；
 * - 非 CJK 词语（按空白切分）：按 ~200 词/分钟。
 * 规则：空串返回 0；非空内容至少 1 分钟；结果四舍五入。
 * 不修改入参（仅基于副本计算）。
 */
export function postReadingTime(content: string): number {
  if (content == null || content.trim() === '') return 0;

  const text = stripMarkdown(content, { keepSpacing: true });

  // CJK 字符数（含中日韩表意文字与日文假名）
  const cjkMatches =
    text.match(/[぀-ヿ㐀-鿿豈-﫿]/gu) ?? [];
  const cjkCount = cjkMatches.length;

  // 其余按空白切分为「词」
  const nonCjk = text.replace(/[぀-ヿ㐀-鿿豈-﫿]/gu, ' ');
  const words = nonCjk.split(/\s+/).filter((w) => w.length > 0);

  const minutes = cjkCount / 300 + words.length / 200;
  return Math.max(1, Math.round(minutes));
}

/** 帖子排序方式。 */
export type PostSortMode = 'newest' | 'likes' | 'comments';

/**
 * 帖子排序：'newest' 按发布时间倒序，'likes' 按点赞数倒序，'comments' 按评论数倒序。
 * 非法 / 空 createdAt 视为最早，排序稳定。不修改入参（返回新数组）。
 */
export function sortPosts(posts: Post[], mode: PostSortMode = 'newest'): Post[] {
  const arr = [...posts];
  if (mode === 'likes') arr.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  else if (mode === 'comments') arr.sort((a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0));
  else arr.sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt));
  return arr;
}

/** 汇总帖子：总数、总点赞、总评论、涉及频道数（不修改入参）。 */
export function summarizePosts(posts: Post[]): PostsSummary {
  const chans = new Set<number>();
  let totalLikes = 0;
  let totalComments = 0;
  for (const p of posts) {
    if (p.channelId != null) chans.add(p.channelId);
    totalLikes += p.likes ?? 0;
    totalComments += p.commentCount ?? 0;
  }
  return { total: posts.length, totalLikes, totalComments, channels: chans.size };
}

/**
 * 将时间格式化为中文相对时间（"刚刚 / N 分钟前 / N 小时前 / N 天前 / N 周前"），
 * 超过约 5 周则退化为「M 月 D 日」。纯函数，不修改入参。
 * - `now` 可注入以便测试；默认取当前时间。
 * - 非法输入（无法解析为日期）或未来时间返回空串，避免展示 "Invalid Date" 之类无效文案。
 */
export function formatRelativeTime(input: Date | string | number, now: Date = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  const t = d.getTime();
  if (Number.isNaN(t)) return '';
  const diff = now.getTime() - t;
  if (diff < 0) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} 周前`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/**
 * 将计数压缩为易读格式（社区点赞/评论数常用）：
 * - < 1000 原样（如 42）；
 * - ≥ 1000 用 k（千分）/ M（百万）/ B（十亿）后缀，保留至多 1 位小数，去掉多余的 .0；
 * - 非有限数（NaN/Infinity）或负数回退安全值，避免渲染 NaN / -NaN。
 * 纯函数，不修改入参。
 */
export function formatCompactNumber(input: number): string {
  if (!Number.isFinite(input)) return '0';
  const sign = input < 0 ? '-' : '';
  const abs = Math.abs(input);
  if (abs < 1000) return sign + String(abs);
  const units: ReadonlyArray<readonly [number, string]> = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'k'],
  ];
  for (const [threshold, suffix] of units) {
    if (abs >= threshold) {
      const value = abs / threshold;
      const str = value >= 100 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
      return `${sign}${str}${suffix}`;
    }
  }
  return sign + String(abs);
}

/**
 * 将时间格式化为绝对日期时间「YYYY-MM-DD HH:mm」。
 * 非法 / 空输入回退「时间未知」，避免向用户渲染 "Invalid Date"。
 * 纯函数，不修改入参；用于详情页等需要精确时刻的场景。
 */
export function formatDateTime(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  const t = d.getTime();
  if (Number.isNaN(t)) return '时间未知';
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
