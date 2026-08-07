import { type Card, type Tag, PRIORITY_LABELS } from '../types';

/** Case-insensitive filter across title and description. */
export function filterCardsByQuery(query: string, cards: Card[]): Card[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );
}

/**
 * 全字段搜索：标题、描述、指派人、子任务文本与**标签名**。
 * 相比 filterCardsByQuery 多覆盖标签/指派人/子任务——用户往往记得的是
 * 「那张挂了 #紧急 标签的卡」或「派给小王那张」，而不是确切标题。
 * tags 传空数组时退化为标题/描述/指派人/子任务搜索。不修改入参。
 */
export function searchCards(cards: Card[], query: string, tags: Tag[] = []): Card[] {
  const q: string = (query ?? '').trim().toLowerCase();
  if (!q) return cards;
  const tagNameById = new Map<number, string>();
  for (const t of tags) tagNameById.set(t.id, (t.name ?? '').toLowerCase());
  return cards.filter((c) => {
    if (c.title.toLowerCase().includes(q)) return true;
    if (c.description.toLowerCase().includes(q)) return true;
    if ((c.assignee ?? '').toLowerCase().includes(q)) return true;
    for (const id of c.tagIds ?? []) {
      if ((tagNameById.get(id) ?? '').includes(q)) return true;
    }
    for (const item of c.checklist ?? []) {
      if ((item?.text ?? '').toLowerCase().includes(q)) return true;
    }
    return false;
  });
}

/** 多标签筛选的组合方式：全部命中 / 命中任一。 */
export type TagMatchMode = 'and' | 'or';

/**
 * 多标签筛选（不修改入参）。
 * tagIds 为空时返回全部；'and' 要求卡片含全部所选标签，'or' 只需命中任一。
 * 与单标签的 filterCardsByTag 并存：后者仍服务于「点击标签快速过滤」的旧入口。
 */
export function filterCardsByTags(
  cards: Card[],
  tagIds: number[],
  mode: TagMatchMode = 'or'
): Card[] {
  if (!Array.isArray(tagIds) || tagIds.length === 0) return cards;
  return cards.filter((c) => {
    const owned = new Set(c.tagIds ?? []);
    return mode === 'and'
      ? tagIds.every((id) => owned.has(id))
      : tagIds.some((id) => owned.has(id));
  });
}

/** 到期范围筛选选项。 */
export type DueRange = 'all' | 'overdue' | 'today' | 'week' | 'none' | 'has';

/** 到期范围的中文标签，供下拉菜单直接复用，避免 UI 与逻辑各写一份。 */
export const DUE_RANGE_LABELS: Record<DueRange, string> = {
  all: '全部',
  overdue: '已逾期',
  today: '今天到期',
  week: '未来 7 天',
  has: '有截止日',
  none: '无截止日',
};

/**
 * 按到期范围筛选（不修改入参）。
 * 仅比较日历日，忽略具体时刻，与 formatDueLabel 的判定口径保持一致。
 * - all     全部
 * - overdue 截止日早于今天（含已完成，是否排除已完成交由 filterCardsByCompleted 组合）
 * - today   截止日就是今天
 * - week    今天起未来 7 个日历日内（含今天）
 * - has     任何合法截止日
 * - none    无截止日或日期非法
 * 第三个参数 now 用于测试固定参考时间。
 */
export function filterCardsByDueRange(
  cards: Card[],
  range: DueRange,
  now: Date = new Date()
): Card[] {
  if (range === 'all') return cards;
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfDay = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  return cards.filter((c) => {
    const raw = c.dueDate;
    if (raw === null || raw === '') return range === 'none';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return range === 'none';
    const diffDays = Math.round((startOfDay(parsed) - today) / msPerDay);
    switch (range) {
      case 'overdue':
        return diffDays < 0;
      case 'today':
        return diffDays === 0;
      case 'week':
        return diffDays >= 0 && diffDays <= 7;
      case 'has':
        return true;
      case 'none':
        return false;
      default:
        return true;
    }
  });
}

export type CardSort = 'position' | 'title' | 'priority' | 'dueDate' | 'updatedAt';

/**
 * 返回按指定字段排序的新数组（不修改入参）。
 * - position：按 position 升序（保持原顺序）
 * - title：按标题字典序
 * - priority：高优先级在前
 * - dueDate：升序，无截止日的排在最后
 * - updatedAt：最近更新在前
 */
