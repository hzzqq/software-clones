import { type Card, PRIORITY_LABELS } from '../types';

/** Case-insensitive filter across title and description. */
export function filterCardsByQuery(query: string, cards: Card[]): Card[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );
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