export function sortCards(cards: Card[], by: CardSort = 'position'): Card[] {
  const arr = [...cards];
  arr.sort((a, b) => {
    switch (by) {
      case 'position':
        return a.position - b.position;
      case 'title':
        return a.title.localeCompare(b.title, 'zh');
      case 'priority':
        return b.priority - a.priority;
      case 'dueDate': {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate && !b.dueDate) return -1; // 有截止日的排在前
        if (!a.dueDate && b.dueDate) return 1;
        return 0; // 都无截止日，保持相对顺序
      }
      case 'updatedAt':
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
  return arr;
}

/**
 * 将任意数值夹取到合法的优先级区间 [0, maxPriority]。
 * 非法 / 越界 / NaN 的优先级一律回落到 0（最低），避免
 * PRIORITY_LABELS[p] / PRIORITY_COLOR[p] 取到 undefined 时渲染出空白标签或错误配色
 * （与 safeDueTime 对截止日、parseIdParam 对 id 的防御思路一致）。
 * 上界取自 PRIORITY_LABELS 的键，保证与类型定义同步。不修改入参。
 */
export function clampPriority(p: number): number {
  if (!Number.isFinite(p) || p < 0) return 0;
  const max = Math.max(...Object.keys(PRIORITY_LABELS).map(Number));
  return p > max ? max : p;
}

/**
 * 统计各优先级（数值）下的卡片数量，不修改入参。
 * 与 Card 组件展示时保持一致：先用 clampPriority 把越界 / NaN 的优先级
 * 回落到合法区间（0），避免 Toolbar 渲染出 "P5: 1" / "PNaN: 1" 之类的
 * 脏数据标签（此前 dueDate 的同类问题由 safeDueTime 防御，priority 由
 * clampPriority 防御展示，这里补齐统计路径）。
 */
export function countCardsByPriority(cards: Card[]): Record<number, number> {
  const map: Record<number, number> = {};
  for (const c of cards) {
    const p = clampPriority(c.priority);
    map[p] = (map[p] ?? 0) + 1;
  }
  return map;
}

/**
 * 临近到期（含已逾期）且未完成的卡片。
 * 条件：dueDate 非空、completed !== 1、且 dueDate ≤ now + withinDays 天。
 * 不修改入参。
 */
/**
 * 安全解析截止日：null / 空串 / 非法串统一视为「无截止日」返回 null，
 * 避免 new Date('').getTime() 产生的 NaN 在比较中静默误判。
 */
function safeDueTime(dueDate: string | null): number | null {
  if (dueDate === null || dueDate === '') return null;
  const t = new Date(dueDate).getTime();
  return Number.isNaN(t) ? null : t;
}

export function dueSoonCards(cards: Card[], withinDays = 3): Card[] {
  const horizon = Date.now() + withinDays * 24 * 60 * 60 * 1000;
  return cards.filter((c) => {
    const t = safeDueTime(c.dueDate);
    return c.completed !== 1 && t !== null && t <= horizon;
  });
}

/**
 * 已逾期且未完成的卡片：dueDate < now 且 completed !== 1。
 * 与 dueSoonCards 的区别：这里只统计「已经过期」的部分（不含未来窗口内的临期项）。
 */
export function overdueCards(cards: Card[]): Card[] {
  const now = Date.now();
  return cards.filter((c) => {
    const t = safeDueTime(c.dueDate);
    return c.completed !== 1 && t !== null && t < now;
  });
}

/**
 * 按优先级精确筛选（不修改入参）。
 * priority 为 null 时返回全部；否则只保留 c.priority === priority 的卡片。
 */
export function filterCardsByPriority(cards: Card[], priority: number | null): Card[] {
  if (priority === null) return cards;
  return cards.filter((c) => c.priority === priority);
}

/**
 * 按完成状态筛选（不修改入参）。
 * onlyIncomplete 为 true 时只保留未完成（completed !== 1）的卡片；
 * 为 false 时返回全部。
 */
export function filterCardsByCompleted(cards: Card[], onlyIncomplete: boolean): Card[] {
  if (!onlyIncomplete) return cards;
  return cards.filter((c) => c.completed !== 1);
}

/**
 * 按标签精确筛选（不修改入参）。
 * tagId 为 null 时返回全部；否则只保留 tagIds 含该标签的卡片。
 * 与 filterCardsByPriority / filterCardsByCompleted 形成一组正交过滤器，
 * 集中维护标签匹配语义，避免在 Board 中重复写 `c.tagIds.includes(tagId)` 内联判断。
 */
export function filterCardsByTag(cards: Card[], tagId: number | null): Card[] {
  if (tagId === null) return cards;
  return cards.filter((c) => c.tagIds.includes(tagId));
}

/** 截止日语义色调：已逾期 / 今天 / 临近 / 无。 */
export type DueTone = 'overdue' | 'today' | 'soon' | 'none';

/** 截止日标签结果：展示文本 + 语义色调。 */
export interface DueLabel {
  text: string;
  tone: DueTone;
}

/**
 * 根据截止日（ISO 字符串或 null）与「参考时间」生成人类可读标签与语义色调。
 * - null                     → 无截止 / none
 * - 日期早于今天（已过期）   → 逾期 n天 / overdue
 * - 今天（同日历日）         → 今天 / today
 * - 3 天内（含）             → n天后 / soon
 * - 其余未来                 → n天后 / none
 * 仅按日期比较（忽略当天具体时刻），不修改入参。
 * 第二个可选参数 now 用于测试时固定参考时间；缺省使用真实 Date。
 */
export function formatDueLabel(dueDate: string | null, now: Date = new Date()): DueLabel {
  if (dueDate === null) return { text: '无截止', tone: 'none' };

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return { text: '日期无效', tone: 'none' };

  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay(new Date(dueDate)).getTime() - startOfDay(now).getTime()) / msPerDay
  );

  if (diffDays < 0) return { text: `逾期 ${Math.abs(diffDays)}天`, tone: 'overdue' };
  if (diffDays === 0) return { text: '今天', tone: 'today' };
  if (diffDays <= 3) return { text: `${diffDays}天后`, tone: 'soon' };
  return { text: `${diffDays}天后`, tone: 'none' };
}

/**
 * 按标签统计卡片数量（不修改入参）。
 * 返回 tagId → 卡片数的映射；一张卡片若含多个标签会被分别计入。
 * 用于工具栏「标签计数」展示，与 countCardsByPriority 互补。
 */
export function countCardsByTag(cards: Card[]): Record<number, number> {
  const map: Record<number, number> = {};
  for (const c of cards) {
    for (const id of c.tagIds ?? []) {
      map[id] = (map[id] ?? 0) + 1;
    }
  }
  return map;
}

/**
 * 看板总体完成率（已完成卡片占比，四舍五入为整数百分比）。
 * 入参非数组/空数组返回 0；遍历中对 completed 非 1 的情况不计入已完成。
 */
export function boardCompletion(cards: Card[]): number {
  if (!Array.isArray(cards) || cards.length === 0) return 0;
  let done = 0;
  for (const c of cards) {
    if (c?.completed === 1) done++;
  }
  return Math.round((done / cards.length) * 100);
}

/**
 * 优先级 → MUI Chip 语义色。非有限/负值按 default；数值区间映射为
 * info(低) / warning(中) / error(高)，供卡片优先级标签统一着色。
 */
export type PriorityColor = 'default' | 'info' | 'warning' | 'error';
export function priorityColor(p: number): PriorityColor {
  if (!Number.isFinite(p) || p <= 0) return 'default';
  if (p === 1) return 'info';
  if (p === 2) return 'warning';
  return 'error';
}

/** 列的在制品（WIP）状态。off 表示未设上限。 */
export type WipState = 'off' | 'ok' | 'near' | 'over';

/**
 * 判定某列的 WIP 状态（纯函数，便于单测）。
 * - limit <= 0 / 非有限 → 'off'（未启用限制）
 * - count > limit       → 'over'（超限，UI 红色告警）
 * - count === limit     → 'near'（已达上限，UI 橙色提示）
 * - 其余                → 'ok'
 * 注意 count 为负或非有限时按 0 处理，避免脏数据把状态算成 over。
 */
export function wipState(count: number, limit: number): WipState {
  if (!Number.isFinite(limit) || limit <= 0) return 'off';
  const n: number = Number.isFinite(count) && count > 0 ? count : 0;
  if (n > limit) return 'over';
  if (n === limit) return 'near';
  return 'ok';
}

/** WIP 状态 → 展示文案。'off' 返回空串，调用方据此不渲染徽标。 */
export function wipLabel(count: number, limit: number): string {
  const state = wipState(count, limit);
  if (state === 'off') return '';
  const n: number = Number.isFinite(count) && count > 0 ? count : 0;
  return `${n}/${limit}`;
}

/** 组合筛选条件。所有字段都有安全默认值，缺省即「不过滤」。 */
export interface CardFilterCriteria {
  /** 关键词，跨标题/描述/指派人/子任务/标签名匹配。 */
  query?: string;
  /** 多标签筛选所选的标签 id 列表。 */
  tagIds?: number[];
  /** 多标签的组合方式。 */
  tagMode?: TagMatchMode;
  /** 精确优先级；null 表示不限。 */
  priority?: number | null;
  /** 到期范围。 */
  dueRange?: DueRange;
  /** 仅看未完成。 */
  onlyIncomplete?: boolean;
}

/**
 * 依次套用全部筛选条件，返回新数组（不修改入参）。
 * 把「过滤管线」收敛到一处，避免 Board 里散落一串嵌套调用导致顺序不一致；
 * 各子过滤器仍单独导出，便于精细复用与单测。
 * tags 用于让关键词能命中标签名；now 用于固定到期范围的参考时间。
 */
export function applyCardFilters(
  cards: Card[],
  criteria: CardFilterCriteria = {},
  tags: Tag[] = [],
  now: Date = new Date()
): Card[] {
  let out: Card[] = Array.isArray(cards) ? cards : [];
  out = filterCardsByTags(out, criteria.tagIds ?? [], criteria.tagMode ?? 'or');
  out = filterCardsByPriority(out, criteria.priority ?? null);
  out = filterCardsByDueRange(out, criteria.dueRange ?? 'all', now);
  out = filterCardsByCompleted(out, criteria.onlyIncomplete ?? false);
  out = searchCards(out, criteria.query ?? '', tags);
  return out;
}

/** 判断是否有任何激活的筛选条件，用于展示「清除筛选」入口。 */
export function hasActiveFilters(criteria: CardFilterCriteria = {}): boolean {
  if ((criteria.query ?? '').trim() !== '') return true;
  if ((criteria.tagIds ?? []).length > 0) return true;
  if (criteria.priority !== null && criteria.priority !== undefined) return true;
  if ((criteria.dueRange ?? 'all') !== 'all') return true;
  if (criteria.onlyIncomplete === true) return true;
  return false;
}
